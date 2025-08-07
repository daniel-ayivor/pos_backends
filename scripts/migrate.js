'use strict';
const { Sequelize, DataTypes } = require('sequelize');
const db = require('../models');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Function to run migrations
async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Sync all models with the database
    // For production, you might want to use migrations instead of sync
    // In development, you can use { force: true } to recreate tables
    const syncOptions = process.env.NODE_ENV === 'production' 
      ? { alter: true } 
      : { alter: true };
    
    await db.sequelize.sync(syncOptions);
    
    console.log('Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
if (require.main === module) {
  runMigrations();
}

// Keep the original migration code for reference
const originalMigrations = {
  up: async (queryInterface, Sequelize) => {
    // Users
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('administrator', 'supervisor', 'cashier', 'staff'), allowNull: false },
      permissions: { type: Sequelize.ARRAY(Sequelize.TEXT), defaultValue: [] },
      avatar: Sequelize.STRING(500),
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      last_login: Sequelize.DATE
    });

    // Employees
    await queryInterface.createTable('employees', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      phone: Sequelize.STRING(20),
      role: { type: Sequelize.ENUM('designer', 'developer', 'marketer', 'manager', 'assistant'), allowNull: false },
      department: Sequelize.STRING(50),
      salary: Sequelize.DECIMAL(10,2),
      hire_date: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Clients
    await queryInterface.createTable('clients', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false },
      phone: Sequelize.STRING(20),
      company: Sequelize.STRING(100),
      address: Sequelize.TEXT,
      notes: Sequelize.TEXT,
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Services
    await queryInterface.createTable('services', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: Sequelize.TEXT,
      price: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      category: { type: Sequelize.STRING(50), allowNull: false },
      duration_hours: Sequelize.INTEGER,
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Projects
    await queryInterface.createTable('projects', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      client_id: { type: Sequelize.UUID, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      service_id: { type: Sequelize.UUID, references: { model: 'services', key: 'id' }, onDelete: 'SET NULL' },
      assigned_to: { type: Sequelize.ARRAY(Sequelize.UUID), defaultValue: [] },
      status: { type: Sequelize.ENUM('brief-received', 'in-progress', 'review', 'revision', 'completed', 'delivered'), allowNull: false },
      priority: { type: Sequelize.ENUM('low', 'medium', 'high'), allowNull: false },
      progress: { type: Sequelize.INTEGER, defaultValue: 0 },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      value: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      notes: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Invoices
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      invoice_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      client_id: { type: Sequelize.UUID, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      tax_amount: { type: Sequelize.DECIMAL(10,2), defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      status: { type: Sequelize.ENUM('draft', 'pending', 'paid', 'overdue'), allowNull: false },
      issue_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      paid_date: Sequelize.DATEONLY,
      notes: Sequelize.TEXT,
      created_by: { type: Sequelize.UUID, references: { model: 'users', key: 'id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Invoice Items
    await queryInterface.createTable('invoice_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      invoice_id: { type: Sequelize.UUID, references: { model: 'invoices', key: 'id' }, onDelete: 'CASCADE' },
      service_id: { type: Sequelize.UUID, references: { model: 'services', key: 'id' }, onDelete: 'SET NULL' },
      description: { type: Sequelize.STRING(255), allowNull: false },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      unit_price: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      total_price: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Transactions
    await queryInterface.createTable('transactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      transaction_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      client_id: { type: Sequelize.UUID, references: { model: 'clients', key: 'id' }, onDelete: 'SET NULL' },
      amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      tax_amount: { type: Sequelize.DECIMAL(10,2), defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      payment_method: { type: Sequelize.ENUM('cash', 'card', 'mobile_money', 'bank_transfer'), allowNull: false },
      payment_status: { type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'), allowNull: false, defaultValue: 'completed' },
      notes: Sequelize.TEXT,
      created_by: { type: Sequelize.UUID, references: { model: 'users', key: 'id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Transaction Items
    await queryInterface.createTable('transaction_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      transaction_id: { type: Sequelize.UUID, references: { model: 'transactions', key: 'id' }, onDelete: 'CASCADE' },
      service_id: { type: Sequelize.UUID, references: { model: 'services', key: 'id' }, onDelete: 'SET NULL' },
      description: { type: Sequelize.STRING(255), allowNull: false },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      unit_price: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      total_price: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Time Entries
    await queryInterface.createTable('time_entries', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      employee_id: { type: Sequelize.UUID, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
      clock_in: { type: Sequelize.DATE, allowNull: false },
      clock_out: Sequelize.DATE,
      status: { type: Sequelize.ENUM('clocked-in', 'clocked-out', 'break'), allowNull: false },
      total_hours: Sequelize.DECIMAL(5,2),
      device_id: Sequelize.STRING(100),
      location: Sequelize.STRING(255),
      notes: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // System Settings
    await queryInterface.createTable('system_settings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      setting_key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      setting_value: Sequelize.TEXT,
      description: Sequelize.TEXT,
      updated_by: { type: Sequelize.UUID, references: { model: 'users', key: 'id' } },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });

    // Analytics
    await queryInterface.createTable('analytics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      metric: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      value: {
        type: Sequelize.DECIMAL(20, 4),
        allowNull: false
      },
      period: {
        type: Sequelize.STRING(50), // e.g. 'daily', 'monthly', 'yearly'
        allowNull: false
      },
      recorded_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      },
      notes: Sequelize.TEXT,
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order to avoid FK constraint errors
    await queryInterface.dropTable('analytics');
    await queryInterface.dropTable('system_settings');
    await queryInterface.dropTable('time_entries');
    await queryInterface.dropTable('transaction_items');
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('invoice_items');
    await queryInterface.dropTable('invoices');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('services');
    await queryInterface.dropTable('clients');
    await queryInterface.dropTable('employees');
    await queryInterface.dropTable('users');
  }
};