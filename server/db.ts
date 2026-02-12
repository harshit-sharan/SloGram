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
  } catch (error) {
    console.warn("Could not enable pgvector extension:", error);
  }
}
