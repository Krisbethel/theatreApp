// database.js
const mysql = require('mysql');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 15000, // Adjust the limit based on your application's needs
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'bnapgiijrssjt7p5khgt',
  handshakeTimeout: 20000,
});

console.log('Database pool created successfully.');

// Log connection errors
pool.on('connection', (connection) => {
  console.log('Database connected.');
  connection.on('error', (err) => {
    console.error('Database connection error:', err);
  });
});

// Promisify the pool.query function
pool.queryAsync = (sql, values) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

// Export the connection pool
module.exports = pool;