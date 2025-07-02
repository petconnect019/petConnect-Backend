const NotificationModel = require('../models/NotificationModel');

class NotificationData {
  static async create(notificationData) {
    const notification = new NotificationModel(notificationData);
    return await notification.save();
  }

  static async findById(id) {
    return await NotificationModel.findById(id);
  }

  static async findByUserId(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      isRead,
      type,
      startDate,
      endDate
    } = options;

    const query = { userId };

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      NotificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      NotificationModel.countDocuments(query)
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async markAsRead(notificationId, userId) {
    return await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
  }

  static async markAllAsRead(userId) {
    return await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
  }

  static async delete(notificationId, userId) {
    return await NotificationModel.findOneAndDelete({ _id: notificationId, userId });
  }

  static async deleteAllByUserId(userId) {
    return await NotificationModel.deleteMany({ userId });
  }

  static async getUnreadCount(userId) {
    return await NotificationModel.countDocuments({ userId, isRead: false });
  }

  static async deleteExpired() {
    return await NotificationModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
  }
}

module.exports = NotificationData; 