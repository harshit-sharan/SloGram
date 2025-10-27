import { type User, type InsertUser, type UpsertUser, type Moment, type InsertMoment, type Note, type InsertNote, type Conversation, type Reflect, type Whisper, type Follow } from "@shared/schema";
import { db } from "./db";
import { users, moments, notes, conversations, reflects, savors, keeps, whispers, follows } from "@shared/schema";
import { eq, and, or, desc, ilike, inArray, sql } from "drizzle-orm";
import { encryptMessage, decryptMessage } from "./encryption";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  searchUsers(query: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createLocalUser(user: { email: string; password: string; username: string; displayName: string; firstName?: string | null; lastName?: string | null }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Moments
  createMoment(moment: InsertMoment): Promise<Moment>;
  getMoments(): Promise<Moment[]>;
  getMoment(momentId: string): Promise<Moment | undefined>;
  getMomentsByUserId(userId: string): Promise<Moment[]>;
  deleteMoment(momentId: string): Promise<void>;
  
  // Notes
  createNote(note: InsertNote): Promise<Note>;
  getNotesByConversationId(conversationId: string): Promise<Note[]>;
  getNotesByConversationIdPaginated(conversationId: string, limit: number, cursor?: string): Promise<{ notes: Note[]; hasMore: boolean }>;
  markNoteAsRead(noteId: string): Promise<void>;
  getUnreadNoteCount(userId: string): Promise<number>;
  getUnreadNoteCountByConversation(conversationId: string, userId: string): Promise<number>;
  
  // Conversations
  getOrCreateConversation(user1Id: string, user2Id: string): Promise<Conversation>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  
  // Reflects
  createReflect(reflect: { userId: string; momentId: string; text: string }): Promise<Reflect>;
  getReflectsByMomentId(momentId: string): Promise<Array<Reflect & { user: User }>>;
  
  // Savors
  toggleSavor(userId: string, momentId: string): Promise<boolean>;
  getSavorsByMomentId(momentId: string): Promise<number>;
  isMomentSavoredByUser(userId: string, momentId: string): Promise<boolean>;
  getUsersWhoSavoredMoment(momentId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>>;
  
  // Keeps
  toggleKeep(userId: string, momentId: string): Promise<boolean>;
  isMomentKeptByUser(userId: string, momentId: string): Promise<boolean>;
  getKeptMomentsByUserId(userId: string): Promise<Array<Moment & { keptAt: Date }>>;
  
  // Whispers
  createWhisper(whisper: { userId: string; type: "savor" | "reflect" | "follow"; actorId: string; momentId?: string }): Promise<Whisper>;
  getWhispersByUserId(userId: string): Promise<Array<Whisper & { actor: User; moment?: Moment }>>;
  markWhisperAsRead(whisperId: string): Promise<void>;
  markAllWhispersAsRead(userId: string): Promise<void>;
  getUnreadWhisperCount(userId: string): Promise<number>;
  
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async createLocalUser(userData: { email: string; password: string; username: string; displayName: string; firstName?: string | null; lastName?: string | null }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: userData.email,
      password: userData.password,
      username: userData.username,
      displayName: userData.displayName,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
    }).returning();
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

  async createMoment(moment: InsertMoment): Promise<Moment> {
    const [newMoment] = await db.insert(moments).values({
      ...moment,
      type: moment.type as "image" | "video"
    }).returning();
    return newMoment;
  }

  async getMoments(): Promise<Moment[]> {
    return db.select().from(moments).orderBy(desc(moments.createdAt));
  }

  async getMoment(momentId: string): Promise<Moment | undefined> {
    const [moment] = await db.select().from(moments).where(eq(moments.id, momentId));
    return moment;
  }

  async getMomentsByUserId(userId: string): Promise<Moment[]> {
    return db.select().from(moments).where(eq(moments.userId, userId)).orderBy(desc(moments.createdAt));
  }

  async deleteMoment(momentId: string): Promise<void> {
    await db.delete(savors).where(eq(savors.momentId, momentId));
    await db.delete(keeps).where(eq(keeps.momentId, momentId));
    await db.delete(reflects).where(eq(reflects.momentId, momentId));
    await db.delete(whispers).where(eq(whispers.momentId, momentId));
    await db.delete(moments).where(eq(moments.id, momentId));
  }

  async createNote(note: InsertNote): Promise<Note> {
    // Encrypt the note text before storing
    const encryptedText = encryptMessage(note.text);
    
    const [newNote] = await db.insert(notes).values({
      ...note,
      text: encryptedText
    }).returning();
    
    // Update conversation's lastMessageAt
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, note.conversationId));
    
    // Decrypt the text before returning
    return {
      ...newNote,
      text: note.text // Return the original plain text
    };
  }

  async getNotesByConversationId(conversationId: string): Promise<Note[]> {
    const encryptedNotes = await db.select().from(notes)
      .where(eq(notes.conversationId, conversationId))
      .orderBy(notes.createdAt);
    
    // Decrypt all notes before returning
    return encryptedNotes.map(note => ({
      ...note,
      text: decryptMessage(note.text)
    }));
  }

  async getNotesByConversationIdPaginated(
    conversationId: string, 
    limit: number = 20, 
    cursor?: string
  ): Promise<{ notes: Note[]; hasMore: boolean }> {
    // Build the query - fetch notes in descending order (newest first)
    let query = db.select().from(notes)
      .where(eq(notes.conversationId, conversationId))
      .orderBy(desc(notes.createdAt))
      .limit(limit + 1); // Fetch one extra to check if there are more
    
    // If cursor is provided, only fetch notes older than the cursor
    if (cursor) {
      const result = await db.select().from(notes)
        .where(
          and(
            eq(notes.conversationId, conversationId),
            // Only get notes older than cursor (createdAt < cursor)
            sql`${notes.createdAt} < ${new Date(cursor)}`
          )
        )
        .orderBy(desc(notes.createdAt))
        .limit(limit + 1);
      
      const hasMore = result.length > limit;
      const notesToReturn = hasMore ? result.slice(0, -1) : result;
      
      // Decrypt all notes before returning
      const decryptedNotes = notesToReturn.map(note => ({
        ...note,
        text: decryptMessage(note.text)
      }));
      
      return {
        notes: decryptedNotes,
        hasMore,
      };
    }
    
    const result = await query;
    const hasMore = result.length > limit;
    const notesToReturn = hasMore ? result.slice(0, -1) : result;
    
    // Decrypt all notes before returning
    const decryptedNotes = notesToReturn.map(note => ({
      ...note,
      text: decryptMessage(note.text)
    }));
    
    return {
      notes: decryptedNotes,
      hasMore,
    };
  }

  async markNoteAsRead(noteId: string): Promise<void> {
    await db.update(notes).set({ read: true }).where(eq(notes.id, noteId));
  }

  async markConversationNotesAsRead(conversationId: string, userId: string): Promise<void> {
    // Mark all unread notes in this conversation as read where the user is NOT the sender
    await db
      .update(notes)
      .set({ read: true })
      .where(
        and(
          eq(notes.conversationId, conversationId),
          eq(notes.read, false),
          sql`${notes.senderId} != ${userId}`
        )
      );
  }

  async getUnreadNoteCount(userId: string): Promise<number> {
    // Get all conversations for the user
    const userConversations = await this.getConversationsByUserId(userId);
    const conversationIds = userConversations.map(c => c.id);
    
    if (conversationIds.length === 0) {
      return 0;
    }
    
    // Count unique conversations that have unread notes where the user is NOT the sender
    const result = await db
      .selectDistinct({ conversationId: notes.conversationId })
      .from(notes)
      .where(
        and(
          inArray(notes.conversationId, conversationIds),
          eq(notes.read, false),
          sql`${notes.senderId} != ${userId}`
        )
      );
    
    return result.length;
  }

  async getUnreadNoteCountByConversation(conversationId: string, userId: string): Promise<number> {
    // Count unread notes in this conversation where the user is NOT the sender
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notes)
      .where(
        and(
          eq(notes.conversationId, conversationId),
          eq(notes.read, false),
          sql`${notes.senderId} != ${userId}`
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

  async createReflect(reflect: { userId: string; momentId: string; text: string }): Promise<Reflect> {
    const [newReflect] = await db.insert(reflects).values(reflect).returning();
    return newReflect;
  }

  async getReflectsByMomentId(momentId: string): Promise<Array<Reflect & { user: User }>> {
    const result = await db
      .select({
        id: reflects.id,
        userId: reflects.userId,
        momentId: reflects.momentId,
        text: reflects.text,
        createdAt: reflects.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        },
      })
      .from(reflects)
      .innerJoin(users, eq(reflects.userId, users.id))
      .where(eq(reflects.momentId, momentId))
      .orderBy(reflects.createdAt);
    
    return result as Array<Reflect & { user: User }>;
  }

  async toggleSavor(userId: string, momentId: string): Promise<boolean> {
    const [existing] = await db.select().from(savors).where(
      and(eq(savors.userId, userId), eq(savors.momentId, momentId))
    );

    if (existing) {
      await db.delete(savors).where(eq(savors.id, existing.id));
      return false;
    } else {
      await db.insert(savors).values({ userId, momentId });
      return true;
    }
  }

  async getSavorsByMomentId(momentId: string): Promise<number> {
    const result = await db.select().from(savors).where(eq(savors.momentId, momentId));
    return result.length;
  }

  async isMomentSavoredByUser(userId: string, momentId: string): Promise<boolean> {
    const [existing] = await db.select().from(savors).where(
      and(eq(savors.userId, userId), eq(savors.momentId, momentId))
    );
    return !!existing;
  }

  async getUsersWhoSavoredMoment(momentId: string, currentUserId?: string): Promise<Array<User & { isFollowing: boolean }>> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        story: users.story,
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
      .where(eq(savors.momentId, momentId))
      .orderBy(desc(savors.createdAt));
    
    return result as Array<User & { isFollowing: boolean }>;
  }

  async toggleKeep(userId: string, momentId: string): Promise<boolean> {
    const [existing] = await db.select().from(keeps).where(
      and(eq(keeps.userId, userId), eq(keeps.momentId, momentId))
    );

    if (existing) {
      await db.delete(keeps).where(eq(keeps.id, existing.id));
      return false;
    } else {
      await db.insert(keeps).values({ userId, momentId });
      return true;
    }
  }

  async isMomentKeptByUser(userId: string, momentId: string): Promise<boolean> {
    const [existing] = await db.select().from(keeps).where(
      and(eq(keeps.userId, userId), eq(keeps.momentId, momentId))
    );
    return !!existing;
  }

  async getKeptMomentsByUserId(userId: string): Promise<Array<Moment & { keptAt: Date }>> {
    const keptMoments = await db
      .select({
        moment: moments,
        keptAt: keeps.createdAt,
      })
      .from(keeps)
      .innerJoin(moments, eq(keeps.momentId, moments.id))
      .where(eq(keeps.userId, userId))
      .orderBy(desc(keeps.createdAt));

    return keptMoments.map(({ moment, keptAt }) => ({
      ...moment,
      keptAt,
    }));
  }

  async createWhisper(whisper: { userId: string; type: "savor" | "reflect" | "follow"; actorId: string; momentId?: string }): Promise<Whisper> {
    const [newWhisper] = await db.insert(whispers).values(whisper).returning();
    return newWhisper;
  }

  async getWhispersByUserId(userId: string): Promise<Array<Whisper & { actor: User; moment?: Moment }>> {
    const result = await db
      .select({
        id: whispers.id,
        userId: whispers.userId,
        type: whispers.type,
        actorId: whispers.actorId,
        momentId: whispers.momentId,
        read: whispers.read,
        createdAt: whispers.createdAt,
        actor: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        },
        moment: {
          id: moments.id,
          userId: moments.userId,
          type: moments.type,
          mediaUrl: moments.mediaUrl,
          caption: moments.caption,
          createdAt: moments.createdAt,
        },
      })
      .from(whispers)
      .innerJoin(users, eq(whispers.actorId, users.id))
      .leftJoin(moments, eq(whispers.momentId, moments.id))
      .where(eq(whispers.userId, userId))
      .orderBy(desc(whispers.createdAt));
    
    return result as Array<Whisper & { actor: User; moment?: Moment }>;
  }

  async markWhisperAsRead(whisperId: string): Promise<void> {
    await db.update(whispers).set({ read: true }).where(eq(whispers.id, whisperId));
  }

  async markAllWhispersAsRead(userId: string): Promise<void> {
    await db.update(whispers).set({ read: true }).where(eq(whispers.userId, userId));
  }

  async getUnreadWhisperCount(userId: string): Promise<number> {
    const result = await db.select().from(whispers).where(
      and(eq(whispers.userId, userId), eq(whispers.read, false))
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
        story: users.story,
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
        story: users.story,
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
