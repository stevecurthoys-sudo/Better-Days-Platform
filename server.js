const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ✅ Improved setup function that runs BEFORE server starts
async function setupDatabase() {
  console.log('🔧 Setting up database...');
  let client;
  try {
    client = await pool.connect();
    
    console.log('✅ Database connected to Railway PostgreSQL');
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS forums (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tier INTEGER DEFAULT 1,
        max_members INTEGER DEFAULT 10,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('🎉 Database setup complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    // Don't exit process, but the error will be caught in startup
    return false;
  } finally {
    if (client) client.release(); // ✅ Always release the client
  }
}

// ✅ Secure registration endpoint with password hashing
app.post('/api/register', async (req, res) => {
  let client;
  try {
    const { email, password, display_name } = req.body;
    
    // ✅ CRITICAL: Hash the password before storing
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, display_name, created_at`,
      [email, passwordHash, display_name || 'New User']
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Registration error:', error.message);
    
    // Handle unique violation (duplicate email) gracefully
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check (unchanged, but now safe)
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ 
      status: 'OK', 
      database: 'Railway PostgreSQL',
      timestamp: result.rows[0].time
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Start server only AFTER database setup
async function startServer() {
  const dbReady = await setupDatabase();
  
  if (!dbReady) {
    console.error('❌ Failed to initialize database. Server not started.');
    process.exit(1);
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT} with Railway PostgreSQL`);
  });
}

startServer();
