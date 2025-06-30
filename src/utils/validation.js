const mongoose = require('mongoose');
const validator = require('validator');

/**
 * Utilidades de validación para el sistema
 */

/**
 * Validar ObjectId de MongoDB
 * @param {string} id - ID a validar
 * @param {string} fieldName - Nombre del campo para error
 * @throws {Error} Si el ID no es válido
 */
const validateObjectId = (id, fieldName = 'ID') => {
  if (!id) {
    throw new Error(`${fieldName} es requerido`);
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`${fieldName} no es válido`);
  }
};

/**
 * Sanitizar input de texto
 * @param {string} input - Texto a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {string} Texto sanitizado
 */
const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') {
    return '';
  }

  const {
    trim = true,
    escape = true,
    maxLength = null,
    allowHtml = false
  } = options;

  let sanitized = input;

  // Trim espacios
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Escapar HTML si no se permite
  if (escape && !allowHtml) {
    sanitized = validator.escape(sanitized);
  }

  // Limitar longitud
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Validar email
 * @param {string} email - Email a validar
 * @returns {boolean} Si el email es válido
 */
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validar URL
 * @param {string} url - URL a validar
 * @returns {boolean} Si la URL es válida
 */
const isValidUrl = (url) => {
  return validator.isURL(url);
};

/**
 * Validar que un array no esté vacío
 * @param {Array} array - Array a validar
 * @param {string} fieldName - Nombre del campo
 * @throws {Error} Si el array está vacío o no es array
 */
const validateNonEmptyArray = (array, fieldName = 'Array') => {
  if (!Array.isArray(array)) {
    throw new Error(`${fieldName} debe ser un array`);
  }
  
  if (array.length === 0) {
    throw new Error(`${fieldName} no puede estar vacío`);
  }
};

/**
 * Validar longitud de string
 * @param {string} str - String a validar
 * @param {number} min - Longitud mínima
 * @param {number} max - Longitud máxima
 * @param {string} fieldName - Nombre del campo
 * @throws {Error} Si no cumple con la longitud
 */
const validateStringLength = (str, min, max, fieldName = 'Campo') => {
  if (typeof str !== 'string') {
    throw new Error(`${fieldName} debe ser un string`);
  }
  
  if (str.length < min) {
    throw new Error(`${fieldName} debe tener al menos ${min} caracteres`);
  }
  
  if (str.length > max) {
    throw new Error(`${fieldName} no puede exceder ${max} caracteres`);
  }
};

/**
 * Validar número dentro de un rango
 * @param {number} num - Número a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @param {string} fieldName - Nombre del campo
 * @throws {Error} Si no está en el rango
 */
const validateNumberRange = (num, min, max, fieldName = 'Número') => {
  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error(`${fieldName} debe ser un número válido`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} debe estar entre ${min} y ${max}`);
  }
};

/**
 * Validar coordenadas geográficas
 * @param {number} latitude - Latitud
 * @param {number} longitude - Longitud
 * @throws {Error} Si las coordenadas no son válidas
 */
const validateCoordinates = (latitude, longitude) => {
  validateNumberRange(latitude, -90, 90, 'Latitud');
  validateNumberRange(longitude, -180, 180, 'Longitud');
};

/**
 * Validar tipo de archivo por extensión
 * @param {string} filename - Nombre del archivo
 * @param {Array} allowedExtensions - Extensiones permitidas
 * @returns {boolean} Si el archivo es válido
 */
const isValidFileType = (filename, allowedExtensions = []) => {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  
  const extension = filename.split('.').pop().toLowerCase();
  return allowedExtensions.includes(extension);
};

/**
 * Validar tamaño de archivo
 * @param {number} fileSize - Tamaño en bytes
 * @param {number} maxSize - Tamaño máximo en bytes
 * @returns {boolean} Si el tamaño es válido
 */
const isValidFileSize = (fileSize, maxSize) => {
  return typeof fileSize === 'number' && fileSize > 0 && fileSize <= maxSize;
};

/**
 * Validar datos de mensaje
 * @param {Object} messageData - Datos del mensaje
 * @throws {Error} Si los datos no son válidos
 */
const validateMessageData = (messageData) => {
  const { content, messageType = 'text', attachments = [] } = messageData;
  
  if (!content || typeof content !== 'string') {
    throw new Error('El contenido del mensaje es requerido');
  }
  
  validateStringLength(content, 1, 2000, 'Mensaje');
  
  const validTypes = ['text', 'image', 'file', 'location', 'system'];
  if (!validTypes.includes(messageType)) {
    throw new Error('Tipo de mensaje inválido');
  }
  
  if (attachments && !Array.isArray(attachments)) {
    throw new Error('Los adjuntos deben ser un array');
  }
};

/**
 * Validar datos de chat
 * @param {Object} chatData - Datos del chat
 * @throws {Error} Si los datos no son válidos
 */
const validateChatData = (chatData) => {
  const { chatType, participants, title, description } = chatData;
  
  if (!chatType) {
    throw new Error('El tipo de chat es requerido');
  }
  
  const validTypes = ['pet_owner', 'pet_finder', 'direct', 'group'];
  if (!validTypes.includes(chatType)) {
    throw new Error('Tipo de chat inválido');
  }
  
  validateNonEmptyArray(participants, 'Participantes');
  
  if (title) {
    validateStringLength(title, 1, 100, 'Título');
  }
  
  if (description) {
    validateStringLength(description, 1, 500, 'Descripción');
  }
};

/**
 * Validar paginación
 * @param {Object} pagination - Datos de paginación
 * @returns {Object} Paginación validada
 */
const validatePagination = (pagination = {}) => {
  let { page = 1, limit = 20 } = pagination;
  
  // Convertir a números
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  
  // Validar rangos
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  
  if (isNaN(limit) || limit < 1 || limit > 100) {
    limit = 20;
  }
  
  return { page, limit };
};

/**
 * Validar query de búsqueda
 * @param {string} query - Query de búsqueda
 * @returns {string} Query sanitizado
 */
const validateSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // Sanitizar y limitar longitud
  return sanitizeInput(query, { maxLength: 100 });
};

module.exports = {
  validateObjectId,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
  validateNonEmptyArray,
  validateStringLength,
  validateNumberRange,
  validateCoordinates,
  isValidFileType,
  isValidFileSize,
  validateMessageData,
  validateChatData,
  validatePagination,
  validateSearchQuery
}; 