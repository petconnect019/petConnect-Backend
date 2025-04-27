const orderData = require('../../data/orderData');
const EpaycoService = require('../../services/epaycoService');
const mongoose = require('mongoose');

class OrderController {
    async createOrder(req, res, next) {
        try {
            console.log('Iniciando creación de orden con datos:', JSON.stringify(req.body, null, 2));
            
            // Validar que el usuario esté autenticado
            if (!req.user || !req.user.id) {
                const error = new Error('Usuario no autenticado');
                error.statusCode = 401;
                return next(error);
            }

            // Validar datos requeridos
            const requiredFields = ['quantity', 'customer', 'shipping'];
            const missingFields = requiredFields.filter(field => !req.body[field]);
            if (missingFields.length) {
                const error = new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
                error.statusCode = 400;
                return next(error);
            }

            // Validar datos del cliente
            const customerFields = ['name', 'email', 'phone'];
            const missingCustomerFields = customerFields.filter(field => !req.body.customer[field]);
            if (missingCustomerFields.length) {
                const error = new Error(`Campos del cliente faltantes: ${missingCustomerFields.join(', ')}`);
                error.statusCode = 400;
                return next(error);
            }

            // Validar email
            const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
            if (!emailRegex.test(req.body.customer.email)) {
                const error = new Error('Email inválido');
                error.statusCode = 400;
                return next(error);
            }

            // Validar teléfono
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(req.body.customer.phone)) {
                const error = new Error('Teléfono inválido (debe tener 10 dígitos)');
                error.statusCode = 400;
                return next(error);
            }

            // Validar cantidad
            if (req.body.quantity < 1 || req.body.quantity > 10) {
                const error = new Error('Cantidad inválida (debe estar entre 1 y 10)');
                error.statusCode = 400;
                return next(error);
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
            next(error);
        }
    }

    async confirmOrder(req, res, next) {
        try {
            const orderId = req.params.orderId;
            const { paymentData } = req.body;

            console.log(`Confirmando orden ${orderId} con datos de pago:`, JSON.stringify(paymentData, null, 2));

            // Validar que exista el token de pago
            if (!paymentData?.token) {
                const error = new Error('Token de pago es requerido');
                error.statusCode = 400;
                return next(error);
            }

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                const error = new Error('Orden no encontrada');
                error.statusCode = 404;
                return next(error);
            }

            if (order.status !== 'pending') {
                const error = new Error('La orden ya ha sido procesada');
                error.statusCode = 400;
                return next(error);
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
                const error = new Error('Error al procesar el pago');
                error.statusCode = 400;
                return next(error);
            }
        } catch (error) {
            console.error('Error al confirmar orden:', error);
            next(error);
        }
    }

    async getOrderById(req, res, next) {
        try {
            const order = await orderData.getOrderById(req.params.orderId);
            
            if (!order) {
                const error = new Error('Orden no encontrada');
                error.statusCode = 404;
                return next(error);
            }

            // Verificar que el usuario tenga acceso a la orden
            if (order.userId.toString() !== req.user.id) {
                const error = new Error('No tienes permiso para ver esta orden');
                error.statusCode = 403;
                return next(error);
            }

            console.log(`Orden ${req.params.orderId} obtenida exitosamente`);
            
            res.status(200).json({ 
                success: true, 
                order 
            });
        } catch (error) {
            console.error('Error al obtener orden:', error);
            next(error);
        }
    }

    async getUserOrders(req, res, next) {
        try {
            const orders = await orderData.getUserOrders(req.user.id);
            console.log(`Obtenidas ${orders.length} órdenes para el usuario ${req.user.id}`);
            
            res.status(200).json({ 
                success: true, 
                orders 
            });
        } catch (error) {
            console.error('Error al obtener órdenes del usuario:', error);
            next(error);
        }
    }

    /**
     * Redirige al usuario a la factura de ePayco
     */
    async downloadInvoice(req, res, next) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                const error = new Error('Orden no encontrada');
                error.statusCode = 404;
                return next(error);
            }

            // Verificar que el usuario tenga acceso a la orden
            if (order.userId.toString() !== userId) {
                const error = new Error('No tienes permiso para acceder a esta factura');
                error.statusCode = 403;
                return next(error);
            }

            // Obtener la URL de la factura de ePayco
            const invoiceUrl = await EpaycoService.getInvoiceUrl(order.epaycoTransactionId);
            
            if (!invoiceUrl) {
                const error = new Error('No se pudo obtener la factura');
                error.statusCode = 404;
                return next(error);
            }

            res.redirect(invoiceUrl);
        } catch (error) {
            console.error('Error al descargar factura:', error);
            next(error);
        }
    }
}

module.exports = new OrderController();
