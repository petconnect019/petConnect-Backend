/**
 * Middleware centralizado para el manejo de errores en la API.
 * Captura cualquier error pasado por next(error) y envía una respuesta estándar.
 */

function errorHandlerMiddleware(err, req, res, next) {
    // Log del error con timestamp
    console.error(`[ERROR] ${new Date().toISOString()}:`, err);
    
    // Determinar el código de estado; usar error.statusCode si existe
    const statusCode = err.statusCode || 500;
    
    // Preparar la respuesta base
    const response = {
        ok: false,
        message: err.message || 'Error interno del servidor'
    };

    // Si hay una redirección especificada, incluirla en la respuesta
    if (err.redirect) {
        response.redirect = err.redirect;
    }
    
    // Enviar respuesta estandarizada
    res.status(statusCode).json(response);
}

module.exports = errorHandlerMiddleware; 