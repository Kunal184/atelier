// Load environment variables from the .env file
require('dotenv').config();
const { Pool } = require('pg');

// Retrieve the database connection URL from environment variables
const connectionString = process.env.DATABASE_URL;

// Warn early if the connection string is missing before attempting a connection
if (!connectionString) {
  console.warn("DATABASE_URL environment variable is missing.");
}

// Create a connection pool to reuse active database connections efficiently
const pool = new Pool({
  connectionString: connectionString,
  // Enable SSL mode for cloud databases (like Neon) when required by the connection string
  ssl: connectionString && connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

// Event listener triggered when a new client connection is established in the pool
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Event listener for unexpected errors on idle pool clients
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Export a helper query method and the pool instance for use in API routes
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
