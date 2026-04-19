import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function checkUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const users = await dataSource.query(`SELECT id, clerk_user_id, email FROM users`);
  console.log('USERS IN DB:');
  for (const u of users) {
    const profiles = await dataSource.query(`SELECT full_name FROM profiles WHERE user_id = $1`, [u.id]);
    console.log(`ID: ${u.id}, Name: ${profiles[0]?.full_name}, Email: ${u.email}`);
  }

  await app.close();
}

checkUser();
