'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TimeEntry extends Model {
    static associate(models) {
      // Define associations here
      if (models.Employee) {
        TimeEntry.belongsTo(models.Employee, { foreignKey: 'employee_id' });
      }
    }
  }
  
  TimeEntry.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employee_id: {
      type: DataTypes.UUID,
      references: {
        model: 'employees',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    clock_in: {
      type: DataTypes.DATE,
      allowNull: false
    },
    clock_out: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.ENUM('clocked-in', 'clocked-out', 'break'),
      allowNull: false
    },
    total_hours: {
      type: DataTypes.DECIMAL(5, 2)
    },
    device_id: {
      type: DataTypes.STRING(100)
    },
    location: {
      type: DataTypes.STRING(255)
    },
    notes: {
      type: DataTypes.TEXT
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'TimeEntry',
    tableName: 'time_entries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return TimeEntry;
};