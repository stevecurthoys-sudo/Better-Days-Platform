const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Allows your Vercel frontend to connect
app.use(cors({
  origin: 'https://better-days-platform.vercel.app'
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Better Days API is running' });
});

// 2. USER REGISTRATION ENDPOINT (This is the missing piece!)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    console.log('Registration attempt for:', email);

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // In a real app, HASH the password with bcrypt before saving!
    // For now, we'll store it directly (change this later for security)
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name',
      [email, password, display_name || 'New User']
    );
    
    res.status(201).json({
      message: 'User created successfully',
      user: newUser.rows[0]
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Forum creation endpoint (for future use)
app.post('/api/forums', async (req, res) => {
  try {
    const { name, created_by } = req.body;
    
    const newForum = await pool.query(
      `INSERT INTO forums (name, created_by) VALUES ($1, $2) RETURNING id, name, created_at`,
      [name, created_by]
    );
    
    res.status(201).json({
      message: 'Forum created successfully',
      forum: newForum.rows[0]
    });
    
  } catch (error) {
    console.error('Forum creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Better Days backend running on port ${PORT}`);
});
