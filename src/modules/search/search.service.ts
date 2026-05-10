import { Injectable, OnModuleInit } from '@nestjs/common';
import { Meilisearch, Index } from 'meilisearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private client: Meilisearch;

  constructor() {
    this.client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey',
    });
  }

  async onModuleInit() {
    try {
      await this.initIndexes();
      console.log('Meilisearch indexes initialized successfully.');
    } catch (error) {
      console.error('Failed to connect to Meilisearch or initialize indexes:', error.message);
      console.warn('Backend will continue running, but search features may be limited.');
    }
  }

  private async initIndexes() {
    try {
      // In development, it's safer to ensure the index is clean with correct primary key if it was missing
      const index = this.client.index('courses');
      const stats = await index.getStats();
      if (stats.numberOfDocuments === 0) {
          // If empty but has pk issues, just delete and recreate
          await this.client.deleteIndex('courses');
          await this.client.createIndex('courses', { primaryKey: 'id' });
      }
    } catch (e) {
      try {
        await this.client.createIndex('courses', { primaryKey: 'id' });
      } catch (inner) {}
    }
    
    const coursesIndex = this.client.index('courses');
    await coursesIndex.updateSettings({
      searchableAttributes: ['title', 'description', 'instructorName', 'categoryName'],
      filterableAttributes: ['categoryId', 'instructorId', 'level', 'status'],
      sortableAttributes: ['createdAt', 'price', 'publishedAt'],
    });

    try {
      const index = this.client.index('users');
      const stats = await index.getStats();
      if (stats.numberOfDocuments === 0) {
          await this.client.deleteIndex('users');
          await this.client.createIndex('users', { primaryKey: 'id' });
      }
    } catch (e) {
      try {
        await this.client.createIndex('users', { primaryKey: 'id' });
      } catch (inner) {}
    }
    
    const usersIndex = this.client.index('users');
    await usersIndex.updateSettings({
      searchableAttributes: ['fullName', 'email'],
      filterableAttributes: ['role', 'status'],
      sortableAttributes: ['createdAt'],
    });
  }

  async indexCourse(course: any) {
    try {
      const index = this.client.index('courses');
      await index.addDocuments([course]);
    } catch (error) {
      console.error('Meilisearch indexing error (course):', error.message);
    }
  }

  async deleteCourse(id: string) {
    try {
      const index = this.client.index('courses');
      await index.deleteDocument(id);
    } catch (error) {
      console.error('Meilisearch deletion error (course):', error.message);
    }
  }

  async indexCourses(courses: any[]) {
    try {
      const index = this.client.index('courses');
      const response = await index.addDocuments(courses);
      return response;
    } catch (error) {
      console.error('Meilisearch bulk indexing error (courses):', error.message);
    }
  }

  async searchCourses(query: string, options?: any) {
    try {
      const index = this.client.index('courses');
      return await index.search(query, options);
    } catch (error) {
      console.error('Meilisearch search error (courses):', error.message);
      return { hits: [], totalHits: 0 };
    }
  }

  async indexUser(user: any) {
    try {
      const index = this.client.index('users');
      await index.addDocuments([user]);
    } catch (error) {
      console.error('Meilisearch indexing error (user):', error.message);
    }
  }

  async deleteUser(id: string) {
    try {
      const index = this.client.index('users');
      await index.deleteDocument(id);
    } catch (error) {
      console.error('Meilisearch deletion error (user):', error.message);
    }
  }

  async indexUsers(users: any[]) {
    try {
      const index = this.client.index('users');
      const response = await index.addDocuments(users);
      return response;
    } catch (error) {
      console.error('Meilisearch bulk indexing error (users):', error.message);
    }
  }

  async searchUsers(query: string, options?: any) {
    try {
      const index = this.client.index('users');
      return await index.search(query, options);
    } catch (error) {
      console.error('Meilisearch search error (users):', error.message);
      return { hits: [], totalHits: 0 };
    }
  }
}
