const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(require('cors')());
app.use(express.json());

console.log('🔧 === DATABASE SETUP ===');

const dbConfig = {
  user: 'postgres',
  password: '#tfiiohfutu', 
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

async function testConnection() {
  console.log('🔌 Testing database connection...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    console.log('✅ Database connected! Current time:', result.rows[0].time);
    
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

testConnection();

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/register', async (req, res) => {
  console.log('📨 Registration attempt for:', req.body.email);
  
  try {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`📮 Register: POST http://localhost:${PORT}/api/register`);
});
