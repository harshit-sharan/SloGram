import { type User, type InsertUser, type Post, type InsertPost, type Message, type InsertMessage, type Conversation, type Comment, type Notification } from "@shared/schema";
import { db } from "./db";
import { users, posts, messages, conversations, comments, likes, saves, notifications } from "@shared/schema";
import { eq, and, or, desc, ilike } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  searchUsers(query: string): Promise<User[]>;
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
  getCommentsByPostId(postId: string): Promise<Array<Comment & { user: User }>>;
  
  // Likes
  toggleLike(userId: string, postId: string): Promise<boolean>;
  getLikesByPostId(postId: string): Promise<number>;
  isPostLikedByUser(userId: string, postId: string): Promise<boolean>;
  
  // Saves
  toggleSave(userId: string, postId: string): Promise<boolean>;
  isPostSavedByUser(userId: string, postId: string): Promise<boolean>;
  
  // Notifications
  createNotification(notification: { userId: string; type: "like" | "comment"; actorId: string; postId: string }): Promise<Notification>;
  getNotificationsByUserId(userId: string): Promise<Array<Notification & { actor: User; post: Post }>>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
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

  async searchUsers(query: string): Promise<User[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(users).where(
      or(
        ilike(users.username, searchPattern),
        ilike(users.displayName, searchPattern)
      )
    ).limit(10);
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

  async getCommentsByPostId(postId: string): Promise<Array<Comment & { user: User }>> {
    const result = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        postId: comments.postId,
        text: comments.text,
        createdAt: comments.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);
    
    return result as Array<Comment & { user: User }>;
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

  async isPostLikedByUser(userId: string, postId: string): Promise<boolean> {
    const [existing] = await db.select().from(likes).where(
      and(eq(likes.userId, userId), eq(likes.postId, postId))
    );
    return !!existing;
  }

  async toggleSave(userId: string, postId: string): Promise<boolean> {
    const [existing] = await db.select().from(saves).where(
      and(eq(saves.userId, userId), eq(saves.postId, postId))
    );

    if (existing) {
      await db.delete(saves).where(eq(saves.id, existing.id));
      return false;
    } else {
      await db.insert(saves).values({ userId, postId });
      return true;
    }
  }

  async isPostSavedByUser(userId: string, postId: string): Promise<boolean> {
    const [existing] = await db.select().from(saves).where(
      and(eq(saves.userId, userId), eq(saves.postId, postId))
    );
    return !!existing;
  }

  async createNotification(notification: { userId: string; type: "like" | "comment"; actorId: string; postId: string }): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotificationsByUserId(userId: string): Promise<Array<Notification & { actor: User; post: Post }>> {
    const result = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        actorId: notifications.actorId,
        postId: notifications.postId,
        read: notifications.read,
        createdAt: notifications.createdAt,
        actor: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        },
        post: {
          id: posts.id,
          userId: posts.userId,
          type: posts.type,
          mediaUrl: posts.mediaUrl,
          caption: posts.caption,
          createdAt: posts.createdAt,
        },
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .innerJoin(posts, eq(notifications.postId, posts.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    return result as Array<Notification & { actor: User; post: Post }>;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select().from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.read, false))
    );
    return result.length;
  }
}

export const storage = new DbStorage();
