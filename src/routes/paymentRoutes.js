const express = require('express');
const router = express.Router();
const paymentController = require('../data/paymentData');
const { verifyToken } = require('../middlewares/authMiddleware');
const PaymentController = require('../controllers/controllerPayment/paymentController');

// Rutas públicas para Epayco (no requieren autenticación)
router.get('/response', async (req, res) => {
    try {
        console.log('Recibida respuesta de pago:', req.query);
        const result = await paymentController.processPaymentResponse(req.query);
        
        // Redirigir al frontend con los parámetros
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${result.type}?${result.queryParams}`;
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('Error procesando respuesta de pago:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/error?message=${encodeURIComponent(error.message)}`);
    }
});

router.post('/confirmation', express.raw({type: 'application/json'}), async (req, res) => {
    try {
        console.log('=== WEBHOOK EPAYCO RECIBIDO ===');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Query:', JSON.stringify(req.query, null, 2));
        console.log('Body raw:', req.body.toString());
        
        // Parsear el body si es necesario
        let paymentInfo;
        try {
            if (Buffer.isBuffer(req.body)) {
                paymentInfo = JSON.parse(req.body.toString());
            } else if (typeof req.body === 'string') {
                paymentInfo = JSON.parse(req.body);
            } else {
                paymentInfo = req.body;
            }
            
            console.log('Body parseado:', JSON.stringify(paymentInfo, null, 2));
        } catch (parseError) {
            console.error('Error al parsear el body:', parseError);
            console.log('Body que causó el error:', req.body);
            throw new Error('Error al parsear la información del pago');
        }

        // Validar que tengamos la información necesaria
        if (!paymentInfo.x_ref_payco) {
            throw new Error('Referencia de pago (x_ref_payco) no encontrada');
        }

        if (!paymentInfo.x_transaction_id) {
            throw new Error('ID de transacción (x_transaction_id) no encontrado');
        }

        if (!paymentInfo.x_extra1) {
            throw new Error('ID de orden (x_extra1) no encontrado');
        }

        // Procesar la confirmación
        const result = await paymentController.processPaymentConfirmation(paymentInfo);
        console.log('Resultado del procesamiento:', JSON.stringify(result, null, 2));

        // Responder siempre con 200
        res.status(200).json({
            received: true,
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error procesando webhook de ePayco:', error);
        // Siempre responder con 200 aunque haya error
        res.status(200).json({
            received: true,
            success: false,
            error: error.message
        });
    }
});

// Router para rutas protegidas
const protectedRouter = express.Router();
protectedRouter.use(verifyToken);

// Crear un nuevo pago
protectedRouter.post('/', PaymentController.createPayment);

// Obtener pagos por ID de orden
protectedRouter.get('/order/:orderId', PaymentController.getPaymentByOrderId);

// Actualizar estado del pago
protectedRouter.put('/:paymentId/status', PaymentController.updatePaymentStatus);

// Agregar las rutas protegidas bajo el prefijo /api/payments
router.use('/', protectedRouter);

module.exports = router; 

