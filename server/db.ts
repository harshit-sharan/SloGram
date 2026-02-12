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
      CREATE INDEX IF NOT EXISTS idx_moment_embeddings_vector
      ON moment_embeddings USING hnsw (embedding vector_cosine_ops)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_embeddings_vector
      ON user_embeddings USING hnsw (embedding vector_cosine_ops)
    `);
    console.log("HNSW vector indexes ensured");
  } catch (error) {
    console.warn("Could not initialize pgvector:", error);
  }
}
