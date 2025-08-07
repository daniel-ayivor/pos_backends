'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Project extends Model {
    static associate(models) {
      // Define associations here
      if (models.Client) {
        Project.belongsTo(models.Client, { foreignKey: 'client_id' });
      }
      if (models.Service) {
        Project.belongsTo(models.Service, { foreignKey: 'service_id' });
      }
      if (models.Employee) {
        // This is a simplification - in reality, this would be a many-to-many relationship
        // through a join table since assigned_to is an array of UUIDs
        Project.belongsToMany(models.Employee, { through: 'project_employees', foreignKey: 'project_id' });
      }
    }
  }
  
  Project.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    client_id: {
      type: DataTypes.UUID,
      references: {
        model: 'clients',
        key: 'id'
      }
    },
    service_id: {
      type: DataTypes.UUID,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    assigned_to: {
      type: DataTypes.UUID,
      references: {
        model: 'employees',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('brief-received', 'in-progress', 'review', 'revision', 'completed', 'delivered'),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
    modelName: 'Project',
    tableName: 'projects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return Project;
};