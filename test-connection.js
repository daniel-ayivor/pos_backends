require('dotenv').config();
const db = require('./models');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Test Sequelize connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    
    // Get list of all models
    console.log('\nAvailable models:');
    Object.keys(db).forEach(modelName => {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
        console.log(`- ${modelName}`);
      }
    });
    
    // Test a simple query
    try {
      const userCount = await db.User.count();
      console.log(`\nUser count: ${userCount}`);
    } catch (error) {
      console.log('\nCould not count users. The table might not exist yet.');
    }
    
    console.log('\nConnection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if your DATABASE_URL in .env is correct');
    console.log('2. Ensure your database server is running');
    console.log('3. Check if the database exists');
    console.log('4. Verify network connectivity to the database server');
    process.exit(1);
  }
}

testConnection();