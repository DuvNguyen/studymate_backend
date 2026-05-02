async function run() {
  // Let's check the database again. What is the role of admin and hocvien2?
  const { Client } = require('pg');
  const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_cjib8yu1IOlL@ep-late-dream-a4cz3e08-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
  await client.connect();
  const res = await client.query(`
    SELECT u.id, u.email, u.clerk_user_id, r.role_name, p.full_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id IN (49, 62, 65)
  `);
  console.table(res.rows);
  await client.end();
}
run();
