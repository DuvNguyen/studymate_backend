const { createClient } = require('redis');

async function run() {
  const client = createClient();
  client.on('error', err => console.log('Redis Client Error', err));
  await client.connect();
  
  const keys = await client.keys('user_auth_*');
  console.log("Keys:", keys);
  
  for (const key of keys) {
    const val = await client.get(key);
    const obj = JSON.parse(val);
    console.log(`Key ${key} -> User ID:`, obj?.id);
  }
  
  await client.quit();
}
run();
