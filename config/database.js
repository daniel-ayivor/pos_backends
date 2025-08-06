const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false // Required for Supabase
  },
  max: 10,
  idleTimeoutMillis: 30000
});

// Function to connect to the database
const connectDB = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('Database connected successfully');
      client.release();
      return true;
    } catch (error) {
      console.error(` Connection attempt ${i + 1}/${retries} failed:`);
      console.error(error.message);
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.error(' All connection attempts failed');
  console.log('Troubleshooting:');
  console.log('1. Check DATABASE_URL in .env file');
  console.log('2. Verify Supabase project is active (not paused)');
  console.log('3. Ensure network connectivity to Supabase');
  process.exit(1);
};

// Enhanced query helper with timing
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`⚡ Query executed in ${duration}ms`);
    return result;
  } catch (error) {
    console.error('💥 Query failed:', {
      query: text,
      params: params,
      error: error.message
    });
    throw error;
  }
};

// Basic transaction helper
const transaction = async (queries) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const q of queries) {
      results.push(await client.query(q.text, q.values));
    }
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  connectDB,
  query,
  transaction,
  pool
};