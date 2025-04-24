const express = require('express');
const router = express.Router();
const paymentController = require('../data/paymentData');
const { verifyToken } = require('../middlewares/authMiddleware');
const PaymentController = require('../controllers/controllerPayment/paymentController');

// Rutas públicas para Epayco (no requieren autenticación)
router.get('/response', (req, res) => {
    console.log('Recibida respuesta de pago:', req.query);
    // Redirigir al usuario directamente al frontend
    res.redirect('https://pet-connect-front-nu.vercel.app/home');
});

router.post('/confirmation', express.raw({type: 'application/json'}), async (req, res) => {
    try {
        console.log('=== WEBHOOK EPAYCO RECIBIDO ===');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Query:', JSON.stringify(req.query, null, 2));
        console.log('Body raw:', req.body.toString());
        
        // Parsear el body si es necesario
        let paymentInfo = Object.keys(req.body).length ? req.body : req.query;
        
        console.log('Body parseado:', JSON.stringify(paymentInfo, null, 2));

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

