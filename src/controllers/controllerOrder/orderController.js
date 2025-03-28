const orderData = require('../../data/orderData');
const epaycoService = require('../../services/epaycoService');

class OrderController {
    
async createOrder(req, res) {
    try {
        const { 
            quantity, 
            shippingDetails, 
            customerName, 
            customerEmail,
            customerLastName,
            docNumber,
            ip,
            paymentMethod, // Nuevo campo
            paymentData    // Datos específicos del método de pago
        } = req.body;
        const userId = req.user.id;

        // Validaciones básicas
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        }

        if (!paymentMethod) {
            return res.status(400).json({ error: 'Se requiere método de pago' });
        }

        // Obtener IP del cliente
        const clientIp = ip || req.ip || '127.0.0.1';

        let paymentResult;
        let customerId = null;

        switch(paymentMethod) {
            case 'credit_card':
                if (!paymentData.cardInfo) {
                    return res.status(400).json({ error: 'Se requiere información de la tarjeta' });
                }
                // Crear token y cliente para tarjeta
                const tokenCard = await epaycoService.createToken(paymentData.cardInfo);
                customerId = await epaycoService.createCustomer({
                    name: customerName || req.user.name,
                    lastName: customerLastName,
                    email: customerEmail || req.user.email,
                    city: shippingDetails?.city,
                    address: shippingDetails?.address,
                    phone: shippingDetails?.phone,
                    docNumber: docNumber,
                    ip: clientIp
                }, tokenCard);
                break;

            case 'pse':
                if (!paymentData.bankCode) {
                    return res.status(400).json({ error: 'Se requiere código de banco para PSE' });
                }
                break;

            case 'cash':
                if (!paymentData.cashType) {
                    return res.status(400).json({ error: 'Se requiere tipo de pago en efectivo' });
                }
                break;

            default:
                return res.status(400).json({ error: 'Método de pago no válido' });
        }

        // Crear orden
        const result = await orderData.createOrder({
            userId,
            quantity,
            shippingDetails,
            customerName: customerName || req.user.name,
            customerEmail: customerEmail || req.user.email,
            customerLastName,
            docNumber,
            customerId,
            paymentMethod,
            ip: clientIp,
            ...paymentData
        });

        res.status(201).json({
            order: result.order,
            qrCodes: result.qrCodes,
            transaction: result.transaction
        });
    } catch (error) {
        console.error('Error al crear orden:', error);
        res.status(500).json({ 
            error: 'Error al crear orden',
            details: error.message 
        });
    }
}

    async confirmPayment(req, res) {
        try {
            if (!epaycoService.validateSignature(req.body)) {
                return res.status(400).json({ error: 'Firma inválida' });
            }

            const order = await orderData.confirmPayment(req.body);
            
            res.status(200).json({
                message: 'Pago confirmado correctamente',
                order
            });
        } catch (error) {
            console.error('Error al confirmar pago:', error);
            res.status(500).json({ 
                error: 'Error al confirmar pago',
                details: error.message 
            });
        }
    }

    async getOrderById(req, res) {
        try {
            const order = await orderData.getOrderById(req.params.orderId);
            if (!order) {
                return res.status(404).json({ error: 'Orden no encontrada' });
            }
            res.json(order);
        } catch (error) {
            res.status(500).json({ 
                error: 'Error al obtener orden',
                details: error.message 
            });
        }
    }

    async getUserOrders(req, res) {
        try {
            const orders = await orderData.getUserOrders(req.user.id);
            res.json(orders);
        } catch (error) {
            res.status(500).json({ 
                error: 'Error al obtener órdenes del usuario',
                details: error.message 
            });
        }
    }
}

module.exports = new OrderController();
