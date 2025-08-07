'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      // Define associations here
      if (models.Client) {
        Transaction.belongsTo(models.Client, { foreignKey: 'client_id' });
      }
      if (models.User) {
        Transaction.belongsTo(models.User, { foreignKey: 'created_by' });
      }
      if (models.TransactionItem) {
        Transaction.hasMany(models.TransactionItem, { foreignKey: 'transaction_id' });
      }
    }
  }
  
  Transaction.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    transaction_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    client_id: {
      type: DataTypes.UUID,
      references: {
        model: 'clients',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'card', 'mobile_money', 'bank_transfer'),
      allowNull: false
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'completed'
    },
    notes: {
      type: DataTypes.TEXT
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  
  return Transaction;
};