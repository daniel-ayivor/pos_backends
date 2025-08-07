'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Function to seed the database
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Create admin user if it doesn't exist
    const adminEmail = 'admin@example.com';
    const existingAdmin = await db.User.findOne({ where: { email: adminEmail } });
    
    if (!existingAdmin) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash('admin123', saltRounds);
      
      await db.User.create({
        id: uuidv4(),
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'administrator',
        permissions: [
          'user:read', 'user:write', 'user:delete',
          'employee:read', 'employee:write', 'employee:delete',
          'client:read', 'client:write', 'client:delete',
          'service:read', 'service:write', 'service:delete',
          'project:read', 'project:write', 'project:delete',
          'invoice:read', 'invoice:write', 'invoice:delete',
          'transaction:read', 'transaction:write',
          'analytics:read', 'settings:read', 'settings:write'
        ],
        is_active: true
      });
      
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    // Create sample services if they don't exist
    const sampleServices = [
      { name: 'Logo Design', description: 'Professional logo design service', category: 'Design', price: 500.00, unit: 'project' },
      { name: 'Web Development', description: 'Custom website development', category: 'Development', price: 100.00, unit: 'hour' },
      { name: 'Social Media Management', description: 'Managing social media accounts', category: 'Marketing', price: 50.00, unit: 'hour' },
      { name: 'Print Design', description: 'Design for print materials', category: 'Design', price: 75.00, unit: 'hour' },
      { name: 'SEO Optimization', description: 'Search engine optimization services', category: 'Marketing', price: 85.00, unit: 'hour' }
    ];
    
    for (const service of sampleServices) {
      const existingService = await db.Service.findOne({ where: { name: service.name } });
      
      if (!existingService) {
        await db.Service.create({
          id: uuidv4(),
          ...service
        });
        console.log(`Service '${service.name}' created successfully`);
      } else {
        console.log(`Service '${service.name}' already exists`);
      }
    }
    
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();