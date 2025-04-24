const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Payment = require('./Payment');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'PENDING'
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'orders'
});

// Definir la relación con Payment
Order.hasMany(Payment, {
    foreignKey: 'order_id',
    as: 'payments'
});

Payment.belongsTo(Order, {
    foreignKey: 'order_id',
    as: 'order'
});

module.exports = Order; 