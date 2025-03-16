const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');

/**
 * Ruta para manejar webhooks de Stripe
 * Esta ruta debe ser pública y accesible desde Stripe
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        // Verificar la firma del webhook
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Error de firma de webhook: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
        // Procesar el evento
        const result = await stripeService.handleWebhookEvent(event);
        res.json({ received: true, result });
    } catch (error) {
        console.error(`Error al procesar webhook: ${error.message}`);
        res.status(500).json({ received: true, error: error.message });
    }
});

module.exports = router; 