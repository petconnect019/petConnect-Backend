const rateLimit = require('express-rate-limit');

// Configuración del rate limiter para limitar a 10 solicitudes por segundo
const limiter = rateLimit({
    windowMs: 1000, // 1 segundo
    max: 10, // Límite de 10 solicitudes por ventana de tiempo
    message: {
        ok: false,
        message: 'Demasiadas solicitudes, por favor intente más tarde'
    },
    standardHeaders: true, // Devuelve los headers `RateLimit-*` para mostrar el límite
    legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});

module.exports = limiter; 