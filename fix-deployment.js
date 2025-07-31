#!/usr/bin/env node

require('dotenv').config();

console.log('🔧 POS Backend - Deployment Issue Diagnoser');
console.log('============================================\n');

console.log('📋 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
console.log(`   PORT: ${process.env.PORT || 'Not set'}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'Not set'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'Not set'}`);
console.log(`   DB_USER: ${process.env.DB_USER || 'Not set'}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? 'Set' : 'Not set'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
console.log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'Not set'}\n`);

// Check for common issues
const issues = [];

if (!process.env.DB_HOST) {
  issues.push('❌ DB_HOST is not set');
}

if (!process.env.DB_PASSWORD) {
  issues.push('❌ DB_PASSWORD is not set');
}

if (!process.env.JWT_SECRET) {
  issues.push('❌ JWT_SECRET is not set');
}

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  issues.push('⚠️  CORS_ORIGIN not set for production');
}

if (issues.length > 0) {
  console.log('🔍 Issues Found:');
  issues.forEach(issue => console.log(`   ${issue}`));
  
  console.log('\n🔧 Quick Fix:');
  console.log('1. Set these environment variables in your deployment platform:');
  console.log('   - NODE_ENV=production');
  console.log('   - DB_HOST=your_database_host');
  console.log('   - DB_NAME=your_database_name');
  console.log('   - DB_USER=your_database_user');
  console.log('   - DB_PASSWORD=your_database_password');
  console.log('   - JWT_SECRET=your_jwt_secret');
  console.log('   - CORS_ORIGIN=https://your-frontend-domain.com');
  
  console.log('\n2. For Supabase, use:');
  console.log('   - DB_HOST=db.pbcvvvzvycoovtfbxljh.supabase.co');
  console.log('   - DB_NAME=postgres');
  console.log('   - DB_USER=postgres');
  console.log('   - DB_PASSWORD=shopeEase@23');
  
} else {
  console.log('✅ All required environment variables are set!');
  console.log('\n🔍 Next steps:');
  console.log('1. Check if your database is accessible');
  console.log('2. Verify SSL configuration if needed');
  console.log('3. Test the connection with: npm run test-connection');
}

console.log('\n📚 For more help, see DEPLOYMENT.md'); 