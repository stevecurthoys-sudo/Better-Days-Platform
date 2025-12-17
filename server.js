const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// MIDDLEWARE
// ======================
app.use(cors({
  origin: ['https://better-days-platform.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// ======================
// DATABASE CONNECTION
// ======================
console.log('=== STARTUP DEBUG ===');
console.log('DATABASE_URL exists?', !!process.env.DATABASE_URL);
console.log('DATABASE_URL host:', process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.split('@')[1]?.split(':')[0] : 'UNDEFINED');
console.log('=====================');

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// ======================
// HEALTH CHECK
// ======================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Better Days API is running',
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// ======================
// USER REGISTRATION
// ======================
app.post('/api/register', async (req, res) => {
  console.log('🔔 /api/register called');
  console.log('Request body:', req.body);
  
  try {
    const { email, password, display_name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`Attempting to register: ${email}`);
    
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length > 0) {
      console.log(`User ${email} already exists`);
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user (NOTE: In production, hash password with bcrypt!)
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, display_name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, display_name, created_at',
      [email, password, display_name || 'New User']
    );
    
    console.log(`✅ User created: ${email} (ID: ${newUser.rows[0].id})`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    console.error('Error stack:', error.stack);
    
    // Specific error handling
    if (error.code === '42P01') { // Table doesn't exist
      res.status(500).json({ 
        error: 'Database table missing. Run schema.sql in Supabase.',
        details: error.message 
      });
    } else if (error.code === '28P01') { // Authentication failed
      res.status(500).json({ 
        error: 'Database authentication failed. Check DATABASE_URL.',
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// ======================
// TEST ENDPOINT
// ======================
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      success: true,
      message: 'Database connection test successful',
      time: result.rows[0].current_time,
      tables: await getTableList()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error.message
    });
  }
});

async function getTableList() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  } catch (error) {
    return `Error fetching tables: ${error.message}`;
  }
}

// ======================
// START SERVER
// ======================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Better Days backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
});
