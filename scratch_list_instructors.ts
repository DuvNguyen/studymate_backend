import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './src/database/entities/user.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<User>>(getRepositoryToken(User));
  
  const instructors = await repo.find({ 
    relations: ['role', 'profile'],
    where: { role: { roleName: 'INSTRUCTOR' } }
  });
  
  console.log('INSTRUCTORS:');
  instructors.forEach(u => {
    console.log(`- ID: ${u.id}, Name: ${u.profile?.fullName}, Email: ${u.email}`);
  });
  
  await app.close();
}

bootstrap();
