const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware para manejar errores de validación de express-validator
 * Centraliza el manejo de errores de validación en toda la aplicación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Formatear errores para una respuesta más limpia
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    // Log para desarrollo
    logger.warn(`Errores de validación en ${req.method} ${req.originalUrl}:`, {
      errors: formattedErrors,
      userId: req.user?.id,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      message: 'Errores de validación en los datos enviados',
      errors: formattedErrors,
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};

/**
 * Middleware para validar campos requeridos dinámicamente
 * @param {Array} requiredFields - Array de nombres de campos requeridos
 */
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      // Verificar en body, params y query
      const value = req.body[field] || req.params[field] || req.query[field];
      
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      logger.warn(`Campos requeridos faltantes en ${req.method} ${req.originalUrl}:`, {
        missingFields,
        userId: req.user?.id
      });
      
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos faltantes',
        missingFields,
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    next();
  };
};

/**
 * Middleware para sanitizar datos de entrada
 * Limpia y normaliza los datos antes de que lleguen a los controladores
 */
const sanitizeInput = (req, res, next) => {
  // Sanitizar strings en body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitizar strings en query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Función auxiliar para sanitizar objetos recursivamente
 * @param {Object} obj - Objeto a sanitizar
 * @returns {Object} Objeto sanitizado
 */
const sanitizeObject = (obj) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Trim espacios y escapar caracteres peligrosos básicos
      sanitized[key] = value.trim().replace(/[<>]/g, '');
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? item.trim().replace(/[<>]/g, '') : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Middleware para validar tipos de archivos
 * @param {Array} allowedTypes - Tipos MIME permitidos
 */
const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      logger.warn(`Tipo de archivo no permitido: ${req.file.mimetype}`, {
        userId: req.user?.id,
        filename: req.file.originalname
      });
      
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido',
        allowedTypes,
        receivedType: req.file.mimetype,
        code: 'INVALID_FILE_TYPE'
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar tamaño de archivos
 * @param {number} maxSize - Tamaño máximo en bytes
 */
const validateFileSize = (maxSize) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    if (req.file.size > maxSize) {
      logger.warn(`Archivo demasiado grande: ${req.file.size} bytes`, {
        userId: req.user?.id,
        filename: req.file.originalname,
        maxSize
      });
      
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande',
        maxSize,
        receivedSize: req.file.size,
        code: 'FILE_TOO_LARGE'
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar límites de rate limiting personalizado
 * @param {number} maxRequests - Máximo número de requests
 * @param {number} windowMs - Ventana de tiempo en milisegundos
 */
const createCustomRateLimit = (maxRequests, windowMs) => {
  const requestCounts = new Map();
  
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    
    // Limpiar entradas expiradas
    for (const [k, data] of requestCounts.entries()) {
      if (now - data.timestamp > windowMs) {
        requestCounts.delete(k);
      }
    }
    
    // Verificar límite actual
    const current = requestCounts.get(key);
    
    if (current) {
      if (current.count >= maxRequests) {
        logger.warn(`Límite de rate personalizado excedido`, {
          key,
          count: current.count,
          maxRequests
        });
        
        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes, intenta más tarde',
          retryAfter: Math.ceil((current.timestamp + windowMs - now) / 1000),
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }
      
      current.count++;
    } else {
      requestCounts.set(key, { count: 1, timestamp: now });
    }
    
    next();
  };
};

module.exports = {
  handleValidationErrors,
  validateRequiredFields,
  sanitizeInput,
  validateFileType,
  validateFileSize,
  createCustomRateLimit
}; 