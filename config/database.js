const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('./config.json')[env];

// Create Sequelize instance
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Function to connect to the database
const connectDB = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('Database connected successfully via Sequelize');
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
  console.log('2. Verify database server is running');
  console.log('3. Ensure network connectivity to database');
  process.exit(1);
};

// For backward compatibility with code that still uses direct queries
const query = async (text, params) => {
  console.warn('Direct SQL query being used. Consider migrating to Sequelize models.');
  const start = Date.now();
  try {
    const [results] = await sequelize.query(text, {
      replacements: params,
      type: sequelize.QueryTypes.SELECT
    });
    const duration = Date.now() - start;
    console.log(`Query executed in ${duration}ms`);
    return { rows: Array.isArray(results) ? results : [results] };
  } catch (error) {
    console.error('Query failed:', {
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
  sequelize,
  connectDB,
  query,
  transaction
};