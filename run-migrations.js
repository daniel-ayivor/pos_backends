'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const db = require('./models');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Sync all models with the database
    const syncOptions = { alter: true };
    
    await db.sequelize.sync(syncOptions);
    
    console.log('Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();