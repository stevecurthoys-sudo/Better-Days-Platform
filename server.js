const express = require('express');
const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(require('cors')());
app.use(express.json());

const dbConfig = {
  user: 'postgres',
  password: 'tfiiohfutu#',
  host: 'db.czcxphiiraiglaehwsor.supabase.co',
  port: 5432,
  database: 'postgres',
  family: 4,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
};

console.log('Database host:', dbConfig.host);

dns.lookup('db.czcxphiiraiglaehwsor.supabase.co', { family: 4 }, (err, address) => {
  if (err) {
    console.log('DNS lookup error:', err.message);
  } else {
    console.log('DNS resolved to (IPv4):', address);
  }
});

const pool = new Pool(dbConfig);

async function testConnection() {
  console.log('Testing database connection...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    console.log('Database connected. Time:', result.rows[0].time);
    
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    console.log('Users table exists?', tableCheck.rows[0].exists);
    
    client.release();
  } catch (error) {
    console.error('Database connection FAILED:', error.message);
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
  console.log('Registration attempt for:', req.body.email);
  
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
  console.log(`Server running on port ${PORT}`);
});
