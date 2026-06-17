const { Client } = require('@neondatabase/serverless');
const ws = require('ws');
require('dotenv').config();

async function updateVideos() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    webSocketConstructor: ws,
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    const res = await client.query(
      "UPDATE videos SET status = 'PENDING_REVIEW' WHERE id IN (10, 11) RETURNING id, title, status"
    );
    console.log('Updated videos:', res.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

updateVideos();
