const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_cjib8yu1IOlL@ep-late-dream-a4cz3e08-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function run() {
  await client.connect();
  try {
    console.log('Adding upvotes/downvotes to lesson_discussions...');
    await client.query(`
      ALTER TABLE lesson_discussions 
      ADD COLUMN IF NOT EXISTS upvotes INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS downvotes INT DEFAULT 0;
    `);

    console.log('Creating discussion_votes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_votes (
        id SERIAL PRIMARY KEY,
        discussion_id INT NOT NULL REFERENCES lesson_discussions(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT idx_disc_votes_unique UNIQUE (discussion_id, user_id)
      );
    `);

    console.log('Creating indexes for discussion_votes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_disc_votes_discussion ON discussion_votes(discussion_id);
      CREATE INDEX IF NOT EXISTS idx_disc_votes_user ON discussion_votes(user_id);
    `);

    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
