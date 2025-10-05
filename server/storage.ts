import { type User, type InsertUser, type UpsertUser, type Post, type InsertPost, type Message, type InsertMessage, type Conversation, type Comment, type Notification, type Follow } from "@shared/schema";
import { db } from "./db";
import { users, posts, messages, conversations, comments, likes, saves, notifications, follows } from "@shared/schema";
import { eq, and, or, desc, ilike, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  searchUsers(query: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Posts
  createPost(post: InsertPost): Promise<Post>;
  getPosts(): Promise<Post[]>;
  getPost(postId: string): Promise<Post | undefined>;
  getPostsByUserId(userId: string): Promise<Post[]>;
  deletePost(postId: string): Promise<void>;
  
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
  
  // Follows
  toggleFollow(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowedUserIds(userId: string): Promise<string[]>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
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

  async getPost(postId: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    return post;
  }

  async getPostsByUserId(userId: string): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
  }

  async deletePost(postId: string): Promise<void> {
    await db.delete(likes).where(eq(likes.postId, postId));
    await db.delete(saves).where(eq(saves.postId, postId));
    await db.delete(comments).where(eq(comments.postId, postId));
    await db.delete(notifications).where(eq(notifications.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));
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

  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    // Prevent self-follow
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const [existing] = await db.select().from(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );

    if (existing) {
      await db.delete(follows).where(eq(follows.id, existing.id));
      return false;
    } else {
      await db.insert(follows).values({ followerId, followingId });
      return true;
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [existing] = await db.select().from(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
    return !!existing;
  }

  async getFollowedUserIds(userId: string): Promise<string[]> {
    const result = await db.select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));
    return result.map(row => row.followingId);
  }

  async getFollowers(userId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        bio: users.bio,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        password: users.password,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return result as User[];
  }

  async getFollowing(userId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        bio: users.bio,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        password: users.password,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    return result as User[];
  }
}

export const storage = new DbStorage();
