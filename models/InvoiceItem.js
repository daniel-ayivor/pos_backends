'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InvoiceItem extends Model {
    static associate(models) {
      // Define associations here
      if (models.Invoice) {
        InvoiceItem.belongsTo(models.Invoice, { foreignKey: 'invoice_id' });
      }
      if (models.Service) {
        InvoiceItem.belongsTo(models.Service, { foreignKey: 'service_id' });
      }
    }
  }
  
  InvoiceItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoice_id: {
      type: DataTypes.UUID,
      references: {
        model: 'invoices',
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
    modelName: 'InvoiceItem',
    tableName: 'invoice_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  
  return InvoiceItem;
};