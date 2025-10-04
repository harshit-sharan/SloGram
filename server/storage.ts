import { type User, type InsertUser, type Post, type InsertPost, type Message, type InsertMessage, type Conversation, type Comment } from "@shared/schema";
import { db } from "./db";
import { users, posts, messages, conversations, comments, likes } from "@shared/schema";
import { eq, and, or, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Posts
  createPost(post: InsertPost): Promise<Post>;
  getPosts(): Promise<Post[]>;
  getPostsByUserId(userId: string): Promise<Post[]>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  markMessageAsRead(messageId: string): Promise<void>;
  
  // Conversations
  getOrCreateConversation(user1Id: string, user2Id: string): Promise<Conversation>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  
  // Comments
  createComment(comment: { userId: string; postId: string; text: string }): Promise<Comment>;
  getCommentsByPostId(postId: string): Promise<Comment[]>;
  
  // Likes
  toggleLike(userId: string, postId: string): Promise<boolean>;
  getLikesByPostId(postId: string): Promise<number>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values({
      ...post,
      type: post.type as "image" | "video"
    }).returning();
    return newPost;
  }

  async getPosts(): Promise<Post[]> {
    return db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async getPostsByUserId(userId: string): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Update conversation's lastMessageAt
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return newMessage;
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db.update(messages).set({ read: true }).where(eq(messages.id, messageId));
  }

  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    const [existing] = await db.select().from(conversations).where(
      or(
        and(eq(conversations.user1Id, user1Id), eq(conversations.user2Id, user2Id)),
        and(eq(conversations.user1Id, user2Id), eq(conversations.user2Id, user1Id))
      )
    );

    if (existing) {
      return existing;
    }

    const [newConversation] = await db.insert(conversations)
      .values({ user1Id, user2Id })
      .returning();
    return newConversation;
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations).where(
      or(eq(conversations.user1Id, userId), eq(conversations.user2Id, userId))
    ).orderBy(desc(conversations.lastMessageAt));
  }

  async createComment(comment: { userId: string; postId: string; text: string }): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getCommentsByPostId(postId: string): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.postId, postId)).orderBy(comments.createdAt);
  }

  async toggleLike(userId: string, postId: string): Promise<boolean> {
    const [existing] = await db.select().from(likes).where(
      and(eq(likes.userId, userId), eq(likes.postId, postId))
    );

    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      return false;
    } else {
      await db.insert(likes).values({ userId, postId });
      return true;
    }
  }

  async getLikesByPostId(postId: string): Promise<number> {
    const result = await db.select().from(likes).where(eq(likes.postId, postId));
    return result.length;
  }
}

export const storage = new DbStorage();
