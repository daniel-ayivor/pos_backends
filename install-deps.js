const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 POS Backend - Installing Dependencies');
console.log('==========================================\n');

try {
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!\n');
  } else {
    console.log('✅ Dependencies already installed.\n');
  }

  // Test database connection
  console.log('🔍 Testing database connection...');
  execSync('node test-connection.js', { stdio: 'inherit' });
  
  console.log('\n🎉 Setup complete! You can now run:');
  console.log('   npm run dev    # Start development server');
  console.log('   npm start      # Start production server');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
} 