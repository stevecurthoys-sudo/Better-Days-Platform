const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

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

// ✅ TOKEN VERIFICATION MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

// ✅ Database setup with UNIQUE constraint
async function setupDatabase() {
  console.log('🔧 Setting up database...');
  let client;
  try {
    client = await pool.connect();
    
    console.log('✅ Database connected to Railway PostgreSQL');
    
    // Create tables with proper constraints
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
    
    // Create unique index for email (extra protection)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx 
      ON users (email);
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

// ✅ FIXED SIGN-IN ENDPOINT - Proper password comparison
app.post('/api/signin', async (req, res) => {
  let client;
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    client = await pool.connect();
    
    // 1. Find user by email
    const userResult = await client.query(
      'SELECT id, email, password_hash, display_name FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    const user = userResult.rows[0];

    // 2. DEBUG: Log what we're comparing
    console.log('Sign-in attempt for:', email);
    console.log('Stored hash:', user.password_hash.substring(0, 20) + '...');
    console.log('Provided password length:', password.length);

    // 3. Verify password - FIXED: Use bcrypt.compare properly
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password comparison result:', isValidPassword);
    } catch (bcryptError) {
      console.error('Bcrypt comparison error:', bcryptError);
      return res.status(500).json({ 
        success: false,
        error: 'Authentication error' 
      });
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.display_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Return user info + token
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
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  } finally {
    if (client) client.release();
  }
});

// ✅ FIXED REGISTRATION ENDPOINT - Better error handling
app.post('/api/register', async (req, res) => {
  let client;
  try {
    const { email, password, display_name } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters' 
      });
    }

    client = await pool.connect();
    
    // 1. Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }

    // 2. Hash the password - FIXED: Proper bcrypt usage
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // DEBUG: Log hash for testing
    console.log('Registration - Created hash:', passwordHash.substring(0, 20) + '...');

    // 3. Insert user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, display_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, display_name, created_at`,
      [email.toLowerCase().trim(), passwordHash, display_name || 'New User']
    );

    const newUser = result.rows[0];

    // 4. Auto-generate token for immediate login
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        name: newUser.display_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        display_name: newUser.display_name
      },
      token: token
    });
    
  } catch (error) {
    console.error('Registration error:', error.message);
    
    // Handle unique violation
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  } finally {
    if (client) client.release();
  }
});

// ✅ PROTECTED ROUTE
app.post('/api/forums', authenticateToken, async (req, res) => {
  let client;
  try {
    const { name, tier, max_members } = req.body;
    const userId = req.user.id;

    client = await pool.connect();

    const result = await client.query(
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
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  } finally {
    if (client) client.release();
  }
});

// ✅ USER PROFILE ENDPOINT
app.get('/api/me', authenticateToken, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(
      'SELECT id, email, display_name, verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({ 
      success: true,
      user: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  } finally {
    if (client) client.release();
  }
});

// ✅ DEBUG ENDPOINT - List all users (remove in production)
app.get('/api/debug/users', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      'SELECT id, email, display_name, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (client) client.release();
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
    console.log(`🔧 Debug endpoint: http://localhost:${PORT}/api/debug/users`);
  });
}
