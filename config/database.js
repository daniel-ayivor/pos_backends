const { Pool } = require('pg');

// Enhanced database configuration for production
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pos_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('supabase') ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout for production
});

// Enhanced connection test with better error handling
const connectDB = async () => {
  try {
    console.log(' Attempting database connection...');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'pos_database'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   SSL: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
    
    const client = await pool.connect();
    console.log(' PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error(' PostgreSQL connection error:', error.message);
    console.error('Troubleshooting tips:');
    console.error('   1. Check if DB_HOST, DB_NAME, DB_USER, DB_PASSWORD are set');
    console.error('   2. Verify database credentials are correct');
    console.error('   3. Ensure database is accessible from deployment server');
    console.error('   4. Check if SSL is required for your database');
    
    // Don't exit immediately in production, give it a chance to retry
    if (process.env.NODE_ENV === 'production') {
      console.error('  Production mode: Will retry connection...');
      return false;
    } else {
      process.exit(1);
    }
  }
};

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Get client for transactions
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  connectDB,
  query,
  getClient,
  pool
}; 