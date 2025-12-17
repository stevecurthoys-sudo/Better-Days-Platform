const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const cors = reqire('cors');
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cors());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Better Days API is running' });
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user (in production, hash password with bcrypt)
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name',
      [email, password, display_name]
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

// Forum creation endpoint
app.post('/api/forums', async (req, res) => {
  try {
    const { name, tier, created_by } = req.body;
    
    const newForum = await pool.query(
      `INSERT INTO forums (name, tier, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, tier, created_at`,
      [name, tier || 1, created_by]
    );
    
    // Add creator as first member
    await pool.query(
      'INSERT INTO forum_members (forum_id, user_id) VALUES ($1, $2)',
      [newForum.rows[0].id, created_by]
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
  console.log(`Better Days backend running on port ${PORT}`);
});
