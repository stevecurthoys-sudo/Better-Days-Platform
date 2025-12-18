const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // ✅ JWT for tokens

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Validate environment variable early
if (!process.env.DATABASE_PUBLIC_URL) {
  console.error('❌ DATABASE_PUBLIC_URL not set in environment');
  process.exit(1);
}

// Database pool - configured for Railway's public URL
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ✅ TOKEN VERIFICATION MIDDLEWARE (NEW)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

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
    return false;
  } finally {
    if (client) client.release();
  }
}

// ✅ 1. SIGN-IN ENDPOINT (NEW - for existing users)
app.post('/api/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const userResult = await pool.query(
      'SELECT id, email, password_hash, display_name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // 2. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Generate JWT token (valid for 7 days)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.display_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Return user info + token
    res.json({
      success: true,
      message: 'Sign-in successful',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name
      },
      token: token
    });

  } catch (error) {
    console.error('Sign-in error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Secure registration endpoint with password hashing
app.post('/api/register', async (req, res) => {
  let client;
  try {
    const { email, password, display_name } = req.body;
    
    // Hash the password before storing
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

// ✅ 2. EXAMPLE PROTECTED ROUTE (NEW - requires authentication)
app.post('/api/forums', authenticateToken, async (req, res) => {
  try {
    const { name, tier, max_members } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO forums (name, tier, max_members, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, tier, max_members, created_at`,
      [name, tier || 1, max_members || 10, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Forum created successfully',
      forum: result.rows[0]
    });
  } catch (error) {
    console.error('Forum creation error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ 3. USER PROFILE ENDPOINT (NEW - requires authentication)
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
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
