import { type User, type InsertUser, type UpsertUser, type Post, type InsertPost, type Message, type InsertMessage, type Conversation, type Comment, type Notification, type Follow } from "@shared/schema";
import { db } from "./db";
import { users, posts, messages, conversations, comments, savors, saves, notifications, follows } from "@shared/schema";
import { eq, and, or, desc, ilike, inArray, sql } from "drizzle-orm";
import { encryptMessage, decryptMessage } from "./encryption";

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
  getMessagesByConversationIdPaginated(conversationId: string, limit: number, cursor?: string): Promise<{ messages: Message[]; hasMore: boolean }>;
  markMessageAsRead(messageId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  getUnreadMessageCountByConversation(conversationId: string, userId: string): Promise<number>;
  
  // Conversations
  getOrCreateConversation(user1Id: string, user2Id: string): Promise<Conversation>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  
  // Comments
  createComment(comment: { userId: string; postId: string; text: string }): Promise<Comment>;
  getCommentsByPostId(postId: string): Promise<Array<Comment & { user: User }>>;
  
  // Savors
  toggleSavor(userId: string, postId: string): Promise<boolean>;
  getSavorsByPostId(postId: string): Promise<number>;
  isPostSavoredByUser(userId: string, postId: string): Promise<boolean>;
  getUsersWhoSavoredPost(postId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>>;
  
  // Saves
  toggleSave(userId: string, postId: string): Promise<boolean>;
  isPostSavedByUser(userId: string, postId: string): Promise<boolean>;
  getSavedPostsByUserId(userId: string): Promise<Array<Post & { savedAt: Date }>>;
  
  // Notifications
  createNotification(notification: { userId: string; type: "savor" | "comment" | "follow"; actorId: string; postId?: string }): Promise<Notification>;
  getNotificationsByUserId(userId: string): Promise<Array<Notification & { actor: User; post?: Post }>>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // Follows
  toggleFollow(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowedUserIds(userId: string): Promise<string[]>;
  getFollowers(userId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>>;
  getFollowing(userId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>>;
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
    await db.delete(savors).where(eq(savors.postId, postId));
    await db.delete(saves).where(eq(saves.postId, postId));
    await db.delete(comments).where(eq(comments.postId, postId));
    await db.delete(notifications).where(eq(notifications.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // Encrypt the message text before storing
    const encryptedText = encryptMessage(message.text);
    
    const [newMessage] = await db.insert(messages).values({
      ...message,
      text: encryptedText
    }).returning();
    
    // Update conversation's lastMessageAt
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    // Decrypt the text before returning
    return {
      ...newMessage,
      text: message.text // Return the original plain text
    };
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    const encryptedMessages = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    // Decrypt all messages before returning
    return encryptedMessages.map(msg => ({
      ...msg,
      text: decryptMessage(msg.text)
    }));
  }

  async getMessagesByConversationIdPaginated(
    conversationId: string, 
    limit: number = 20, 
    cursor?: string
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    // Build the query - fetch messages in descending order (newest first)
    let query = db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1); // Fetch one extra to check if there are more
    
    // If cursor is provided, only fetch messages older than the cursor
    if (cursor) {
      const result = await db.select().from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            // Only get messages older than cursor (createdAt < cursor)
            sql`${messages.createdAt} < ${new Date(cursor)}`
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1);
      
      const hasMore = result.length > limit;
      const messagesToReturn = hasMore ? result.slice(0, -1) : result;
      
      // Decrypt all messages before returning
      const decryptedMessages = messagesToReturn.map(msg => ({
        ...msg,
        text: decryptMessage(msg.text)
      }));
      
      return {
        messages: decryptedMessages,
        hasMore,
      };
    }
    
    const result = await query;
    const hasMore = result.length > limit;
    const messagesToReturn = hasMore ? result.slice(0, -1) : result;
    
    // Decrypt all messages before returning
    const decryptedMessages = messagesToReturn.map(msg => ({
      ...msg,
      text: decryptMessage(msg.text)
    }));
    
    return {
      messages: decryptedMessages,
      hasMore,
    };
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db.update(messages).set({ read: true }).where(eq(messages.id, messageId));
  }

  async markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    // Mark all unread messages in this conversation as read where the user is NOT the sender
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.read, false),
          sql`${messages.senderId} != ${userId}`
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    // Get all conversations for the user
    const userConversations = await this.getConversationsByUserId(userId);
    const conversationIds = userConversations.map(c => c.id);
    
    if (conversationIds.length === 0) {
      return 0;
    }
    
    // Count unique conversations that have unread messages where the user is NOT the sender
    const result = await db
      .selectDistinct({ conversationId: messages.conversationId })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          eq(messages.read, false),
          sql`${messages.senderId} != ${userId}`
        )
      );
    
    return result.length;
  }

  async getUnreadMessageCountByConversation(conversationId: string, userId: string): Promise<number> {
    // Count unread messages in this conversation where the user is NOT the sender
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.read, false),
          sql`${messages.senderId} != ${userId}`
        )
      );
    
    return Number(result[0]?.count || 0);
  }

  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    // Normalize user IDs to prevent duplicates (always store lower ID first)
    const normalizedUser1Id = user1Id < user2Id ? user1Id : user2Id;
    const normalizedUser2Id = user1Id < user2Id ? user2Id : user1Id;

    const [existing] = await db.select().from(conversations).where(
      or(
        and(eq(conversations.user1Id, normalizedUser1Id), eq(conversations.user2Id, normalizedUser2Id)),
        and(eq(conversations.user1Id, normalizedUser2Id), eq(conversations.user2Id, normalizedUser1Id))
      )
    );

    if (existing) {
      return existing;
    }

    const [newConversation] = await db.insert(conversations)
      .values({ user1Id: normalizedUser1Id, user2Id: normalizedUser2Id })
      .onConflictDoNothing()
      .returning();
    
    // If conflict occurred and no row was returned, fetch the existing conversation
    if (!newConversation) {
      const [existingConv] = await db.select().from(conversations).where(
        or(
          and(eq(conversations.user1Id, normalizedUser1Id), eq(conversations.user2Id, normalizedUser2Id)),
          and(eq(conversations.user1Id, normalizedUser2Id), eq(conversations.user2Id, normalizedUser1Id))
        )
      );
      return existingConv;
    }
    
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

  async toggleSavor(userId: string, postId: string): Promise<boolean> {
    const [existing] = await db.select().from(savors).where(
      and(eq(savors.userId, userId), eq(savors.postId, postId))
    );

    if (existing) {
      await db.delete(savors).where(eq(savors.id, existing.id));
      return false;
    } else {
      await db.insert(savors).values({ userId, postId });
      return true;
    }
  }

  async getSavorsByPostId(postId: string): Promise<number> {
    const result = await db.select().from(savors).where(eq(savors.postId, postId));
    return result.length;
  }

  async isPostSavoredByUser(userId: string, postId: string): Promise<boolean> {
    const [existing] = await db.select().from(savors).where(
      and(eq(savors.userId, userId), eq(savors.postId, postId))
    );
    return !!existing;
  }

  async getUsersWhoSavoredPost(postId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        bio: users.bio,
        avatar: users.avatar,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        isFollowing: sql<boolean>`CASE WHEN ${follows.followerId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(savors)
      .innerJoin(users, eq(savors.userId, users.id))
      .leftJoin(
        follows,
        currentUserId 
          ? and(eq(follows.followerId, currentUserId), eq(follows.followingId, users.id))
          : sql`false`
      )
      .where(eq(savors.postId, postId))
      .orderBy(desc(savors.createdAt));
    
    return result as Array<User & { isFollowing: boolean }>;
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

  async getSavedPostsByUserId(userId: string): Promise<Array<Post & { savedAt: Date }>> {
    const savedPosts = await db
      .select({
        post: posts,
        savedAt: saves.createdAt,
      })
      .from(saves)
      .innerJoin(posts, eq(saves.postId, posts.id))
      .where(eq(saves.userId, userId))
      .orderBy(desc(saves.createdAt));

    return savedPosts.map(({ post, savedAt }) => ({
      ...post,
      savedAt,
    }));
  }

  async createNotification(notification: { userId: string; type: "savor" | "comment" | "follow"; actorId: string; postId?: string }): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotificationsByUserId(userId: string): Promise<Array<Notification & { actor: User; post?: Post }>> {
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
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    return result as Array<Notification & { actor: User; post?: Post }>;
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

  async getFollowers(userId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>> {
    const followsAlias = sql.identifier('f2');
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
        isFollowing: sql<boolean>`CASE WHEN ${followsAlias}."follower_id" IS NOT NULL THEN true ELSE false END`,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .leftJoin(
        sql`${sql.identifier('follows')} AS ${followsAlias}`,
        currentUserId 
          ? sql`${followsAlias}."follower_id" = ${currentUserId} AND ${followsAlias}."following_id" = ${users.id}`
          : sql`false`
      )
      .where(eq(follows.followingId, userId));
    return result as Array<User & { isFollowing: boolean }>;
  }

  async getFollowing(userId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>> {
    const followsAlias = sql.identifier('f2');
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
        isFollowing: sql<boolean>`CASE WHEN ${followsAlias}."follower_id" IS NOT NULL THEN true ELSE false END`,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .leftJoin(
        sql`${sql.identifier('follows')} AS ${followsAlias}`,
        currentUserId 
          ? sql`${followsAlias}."follower_id" = ${currentUserId} AND ${followsAlias}."following_id" = ${users.id}`
          : sql`false`
      )
      .where(eq(follows.followerId, userId));
    return result as Array<User & { isFollowing: boolean }>;
  }
}

export const storage = new DbStorage();
