import OpenAI from "openai";
import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const embeddingsClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) return null;
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await embeddingsClient.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim().slice(0, 8000),
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return response.data[0]?.embedding || null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

export async function upsertMomentEmbedding(momentId: string, caption: string): Promise<boolean> {
  if (!caption || caption.trim().length === 0) return false;

  const captionHash = hashText(caption);

  const existing = await db.execute(
    sql`SELECT caption_hash FROM moment_embeddings WHERE moment_id = ${momentId}`
  );
  if (existing.rows.length > 0 && existing.rows[0].caption_hash === captionHash) {
    return true;
  }

  const embedding = await generateEmbedding(caption);
  if (!embedding) return false;

  const vectorStr = `[${embedding.join(",")}]`;
  await db.execute(
    sql`INSERT INTO moment_embeddings (moment_id, embedding, caption_hash, created_at)
        VALUES (${momentId}, ${vectorStr}::vector, ${captionHash}, NOW())
        ON CONFLICT (moment_id) DO UPDATE
        SET embedding = ${vectorStr}::vector, caption_hash = ${captionHash}, created_at = NOW()`
  );
  return true;
}

export async function upsertUserEmbedding(userId: string, bio: string, recentCaptions: string[]): Promise<boolean> {
  const profileText = [
    bio || "",
    ...recentCaptions.filter(Boolean).slice(0, 10),
  ].filter(Boolean).join(" | ");

  if (!profileText.trim()) return false;

  const profileHash = hashText(profileText);

  const existing = await db.execute(
    sql`SELECT profile_hash FROM user_embeddings WHERE user_id = ${userId}`
  );
  if (existing.rows.length > 0 && existing.rows[0].profile_hash === profileHash) {
    return true;
  }

  const embedding = await generateEmbedding(profileText);
  if (!embedding) return false;

  const vectorStr = `[${embedding.join(",")}]`;
  await db.execute(
    sql`INSERT INTO user_embeddings (user_id, embedding, profile_hash, created_at, updated_at)
        VALUES (${userId}, ${vectorStr}::vector, ${profileHash}, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET embedding = ${vectorStr}::vector, profile_hash = ${profileHash}, updated_at = NOW()`
  );
  return true;
}

export async function findSimilarMoments(
  userId: string,
  limit: number = 50,
  excludeMomentIds: string[] = []
): Promise<Array<{ momentId: string; similarity: number }>> {
  const userEmb = await db.execute(
    sql`SELECT embedding FROM user_embeddings WHERE user_id = ${userId}`
  );
  if (userEmb.rows.length === 0) return [];

  let query;
  if (excludeMomentIds.length > 0) {
    const excludeList = excludeMomentIds.map(id => `'${id.replace(/'/g, "''")}'`).join(",");
    query = sql`
      SELECT me.moment_id,
             1 - (me.embedding <=> ue.embedding) AS similarity
      FROM moment_embeddings me
      CROSS JOIN user_embeddings ue
      WHERE ue.user_id = ${userId}
        AND me.moment_id NOT IN (${sql.raw(excludeList)})
      ORDER BY me.embedding <=> ue.embedding
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT me.moment_id,
             1 - (me.embedding <=> ue.embedding) AS similarity
      FROM moment_embeddings me
      CROSS JOIN user_embeddings ue
      WHERE ue.user_id = ${userId}
      ORDER BY me.embedding <=> ue.embedding
      LIMIT ${limit}
    `;
  }

  const result = await db.execute(query);
  return result.rows.map((row: any) => ({
    momentId: row.moment_id as string,
    similarity: parseFloat(row.similarity as string),
  }));
}

export async function hasUserEmbedding(userId: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT 1 FROM user_embeddings WHERE user_id = ${userId} LIMIT 1`
  );
  return result.rows.length > 0;
}

export async function getEmbeddingStats(): Promise<{ moments: number; users: number }> {
  const moments = await db.execute(sql`SELECT COUNT(*) as count FROM moment_embeddings`);
  const users = await db.execute(sql`SELECT COUNT(*) as count FROM user_embeddings`);
  return {
    moments: parseInt(moments.rows[0]?.count as string || "0"),
    users: parseInt(users.rows[0]?.count as string || "0"),
  };
}
