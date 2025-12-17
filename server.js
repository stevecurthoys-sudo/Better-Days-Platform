const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// MIDDLEWARE
// ======================
app.use(require('cors')()); // Allow all origins for testing
app.use(express.json());

// ======================
// EXPLICIT DATABASE CONFIG
// ======================
console.log('🔧 === DATABASE SETUP ===');

// OPTION 1: Hardcoded config (MOST RELIABLE for testing)
const dbConfig = {
  user: 'postgres',
  password: 'YOUR_REAL_SUPABASE_PASSWORD_HERE', // ← REPLACE THIS
  host: 'db.czcxphiiraiglaehwsor.supabase.co',
  port: 5432,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
};

console.log('Using config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

const pool = new Pool(dbConfig);

// ======================
// TEST DATABASE CONNECTION
// ======================
async function testConnection() {
  console.log('🔌 Testing database connection...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    console.log('✅ Database connected! Current time:', result.rows[0].time);
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    console.log('📊 Users table exists?', tableCheck.rows[0].exists);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection FAILED:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Run test on startup
testConnection();

// ======================
// HEALTH ENDPOINT
// ======================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ======================
// SIMPLE REGISTRATION
// ======================
app.post('/api/register', async (req, res) => {
  console.log('📨 Registration attempt for:', req.body.email);
  
  try {
    // Simple test - just check if we can query
    const result = await pool.query('SELECT NOW() as time');
    
    res.json({
      success: true,
      message: 'Database is reachable!',
      dbTime: result.rows[0].time,
      yourEmail: req.body.email
    });
    
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

// ======================
// START SERVER
// ======================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`📮 Register: POST http://localhost:${PORT}/api/register`);
});
