// // const { Pool } = require('pg');

// // // Enhanced database configuration for production
// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL || "postgresql://postgres:shopeEase@23@db.icrwohabyhomtpakefbs.supabase.co:5432/postgres",
// //   host: process.env.DB_HOST || 'localhost',
// //   port: process.env.DB_PORT || 5432,
// //   database: process.env.DB_NAME || 'pos_database',
// //   user: process.env.DB_USER || 'postgres',
// //   password: process.env.DB_PASSWORD,
// //   ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('supabase') ? {
// //     rejectUnauthorized: false
// //   } : false,
// //   max: 20, // Maximum number of clients in the pool
// //   idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
// //   connectionTimeoutMillis: 10000, // Increased timeout for production
// // });

// // // Enhanced connection test with better error handling
// // const connectDB = async () => {
// //   try {
// //     console.log(' Attempting database connection...');
// //     console.log(`   Environment: ${process.env.NODE_ENV}`);
// //     console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
// //     console.log(`   Database: ${process.env.DB_NAME || 'pos_database'}`);
// //     console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
// //     console.log(`   SSL: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
    
// //     const client = await pool.connect();
// //     console.log(' PostgreSQL connected successfully');
// //     client.release();
// //   } catch (error) {
// //     console.error(' PostgreSQL connection error:', error.message);
// //     console.error('Troubleshooting tips:');
// //     console.error('   1. Check if DB_HOST, DB_NAME, DB_USER, DB_PASSWORD are set');
// //     console.error('   2. Verify database credentials are correct');
// //     console.error('   3. Ensure database is accessible from deployment server');
// //     console.error('   4. Check if SSL is required for your database');
    
// //     // Don't exit immediately in production, give it a chance to retry
// //     if (process.env.NODE_ENV === 'production') {
// //       console.error('  Production mode: Will retry connection...');
// //       return false;
// //     } else {
// //       process.exit(1);
// //     }
// //   }
// // };

// // // Query helper function
// // const query = async (text, params) => {
// //   const start = Date.now();
// //   try {
// //     const res = await pool.query(text, params);
// //     const duration = Date.now() - start;
// //     if (process.env.NODE_ENV === 'development') {
// //       console.log('Executed query', { text, duration, rows: res.rowCount });
// //     }
// //     return res;
// //   } catch (error) {
// //     console.error('Query error:', error);
// //     throw error;
// //   }
// // };

// // // Get client for transactions
// // const getClient = async () => {
// //   return await pool.connect();
// // };

// // module.exports = {
// //   connectDB,
// //   query,
// //   getClient,
// //   pool
// // };

// const { Pool } = require('pg');

// // Security warning: Remove hardcoded credentials in production
// // const DEFAULT_DB_URL = "postgresql://postgres:shopeEase@23@db.icrwohabyhomtpakefbs.supabase.co:5432/postgres";

// // Main database configuration
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL || DEFAULT_DB_URL,
//   // Supabase-specific SSL configuration (always enabled for Supabase)
//   ssl: {
//     rejectUnauthorized: false
//   },
//   // Connection pool settings
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
//   // Time to wait for query execution
//   query_timeout: 10000,
//   // Time to wait for connection
//   connectionTimeoutMillis: 10000
// });

// // Enhanced connection test with retry logic
// const connectDB = async (maxRetries = 3, retryDelay = 5000) => {
//   let retries = 0;
  
//   while (retries < maxRetries) {
//     try {
//       console.log('Attempting database connection... (Attempt %d/%d)', retries + 1, maxRetries);
//       console.log('Connection details:', {
//         host: process.env.DB_HOST || 'from connection string',
//         database: process.env.DB_NAME || 'from connection string',
//         user: process.env.DB_USER || 'from connection string',
//         ssl: true // Always true for Supabase
//       });
      
//       const client = await pool.connect();
//       console.log('PostgreSQL connected successfully');
//       client.release();
//       return true;
//     } catch (error) {
//       retries++;
//       console.error('Connection attempt failed:', error.message);
      
//       if (retries < maxRetries) {
//         console.log(`Retrying in ${retryDelay/1000} seconds...`);
//         await new Promise(resolve => setTimeout(resolve, retryDelay));
//       } else {
//         console.error('Maximum connection retries reached');
//         console.error('Troubleshooting tips:');
//         console.error('1. Verify DATABASE_URL or DB_* environment variables');
//         console.error('2. Check Supabase dashboard for connection issues');
//         console.error('3. Verify network connectivity to Supabase');
//         console.error('4. Ensure SSL is properly configured');
        
//         if (process.env.NODE_ENV === 'production') {
//           console.error('Production mode: Continuing with degraded functionality');
//           return false;
//         } else {
//           process.exit(1);
//         }
//       }
//     }
//   }
// };

// // Enhanced query helper with logging and timeouts
// const query = async (text, params, timeout = 10000) => {
//   const start = Date.now();
//   const client = await pool.connect();
  
//   try {
//     await client.query(`SET statement_timeout = ${timeout}`);
//     const res = await client.query(text, params);
//     const duration = Date.now() - start;
    
//     console.log('Executed query:', {
//       query: text,
//       duration: `${duration}ms`,
//       rows: res.rowCount,
//       timeout: `${timeout}ms`
//     });
    
//     return res;
//   } catch (error) {
//     console.error('Query failed:', {
//       query: text,
//       error: error.message,
//       time: new Date().toISOString()
//     });
    
//     // Special handling for common Supabase errors
//     if (error.code === 'ETIMEDOUT') {
//       console.error('Query timeout - consider optimizing your query or increasing timeout');
//     }
    
//     throw error;
//   } finally {
//     client.release();
//   }
// };

// // Transaction helper function
// const transaction = async (callback) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     const result = await callback(client);
//     await client.query('COMMIT');
//     return result;
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Transaction rolled back:', error.message);
//     throw error;
//   } finally {
//     client.release();
//   }
// };

// module.exports = {
//   connectDB,
//   query,
//   transaction,
//   pool
// };


const { Pool } = require('pg');

// Simple database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

// Basic connection test
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    client.release();
  } catch (error) {
    console.error('Connection failed:', error.message);
    console.log('Troubleshooting:');
    console.log('1. Check DATABASE_URL in .env file');
    console.log('2. Verify Supabase project is active');
    process.exit(1);
  }
};

// Simple query helper
const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

module.exports = { connectDB, query, pool };