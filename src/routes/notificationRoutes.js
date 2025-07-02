const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/controllerNotification/notificationController');
const { check } = require('express-validator');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// Obtener notificaciones del usuario con filtros y paginación
router.get('/', [
  check('page').optional().isInt({ min: 1 }).toInt(),
  check('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  check('isRead').optional().isBoolean(),
  check('type').optional().isIn(['security', 'system', 'pet_scan', 'message', 'health', 'reminder']),
  check('startDate').optional().isISO8601(),
  check('endDate').optional().isISO8601()
], NotificationController.getNotifications);

// Obtener conteo de notificaciones no leídas
router.get('/unread/count', NotificationController.getUnreadCount);

// Marcar una notificación como leída
router.put('/:notificationId/read', [
  check('notificationId').isMongoId()
], NotificationController.markAsRead);

// Marcar todas las notificaciones como leídas
router.put('/read/all', NotificationController.markAllAsRead);

// Eliminar una notificación
router.delete('/:notificationId', [
  check('notificationId').isMongoId()
], NotificationController.deleteNotification);

// Ruta administrativa para limpiar notificaciones expiradas
router.post('/cleanup', NotificationController.cleanupExpiredNotifications);

module.exports = router; 