import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CoursesService } from '../modules/courses/courses.service';
import { UsersService } from '../modules/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const coursesService = app.get(CoursesService);
  const usersService = app.get(UsersService);

  console.log('Starting Meilisearch synchronization...');

  try {
    console.log('Syncing courses...');
    await coursesService.syncAllToMeili();

    console.log('Syncing users...');
    await usersService.syncAllToMeili();

    console.log('Synchronization completed successfully!');
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown synchronization error';
    console.error('Synchronization failed:', errorMessage);
  } finally {
    await app.close();
  }
}

void bootstrap();
