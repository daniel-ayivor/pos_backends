require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing Supabase Database Connection...\n');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

async function testConnection() {
  try {
    console.log('📋 Connection Details:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : 'Not set'}\n`);

    const client = await pool.connect();
    console.log('✅ Successfully connected to Supabase database!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('📊 Database Info:');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].db_version.split(' ')[0]}`);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Database connection test successful!');
    console.log('Your Supabase database is ready to use.');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check if your Supabase database is running');
    console.error('   2. Verify the connection credentials in .env file');
    console.error('   3. Ensure your IP is whitelisted in Supabase');
    console.error('   4. Check if the database password is correct');
    
    process.exit(1);
  }
}

testConnection(); 