const { Pool } = require('pg');
// dotenv should be loaded only once at the entry point (index.js)

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'aerosense',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.connect()
  .then(() => {
    console.log('Database connection established successfully');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = pool; 