const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect()
  .then(client => {
    console.log('Successfully connected to PostgreSQL database!');
    client.release(); // Release the client immediately after successful connection test
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL database:', err);
  });

module.exports = pool;