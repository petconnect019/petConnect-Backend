/**
 * Determina el código de estado HTTP basado en el tipo de error
 * @param {Error} error - El error capturado
 * @returns {number} Código de estado HTTP
 */
const determineStatusCode = (error) => {
    if (error.message && (
        error.message.includes('no encontrado') || 
        error.message.includes('No encontrado') ||
        error.message.includes('not found')
    )) {
        return 404;
    } else if (error.message && (
        error.message.includes('permiso') || 
        error.message.includes('autorizado') ||
        error.message.includes('unauthorized')
    )) {
        return 403;
    } else if (error.message && (
        error.message.includes('requerido') || 
        error.message.includes('inválido') || 
        error.message.includes('ya existe') ||
        error.message.includes('invalid')
    )) {
        return 400;
    } else {
        return 500;
    }
};

/**
 * Manejador de errores HTTP para respuestas de API
 * @param {Object} res - Objeto de respuesta Express
 * @param {Error} error - Error a manejar
 */
const httpErrorHandler = (res, error) => {
    const statusCode = determineStatusCode(error);
    
    console.error(`Error (${statusCode}):`, error.message);
    
    return res.status(statusCode).json({
        success: false,
        status: "error",
        message: error.message || 'Error interno del servidor',
        error: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
};

module.exports = {
    httpErrorHandler,
    determineStatusCode
}; 