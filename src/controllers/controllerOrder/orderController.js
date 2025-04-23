const orderData = require('../../data/orderData');
const EpaycoService = require('../../services/epaycoService');
const mongoose = require('mongoose');

class OrderController {
    async createOrder(req, res) {
        try {
            console.log('Iniciando creación de orden con datos:', JSON.stringify(req.body, null, 2));
            
            // Validar que el usuario esté autenticado
            if (!req.user || !req.user.id) {
                throw new Error('Usuario no autenticado');
            }
            console.log('Valor de req.user.id:', req.user.id);

            // Validar datos requeridos
            const requiredFields = ['quantity', 'customer', 'shipping'];
            const missingFields = requiredFields.filter(field => !req.body[field]);
            if (missingFields.length) {
                throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
            }

            // Validar datos del cliente
            const customerFields = ['name', 'email', 'phone'];
            const missingCustomerFields = customerFields.filter(field => !req.body.customer[field]);
            if (missingCustomerFields.length) {
                throw new Error(`Campos del cliente faltantes: ${missingCustomerFields.join(', ')}`);
            }

            // Validar email
            const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
            if (!emailRegex.test(req.body.customer.email)) {
                throw new Error('Email inválido');
            }

            // Validar teléfono
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(req.body.customer.phone)) {
                throw new Error('Teléfono inválido (debe tener 10 dígitos)');
            }

            // Validar cantidad
            if (req.body.quantity < 1 || req.body.quantity > 10) {
                throw new Error('Cantidad inválida (debe estar entre 1 y 10)');
            }

            // Calcular el monto total
            const unitPrice = 15000; // Precio unitario en COP
            const totalAmount = req.body.quantity * unitPrice;

            // Reestructurar los datos según el modelo
            const userId = (req.user._id || req.user.id).toString();
            const orderInfo = {
                userId: userId,
                quantity: req.body.quantity,
                totalAmount: totalAmount,
                status: 'pending',
                paymentStatus: 'PENDING',
                customerName: req.body.customer.name,
                customerEmail: req.body.customer.email,
                customerPhone: req.body.customer.phone,
                shippingDetails: {
                    address: req.body.shipping.address,
                    city: req.body.shipping.city,
                    state: req.body.shipping.state,
                    country: req.body.shipping.country,
                    postalCode: req.body.shipping.postalCode
                }
            };
            
            // Crear la orden
            const order = await orderData.createOrder(orderInfo);
            
            console.log('Orden creada exitosamente:', order._id);
            
            res.status(201).json({
                success: true,
                order
            });
        } catch (error) {
            console.error('Error al crear orden:', error);
            res.status(error.message.includes('requerido') || error.message.includes('inválido') ? 400 : 500).json({
                success: false,
                error: error.message
            });
        }
    }

    async confirmOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            const { paymentData } = req.body;

            console.log(`Confirmando orden ${orderId} con datos de pago:`, JSON.stringify(paymentData, null, 2));

            // Validar que exista el token de pago
            if (!paymentData?.token) {
                throw new Error('Token de pago es requerido');
            }

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            if (order.status !== 'pending') {
                throw new Error('La orden ya ha sido procesada');
            }

            // Preparar datos para ePayco
            const paymentInfo = {
                ...order,
                paymentData,
                ip: req.ip
            };

            // Procesar el pago con ePayco
            const payment = await EpaycoService.createPayment(paymentInfo);

            // Si el pago es exitoso, actualizar la orden y generar códigos QR
            if (payment.success) {
                const result = await orderData.confirmOrder(orderId);
                
                console.log(`Orden ${orderId} confirmada exitosamente`);
                
                res.status(200).json({
                    success: true,
                    order: result.order,
                    payment,
                    qrCodes: result.qrCodes
                });
            } else {
                throw new Error('Error al procesar el pago');
            }
        } catch (error) {
            console.error('Error al confirmar orden:', error);
            res.status(error.message.includes('no encontrada') ? 404 : 500).json({
                success: false,
                error: error.message
            });
        }
    }

    async getOrderById(req, res) {
        try {
            const order = await orderData.getOrderById(req.params.orderId);
            
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            // Verificar que el usuario tenga acceso a la orden
            if (order.userId.toString() !== req.user.id) {
                throw new Error('No tienes permiso para ver esta orden');
            }

            console.log(`Orden ${req.params.orderId} obtenida exitosamente`);
            
            res.status(200).json({ 
                success: true, 
                order 
            });
        } catch (error) {
            console.error('Error al obtener orden:', error);
            res.status(error.message.includes('no encontrada') ? 404 : 500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    async getUserOrders(req, res) {
        try {
            const orders = await orderData.getUserOrders(req.user.id);
            console.log(`Obtenidas ${orders.length} órdenes para el usuario ${req.user.id}`);
            
            res.status(200).json({ 
                success: true, 
                orders 
            });
        } catch (error) {
            console.error('Error al obtener órdenes del usuario:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    /**
     * Redirige al usuario a la factura de ePayco
     */
    async downloadInvoice(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            // Verificar que el usuario tenga acceso a la orden
            if (order.userId.toString() !== userId) {
                throw new Error('No tienes permiso para ver esta factura');
            }

            // Verificar que la orden esté completada
            if (order.status !== 'completed' || order.paymentStatus !== 'COMPLETED') {
                throw new Error('La orden debe estar completada y pagada para ver la factura');
            }

            // Verificar que exista la referencia de ePayco
            if (!order.epaycoRef) {
                throw new Error('No se encontró la referencia de pago');
            }

           

        } catch (error) {
            console.error('Error al redirigir a la factura:', error);
            const statusCode = error.message.includes('no encontrada') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new OrderController();
