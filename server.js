const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(require('cors')());
app.use(express.json());

// USE ENVIRONMENT VARIABLE FROM RENDER
const CONNECTION_STRING = process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
  console.error('❌ FATAL: DATABASE_URL environment variable is not set in Render');
  console.error('Go to Render → Environment → Add DATABASE_URL variable');
  process.exit(1);
}

console.log('Using connection string from environment variable');
console.log('Host:', CONNECTION_STRING.split('@')[1]?.split(':')[0] || 'Unknown');

const dbConfig = {
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
};

const pool = new Pool(dbConfig);

async function testConnection() {
  console.log('Testing Supabase connection pooler...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, version() as version');
    console.log('✅ Connected via pooler! Time:', result.rows[0].time);
    console.log('PostgreSQL:', result.rows[0].version.split(',')[0]);
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log('📊 Available tables:', tables.rows.map(t => t.table_name).join(', '));
    } else {
      console.log('📊 No tables found. Run database/schema.sql in Supabase SQL Editor.');
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('password authentication')) {
      console.error('💡 TIP: The # symbol in password might need URL encoding');
      console.error('Try changing password or using %23 instead of #');
    }
    
    return false;
  }
}

testConnection();

app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    client.release();
    
    res.json({ 
      status: 'OK', 
      message: 'Supabase connection pooler working',
      database: 'Connected',
      timestamp: result.rows[0].time
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

app.post('/api/register', async (req, res) => {
  console.log('Registration attempt for:', req.body.email);
  
  try {
    const result = await pool.query('SELECT NOW() as time');
    
    res.json({
      success: true,
      message: 'Database connected via pooler',
      dbTime: result.rows[0].time,
      nextStep: 'Run database/schema.sql to create users table'
    });
    
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/tables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    res.json({ 
      success: true,
      tables: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: https://better-days-backend.onrender.com/health`);
  console.log(`📊 Tables: https://better-days-backend.onrender.com/api/tables`);
  console.log(`📝 Register: POST https://better-days-backend.onrender.com/api/register`);
});
