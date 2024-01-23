// database.js
const mysql = require('mysql');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 3600000, // Adjust the limit based on your application's needs
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'theatredb',
});

console.log('Database pool created successfully.');

// Promisify the pool.query function
pool.queryAsync = (sql, values) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};

// Export the connection pool
module.exports = pool;