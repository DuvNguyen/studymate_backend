const { Client } = require('@neondatabase/serverless');
const ws = require('ws');
require('dotenv').config();

async function checkVideos() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    webSocketConstructor: ws,
  });

  try {
    await client.connect();
    console.log('Connected to DB via serverless WebSockets');
    
    console.log('\n--- Count by status ---');
    const statusRes = await client.query('SELECT status, COUNT(*) FROM videos GROUP BY status');
    console.log(statusRes.rows);

    console.log('\n--- All videos ---');
    const videosRes = await client.query('SELECT id, uploader_id, title, status FROM videos');
    console.log(videosRes.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkVideos();
