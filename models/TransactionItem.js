'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TransactionItem extends Model {
    static associate(models) {
      // Define associations here
      if (models.Transaction) {
        TransactionItem.belongsTo(models.Transaction, { foreignKey: 'transaction_id' });
      }
      if (models.Service) {
        TransactionItem.belongsTo(models.Service, { foreignKey: 'service_id' });
      }
    }
  }
  
  TransactionItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    transaction_id: {
      type: DataTypes.UUID,
      references: {
        model: 'transactions',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    service_id: {
      type: DataTypes.UUID,
      references: {
        model: 'services',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'TransactionItem',
    tableName: 'transaction_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  
  return TransactionItem;
};