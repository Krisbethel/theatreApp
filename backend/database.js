// database.js
const mysql = require('mysql');
require('dotenv').config();


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: '',
  database: process.env.DB_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    console.error('Error details:', err);
    throw err;
  }
  console.log('Connected to the database');
});

module.exports = db;
