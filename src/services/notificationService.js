const NotificationData = require('../data/notificationData');
const logger = require('../utils/logger');

class NotificationService {
  static async createNotification(data) {
    try {
      return await NotificationData.create(data);
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  static async createSecurityNotification(userId, title, message, metadata = {}) {
    return await this.createNotification({
      userId,
      type: 'security',
      title,
      message,
      metadata,
      priority: 'high',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    });
  }

  static async createPetScanNotification(userId, title, message, metadata = {}) {
    return await this.createNotification({
      userId,
      type: 'pet_scan',
      title,
      message,
      metadata,
      priority: 'medium',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
    });
  }

  static async createHealthReminder(userId, title, message, metadata = {}) {
    return await this.createNotification({
      userId,
      type: 'health',
      title,
      message,
      metadata,
      priority: 'high',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 días
    });
  }

  static async createMessageNotification(userId, title, message, metadata = {}) {
    return await this.createNotification({
      userId,
      type: 'message',
      title,
      message,
      metadata,
      priority: 'medium',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
    });
  }

  static async createSystemNotification(userId, title, message, metadata = {}) {
    return await this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      metadata,
      priority: 'low',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días
    });
  }

  static async getUserNotifications(userId, options = {}) {
    try {
      return await NotificationData.findByUserId(userId, options);
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      const notification = await NotificationData.markAsRead(notificationId, userId);
      if (!notification) {
        throw new Error('Notification not found or unauthorized');
      }
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      return await NotificationData.markAllAsRead(userId);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await NotificationData.delete(notificationId, userId);
      if (!notification) {
        throw new Error('Notification not found or unauthorized');
      }
      return notification;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      return await NotificationData.getUnreadCount(userId);
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  static async cleanupExpiredNotifications() {
    try {
      return await NotificationData.deleteExpired();
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  static async getStats(userId) {
    try {
      return await NotificationData.getStats(userId);
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

module.exports = NotificationService; 