const NotificationService = require('../../services/notificationService');
const { validationResult } = require('express-validator');

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page, limit, includeRead, type, startDate, endDate } = req.query;
      const userId = req.user.id;

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        isRead: includeRead === undefined ? undefined : includeRead !== 'true',
        type,
        startDate,
        endDate
      };

      const result = await NotificationService.getUserNotifications(userId, options);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener notificaciones', error: error.message });
    }
  }

  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await NotificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener conteo de notificaciones no leídas', error: error.message });
    }
  }

  static async markAsRead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await NotificationService.markAsRead(notificationId, userId);
      res.json(notification);
    } catch (error) {
      if (error.message === 'Notification not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Error al marcar notificación como leída', error: error.message });
      }
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      await NotificationService.markAllAsRead(userId);
      res.json({ message: 'Todas las notificaciones han sido marcadas como leídas' });
    } catch (error) {
      res.status(500).json({ message: 'Error al marcar todas las notificaciones como leídas', error: error.message });
    }
  }

  static async deleteNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { notificationId } = req.params;
      const userId = req.user.id;

      await NotificationService.deleteNotification(notificationId, userId);
      res.json({ message: 'Notificación eliminada exitosamente' });
    } catch (error) {
      if (error.message === 'Notification not found or unauthorized') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Error al eliminar notificación', error: error.message });
      }
    }
  }

  // Endpoint administrativo para limpiar notificaciones expiradas
  static async cleanupExpiredNotifications(req, res) {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Acceso no autorizado' });
      }

      const result = await NotificationService.cleanupExpiredNotifications();
      res.json({ message: 'Limpieza de notificaciones completada', result });
    } catch (error) {
      res.status(500).json({ message: 'Error al limpiar notificaciones expiradas', error: error.message });
    }
  }
}

module.exports = NotificationController; 