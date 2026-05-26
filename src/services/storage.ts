import { openDB, type IDBPDatabase } from 'idb';
import type { VideoAnalysis } from '../types';

const DB_NAME = 'tiktok-video-analyzer';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('analyses')) {
          const store = db.createObjectStore('analyses', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// Analyses CRUD
export async function saveAnalysis(analysis: VideoAnalysis): Promise<void> {
  const db = await getDb();
  await db.put('analyses', analysis);
}

export async function getAnalysis(id: string): Promise<VideoAnalysis | undefined> {
  const db = await getDb();
  return db.get('analyses', id);
}

export async function getAllAnalyses(): Promise<VideoAnalysis[]> {
  const db = await getDb();
  const analyses = await db.getAll('analyses');
  return analyses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('analyses', id);
}

export async function deleteAllAnalyses(): Promise<void> {
  const db = await getDb();
  await db.clear('analyses');
}

// Settings CRUD
export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('settings', { key, value });
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const entry = await db.get('settings', key);
  return entry?.value as T | undefined;
}
