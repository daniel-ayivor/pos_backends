#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 POS Backend - Supabase Setup');
console.log('================================\n');

// Supabase configuration
const supabaseConfig = {
  PORT: '5000',
  NODE_ENV: 'development',
  DB_HOST: 'db.pbcvvvzvycoovtfbxljh.supabase.co',
  DB_PORT: '5432',
  DB_NAME: 'postgres',
  DB_USER: 'postgres',
  DB_PASSWORD: 'shopeEase@23',
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  JWT_EXPIRES_IN: '24h',
  CORS_ORIGIN: 'https://pos-service-alpha.vercel.app',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  MAX_FILE_SIZE: '5242880',
  UPLOAD_PATH: './uploads',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: 'your_email@gmail.com',
  SMTP_PASS: 'your_app_password'
};

// Create .env content
const envContent = `# Server Configuration
PORT=${supabaseConfig.PORT}
NODE_ENV=${supabaseConfig.NODE_ENV}

# Database Configuration (Supabase)
DB_HOST=${supabaseConfig.DB_HOST}
DB_PORT=${supabaseConfig.DB_PORT}
DB_NAME=${supabaseConfig.DB_NAME}
DB_USER=${supabaseConfig.DB_USER}
DB_PASSWORD=${supabaseConfig.DB_PASSWORD}

# JWT Configuration
JWT_SECRET=${supabaseConfig.JWT_SECRET}
JWT_EXPIRES_IN=${supabaseConfig.JWT_EXPIRES_IN}

# CORS Configuration
CORS_ORIGIN=${supabaseConfig.CORS_ORIGIN}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=${supabaseConfig.RATE_LIMIT_WINDOW_MS}
RATE_LIMIT_MAX_REQUESTS=${supabaseConfig.RATE_LIMIT_MAX_REQUESTS}

# File Upload
MAX_FILE_SIZE=${supabaseConfig.MAX_FILE_SIZE}
UPLOAD_PATH=${supabaseConfig.UPLOAD_PATH}

# Email Configuration (optional)
SMTP_HOST=${supabaseConfig.SMTP_HOST}
SMTP_PORT=${supabaseConfig.SMTP_PORT}
SMTP_USER=${supabaseConfig.SMTP_USER}
SMTP_PASS=${supabaseConfig.SMTP_PASS}
`;

// Write .env file
const envPath = path.join(__dirname, '.env');
fs.writeFileSync(envPath, envContent);

console.log('✅ .env file created with Supabase configuration!');
console.log('\n📋 Database Details:');
console.log(`   Host: ${supabaseConfig.DB_HOST}`);
console.log(`   Database: ${supabaseConfig.DB_NAME}`);
console.log(`   User: ${supabaseConfig.DB_USER}`);
console.log(`   Port: ${supabaseConfig.DB_PORT}`);
console.log('\n📋 Next steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Run migrations: npm run migrate');
console.log('3. Start the server: npm run dev');
console.log(`\n🔗 Health check: http://localhost:${supabaseConfig.PORT}/health`);
console.log('\n⚠️  Note: Make sure your Supabase database is accessible and the credentials are correct.'); 