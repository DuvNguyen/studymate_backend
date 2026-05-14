import { Injectable, OnModuleInit } from '@nestjs/common';
import { Meilisearch } from 'meilisearch';

type RecordAny = Record<string, unknown>;
type SearchOptions = Record<string, unknown>;
type SearchResult = { hits: RecordAny[]; totalHits: number };

@Injectable()
export class SearchService implements OnModuleInit {
  private client: Meilisearch;
  private toTotalHits(value: unknown): number {
    return typeof value === 'number' ? value : 0;
  }

  private extractTotalHits(result: unknown): number {
    if (!result || typeof result !== 'object') return 0;
    const raw = result as Record<string, unknown>;
    return (
      this.toTotalHits(raw.totalHits) ||
      this.toTotalHits(raw.estimatedTotalHits)
    );
  }

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        'Failed to connect to Meilisearch or initialize indexes:',
        message,
      );
      console.warn(
        'Backend will continue running, but search features may be limited.',
      );
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
    } catch {
      try {
        await this.client.createIndex('courses', { primaryKey: 'id' });
      } catch {
        // no-op: index may already exist in parallel boot
      }
    }

    const coursesIndex = this.client.index('courses');
    await coursesIndex.updateSettings({
      searchableAttributes: [
        'title',
        'description',
        'instructorName',
        'categoryName',
      ],
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
    } catch {
      try {
        await this.client.createIndex('users', { primaryKey: 'id' });
      } catch {
        // no-op: index may already exist in parallel boot
      }
    }

    const usersIndex = this.client.index('users');
    await usersIndex.updateSettings({
      searchableAttributes: ['fullName', 'email'],
      filterableAttributes: ['role', 'status'],
      sortableAttributes: ['createdAt'],
    });
  }

  async indexCourse(course: RecordAny) {
    try {
      const index = this.client.index('courses');
      await index.addDocuments([course]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch indexing error (course):', message);
    }
  }

  async deleteCourse(id: string) {
    try {
      const index = this.client.index('courses');
      await index.deleteDocument(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch deletion error (course):', message);
    }
  }

  async indexCourses(courses: RecordAny[]) {
    try {
      const index = this.client.index('courses');
      const response = await index.addDocuments(courses);
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch bulk indexing error (courses):', message);
    }
  }

  async searchCourses(
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult> {
    try {
      const index = this.client.index('courses');
      const result = await index.search<RecordAny>(query, options);
      return {
        hits: result.hits,
        totalHits: this.extractTotalHits(result),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch search error (courses):', message);
      return { hits: [], totalHits: 0 };
    }
  }

  async indexUser(user: RecordAny) {
    try {
      const index = this.client.index('users');
      await index.addDocuments([user]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch indexing error (user):', message);
    }
  }

  async deleteUser(id: string) {
    try {
      const index = this.client.index('users');
      await index.deleteDocument(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch deletion error (user):', message);
    }
  }

  async indexUsers(users: RecordAny[]) {
    try {
      const index = this.client.index('users');
      const response = await index.addDocuments(users);
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch bulk indexing error (users):', message);
    }
  }

  async searchUsers(
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult> {
    try {
      const index = this.client.index('users');
      const result = await index.search<RecordAny>(query, options);
      return {
        hits: result.hits,
        totalHits: this.extractTotalHits(result),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Meilisearch search error (users):', message);
      return { hits: [], totalHits: 0 };
    }
  }
}
