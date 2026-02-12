import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export async function initializeExtensions() {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("pgvector extension enabled");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS moment_embeddings (
        moment_id VARCHAR NOT NULL PRIMARY KEY REFERENCES moments(id) ON DELETE CASCADE,
        embedding vector(1536),
        caption_hash VARCHAR(32),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_embeddings (
        user_id VARCHAR NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        embedding vector(1536),
        profile_hash VARCHAR(32),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moment_summaries (
        moment_id VARCHAR NOT NULL PRIMARY KEY REFERENCES moments(id) ON DELETE CASCADE,
        summary TEXT,
        caption_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_interest_profiles (
        user_id VARCHAR NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        interests TEXT,
        profile_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Vector and recommender tables ensured");
  } catch (error) {
    console.warn("Could not initialize pgvector:", error);
  }
}

export async function createVectorIndexes() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Skipping HNSW index creation in development");
    return;
  }
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moment_embeddings_vector
      ON moment_embeddings USING hnsw (embedding vector_cosine_ops)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_embeddings_vector
      ON user_embeddings USING hnsw (embedding vector_cosine_ops)
    `);
    console.log("HNSW vector indexes ensured");
  } catch (error) {
    console.warn("Could not create HNSW indexes:", error);
  }
}
