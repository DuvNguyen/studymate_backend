const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    host: 'ep-late-dream-a4cz3e08.us-east-1.aws.neon.tech',
    port: 5432,
    user: 'neondb_owner',
    password: 'npg_cjib8yu1IOlL',
    database: 'neondb',
    ssl: {
      rejectUnauthorized: false,
    },
    family: 4,
  });

  console.log('Testing connection with individual options and family: 4...');
  
  try {
    await client.connect();
    console.log('Successfully connected to database!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();
