import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./replitAuth";
import { setupLocalAuth, sanitizeUser } from "./localAuth";
import { insertMomentSchema, insertNoteSchema, updateUserProfileSchema, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { containsProfanity, getProfanityError } from "./profanity-filter";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { moderateContent, generateGentleFeedback, analyzeImageContent } from "./moderation";

// Helper function to extract user ID from both Replit Auth and local auth
function getUserId(req: any): string {
  // Local auth: user object stored directly in req.user with id property
  if (req.user && req.user.id && !req.user.claims) {
    return req.user.id;
  }
  // Replit Auth: user data in req.user.claims.sub
  if (req.user && req.user.claims && req.user.claims.sub) {
    return req.user.claims.sub;
  }
  throw new Error("User ID not found in request");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication - both Replit Auth and local email/password auth
  await setupAuth(app);
  setupLocalAuth(app);

  // Auth endpoint - works with both Replit Auth and local auth
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Handle local auth (user object is stored directly in req.user)
      if (req.user && req.user.id && !req.user.claims) {
        return res.json(sanitizeUser(req.user));
      }

      // Handle Replit Auth (user data is in req.user.claims)
      if (req.user && req.user.claims) {
        const userId = getUserId(req);
        const user = await storage.getUser(userId);
        return res.json(sanitizeUser(user));
      }

      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Cloud Storage Routes - Referenced from blueprint:javascript_object_storage
  
  // Endpoint for serving uploaded files with ACL checking
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint for getting upload URL
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Endpoint for setting profile picture ACL after upload
  app.put("/api/profile-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.profileImageURL) {
      return res.status(400).json({ error: "profileImageURL is required" });
    }

    const userId = getUserId(req);
    const uploadURL = req.body.profileImageURL;

    try {
      // Parse and validate the URL structure
      let parsedURL: URL;
      try {
        parsedURL = new URL(uploadURL);
      } catch {
        return res.status(400).json({ error: "Invalid upload URL format" });
      }

      // Validate hostname is Google Cloud Storage
      if (!parsedURL.hostname.includes('storage.googleapis.com')) {
        return res.status(400).json({ error: "Invalid upload URL - must be from Google Cloud Storage" });
      }

      // Validate bucket name matches exactly
      const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketName) {
        return res.status(500).json({ error: "Server configuration error" });
      }

      const pathParts = parsedURL.pathname.split('/').filter(p => p);
      if (pathParts.length < 1 || pathParts[0] !== bucketName) {
        return res.status(400).json({ error: "Invalid upload URL - incorrect bucket" });
      }

      // Validate that the object is in the private directory
      // Extract just the directory name from the full path (e.g., ".private" from "/bucket/.private")
      const privateDirPath = process.env.PRIVATE_OBJECT_DIR || ".private";
      const privateDir = privateDirPath.split('/').filter(p => p).pop() || ".private";
      if (pathParts.length < 2 || pathParts[1] !== privateDir) {
        return res.status(400).json({ error: "Invalid upload URL - must be from private directory" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Check existing ACL to ensure object has no owner or is owned by current user
      if (normalizedPath.startsWith("/objects/")) {
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        
        // Get existing ACL policy
        const { getObjectAclPolicy } = await import("./objectAcl");
        const existingAcl = await getObjectAclPolicy(objectFile);
        
        // If object has an owner and it's not the current user, reject
        if (existingAcl && existingAcl.owner && existingAcl.owner !== userId) {
          return res.status(403).json({ error: "Cannot modify object owned by another user" });
        }
      }

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: userId,
          visibility: "public", // Profile images are public
        },
      );

      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user with new profile image
      await storage.upsertUser({
        id: userId,
        email: existingUser.email,
        avatar: objectPath,
        profileImageUrl: objectPath,
      });

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint for setting post media ACL after upload
  app.put("/api/post-media", isAuthenticated, async (req: any, res) => {
    if (!req.body.mediaURL) {
      return res.status(400).json({ error: "mediaURL is required" });
    }

    const userId = getUserId(req);
    const uploadURL = req.body.mediaURL;

    try {
      // Parse and validate the URL structure
      let parsedURL: URL;
      try {
        parsedURL = new URL(uploadURL);
      } catch {
        return res.status(400).json({ error: "Invalid upload URL format" });
      }

      // Validate hostname is Google Cloud Storage
      if (!parsedURL.hostname.includes('storage.googleapis.com')) {
        return res.status(400).json({ error: "Invalid upload URL - must be from Google Cloud Storage" });
      }

      // Validate bucket name matches exactly
      const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketName) {
        return res.status(500).json({ error: "Server configuration error" });
      }

      const pathParts = parsedURL.pathname.split('/').filter(p => p);
      if (pathParts.length < 1 || pathParts[0] !== bucketName) {
        return res.status(400).json({ error: "Invalid upload URL - incorrect bucket" });
      }

      // Validate that the object is in the private directory
      // Extract just the directory name from the full path (e.g., ".private" from "/bucket/.private")
      const privateDirPath = process.env.PRIVATE_OBJECT_DIR || ".private";
      const privateDir = privateDirPath.split('/').filter(p => p).pop() || ".private";
      if (pathParts.length < 2 || pathParts[1] !== privateDir) {
        return res.status(400).json({ error: "Invalid upload URL - must be from private directory" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Check existing ACL to ensure object has no owner or is owned by current user
      if (normalizedPath.startsWith("/objects/")) {
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        
        // Get existing ACL policy
        const { getObjectAclPolicy } = await import("./objectAcl");
        const existingAcl = await getObjectAclPolicy(objectFile);
        
        // If object has an owner and it's not the current user, reject
        if (existingAcl && existingAcl.owner && existingAcl.owner !== userId) {
          return res.status(403).json({ error: "Cannot modify object owned by another user" });
        }
      }

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: userId,
          visibility: "public", // Post media is public
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting post media:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Posts API with author details and counts
  app.get("/api/moments-with-authors", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const now = Date.now();
      
      // Get list of users that current user follows
      const followedUserIds = await storage.getFollowedUserIds(currentUserId);
      
      const posts = await storage.getMoments();
      
      // Filter posts to only show those from followed users
      let followedUsersPosts = posts.filter(post => followedUserIds.includes(post.userId));
      
      // If feed is empty (not following anyone or no posts from followed users), 
      // show random posts from unfollowed users
      if (followedUsersPosts.length === 0) {
        followedUsersPosts = posts.filter(
          post => !followedUserIds.includes(post.userId) && post.userId !== currentUserId
        );
      }
      
      const postsWithAuthors = await Promise.all(
        followedUsersPosts.map(async (post) => {
          const user = await storage.getUser(post.userId);
          const savorsCount = await storage.getSavorsByMomentId(post.id);
          const reflects = await storage.getReflectsByMomentId(post.id);
          
          return {
            ...post,
            user: sanitizeUser(user),
            _count: {
              savors: savorsCount,
              reflects: reflects.length,
            },
          };
        })
      );
      
      // Weighted randomization favoring recent posts
      const postsWithWeights = postsWithAuthors.map(post => {
        const ageInHours = (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
        // Exponential decay: newer posts get higher weights
        // Posts less than 1 hour old get weight ~1.0, 24 hours old get ~0.37, 48 hours get ~0.14
        const weight = Math.exp(-ageInHours / 24);
        return { post, weight };
      });
      
      // Weighted shuffle algorithm
      const shuffled = [];
      const items = [...postsWithWeights];
      
      while (items.length > 0) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selectedIndex = 0;
        for (let i = 0; i < items.length; i++) {
          random -= items[i].weight;
          if (random <= 0) {
            selectedIndex = i;
            break;
          }
        }
        
        shuffled.push(items[selectedIndex].post);
        items.splice(selectedIndex, 1);
      }
      
      // Apply pagination
      const paginatedMoments = shuffled.slice(offset, offset + limit);
      const hasMore = offset + limit < shuffled.length;
      
      res.json({ moments: paginatedMoments, hasMore });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Explore posts API - posts from users you don't follow
  app.get("/api/explore-posts", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const now = Date.now();
      
      const followedUserIds = await storage.getFollowedUserIds(currentUserId);
      
      const posts = await storage.getMoments();
      
      const explorePosts = posts.filter(
        post => !followedUserIds.includes(post.userId) && post.userId !== currentUserId
      );
      
      const postsWithAuthors = await Promise.all(
        explorePosts.map(async (post) => {
          const user = await storage.getUser(post.userId);
          const savorsCount = await storage.getSavorsByMomentId(post.id);
          const reflects = await storage.getReflectsByMomentId(post.id);
          
          return {
            ...post,
            user: sanitizeUser(user),
            _count: {
              savors: savorsCount,
              reflects: reflects.length,
            },
          };
        })
      );
      
      const postsWithWeights = postsWithAuthors.map(post => {
        const ageInHours = (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
        const weight = Math.exp(-ageInHours / 24);
        return { post, weight };
      });
      
      const shuffled = [];
      const items = [...postsWithWeights];
      
      while (items.length > 0) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selectedIndex = 0;
        for (let i = 0; i < items.length; i++) {
          random -= items[i].weight;
          if (random <= 0) {
            selectedIndex = i;
            break;
          }
        }
        
        shuffled.push(items[selectedIndex].post);
        items.splice(selectedIndex, 1);
      }
      
      const paginatedMoments = shuffled.slice(offset, offset + limit);
      const hasMore = offset + limit < shuffled.length;
      
      res.json({ moments: paginatedMoments, hasMore });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch explore posts" });
    }
  });

  // Content Moderation API
  app.post("/api/moderate", isAuthenticated, async (req: any, res) => {
    try {
      const { caption, type, mediaDescription } = req.body;
      
      const result = await moderateContent(
        caption || null,
        type || "image",
        mediaDescription
      );
      
      res.json({
        ...result,
        message: generateGentleFeedback(result)
      });
    } catch (error) {
      console.error("Moderation error:", error);
      res.status(500).json({ 
        error: "Failed to moderate content",
        approved: true // Fail open to not block users
      });
    }
  });

  // Posts API
  app.get("/api/moments", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getMoments();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/moments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const postData = insertMomentSchema.parse({
        userId,
        type: req.body.type,
        mediaUrl: req.body.mediaUrl,
        caption: req.body.caption,
      });

      // Analyze visual content for images
      let mediaDescription = req.body.mediaDescription;
      if (postData.type === "image" && postData.mediaUrl) {
        try {
          // Analyze the image content directly from object storage
          mediaDescription = await analyzeImageContent(postData.mediaUrl);
        } catch (error) {
          console.error("[VISUAL MODERATION] Failed to analyze image:", error);
          // Continue with text-only moderation if image analysis fails
        }
      }

      // Check moderation before creating the moment
      const moderationResult = await moderateContent(
        postData.caption || null,
        postData.type as "image" | "video",
        mediaDescription
      );

      if (!moderationResult.approved) {
        return res.status(400).json({ 
          error: generateGentleFeedback(moderationResult)
        });
      }

      const post = await storage.createMoment(postData);
      res.json(post);
    } catch (error) {
      console.error("Error creating moment:", error);
      res.status(400).json({ error: "Invalid post data" });
    }
  });


  app.get("/api/moments/:momentId", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getMoments();
      const post = posts.find(p => p.id === req.params.momentId);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      const user = await storage.getUser(post.userId);
      const savorsCount = await storage.getSavorsByMomentId(post.id);
      const reflects = await storage.getReflectsByMomentId(post.id);
      
      res.json({
        ...post,
        user: sanitizeUser(user),
        _count: {
          savors: savorsCount,
          reflects: reflects.length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.delete("/api/moments/:momentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const postId = req.params.momentId;
      
      const post = await storage.getMoment(postId);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      if (post.userId !== userId) {
        return res.status(403).json({ error: "You can only delete your own posts" });
      }
      
      await storage.deleteMoment(postId);
      
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  app.get("/api/users/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }
      const users = await storage.searchUsers(query.trim());
      res.json(users.map(sanitizeUser));
    } catch (error) {
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  app.get("/api/users/:userId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const targetUserId = req.params.userId;
      
      // Only allow users to update their own profile
      if (currentUserId !== targetUserId) {
        return res.status(403).json({ error: "Not authorized to update this profile" });
      }
      
      const updateData = updateUserProfileSchema.parse(req.body);
      
      // Check if username is being changed and if it's already taken
      if (updateData.username) {
        const trimmedUsername = updateData.username.trim();
        
        // Reject empty username
        if (trimmedUsername.length === 0) {
          return res.status(400).json({ error: "Username cannot be empty" });
        }
        
        const existingUser = await storage.getUserByUsername(trimmedUsername);
        if (existingUser && existingUser.id !== currentUserId) {
          return res.status(400).json({ error: "Username already taken" });
        }
        
        updateData.username = trimmedUsername;
      }
      
      const updatedUser = await storage.upsertUser({
        id: currentUserId,
        ...updateData,
      });
      
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/moments/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getMomentsByUserId(req.params.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  });

  // Follow API
  app.post("/api/users/:userId/follow", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const targetUserId = req.params.userId;
      
      if (currentUserId === targetUserId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }
      
      const isFollowing = await storage.toggleFollow(currentUserId, targetUserId);
      
      if (isFollowing) {
        await storage.createWhisper({
          userId: targetUserId,
          type: "follow",
          actorId: currentUserId,
        });
      }
      
      res.json({ following: isFollowing });
    } catch (error) {
      console.error("Error toggling follow:", error);
      res.status(500).json({ error: "Failed to toggle follow" });
    }
  });

  app.get("/api/users/:userId/is-following", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const targetUserId = req.params.userId;
      const isFollowing = await storage.isFollowing(currentUserId, targetUserId);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ following: isFollowing });
    } catch (error) {
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  app.get("/api/users/:userId/followers", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const followers = await storage.getFollowers(req.params.userId, currentUserId);
      res.json(followers.map(sanitizeUser));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  app.get("/api/users/:userId/following", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const following = await storage.getFollowing(req.params.userId, currentUserId);
      res.json(following.map(sanitizeUser));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  // Savors API
  app.post("/api/moments/:momentId/savor", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const savored = await storage.toggleSavor(userId, req.params.momentId);
      
      // Create notification if savored (not if unsavored)
      if (savored) {
        const post = await storage.getMoment(req.params.momentId);
        
        // Only create notification if it's not the post owner savoring their own post
        if (post && post.userId !== userId) {
          await storage.createWhisper({
            userId: post.userId,
            type: "savor",
            actorId: userId,
            momentId: req.params.momentId,
          });
        }
      }
      
      res.json({ savored });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle savor" });
    }
  });

  app.get("/api/moments/:momentId/savors", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getSavorsByMomentId(req.params.momentId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch savors" });
    }
  });

  app.get("/api/moments/:momentId/savored", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const savored = await storage.isMomentSavoredByUser(userId, req.params.momentId);
      // Disable HTTP caching for savor status
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ savored });
    } catch (error) {
      res.status(500).json({ error: "Failed to check savor status" });
    }
  });

  app.get("/api/moments/:momentId/savorers", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const users = await storage.getUsersWhoSavoredMoment(req.params.momentId, currentUserId);
      res.json(users.map(sanitizeUser));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users who savored post" });
    }
  });

  // Keeps API
  app.post("/api/moments/:momentId/keep", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const kept = await storage.toggleKeep(userId, req.params.momentId);
      res.json({ kept });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle keep" });
    }
  });

  app.get("/api/moments/:momentId/kept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const kept = await storage.isMomentKeptByUser(userId, req.params.momentId);
      // Disable HTTP caching for keep status
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ kept });
    } catch (error) {
      res.status(500).json({ error: "Failed to check keep status" });
    }
  });

  app.get("/api/keeps", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const keptMoments = await storage.getKeptMomentsByUserId(userId);
      res.json(keptMoments);
    } catch (error) {
      console.error("Failed to fetch kept moments:", error);
      res.status(500).json({ error: "Failed to fetch kept moments" });
    }
  });

  // Reflects API
  app.post("/api/moments/:momentId/reflects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const reflectText = req.body.text;
      
      // Validate reflect text is not empty
      if (!reflectText || typeof reflectText !== 'string' || reflectText.trim().length === 0) {
        return res.status(400).json({ error: "Reflection cannot be empty" });
      }
      
      // Check for profanity
      if (containsProfanity(reflectText)) {
        return res.status(400).json({ error: getProfanityError() });
      }
      
      const reflect = await storage.createReflect({
        userId,
        momentId: req.params.momentId,
        text: reflectText,
      });
      
      // Create notification for reflect
      const post = await storage.getMoment(req.params.momentId);
      
      // Only create notification if it's not the moment owner reflecting on their own moment
      if (post && post.userId !== userId) {
        await storage.createWhisper({
          userId: post.userId,
          type: "reflect",
          actorId: userId,
          momentId: req.params.momentId,
        });
      }
      
      res.json(reflect);
    } catch (error) {
      res.status(400).json({ error: "Failed to create reflection" });
    }
  });

  app.get("/api/moments/:momentId/reflects", isAuthenticated, async (req, res) => {
    try {
      const reflects = await storage.getReflectsByMomentId(req.params.momentId);
      // Sanitize nested user objects
      const sanitizedReflects = reflects.map(reflect => ({
        ...reflect,
        user: sanitizeUser(reflect.user),
      }));
      res.json(sanitizedReflects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reflections" });
    }
  });

  // Notifications API
  app.get("/api/whispers/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const notifications = await storage.getWhispersByUserId(userId);
      // Sanitize nested user (actor) objects
      const sanitizedNotifications = notifications.map(notification => ({
        ...notification,
        actor: sanitizeUser(notification.actor),
      }));
      res.json(sanitizedNotifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/whispers/:userId/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const count = await storage.getUnreadWhisperCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.post("/api/whispers/:whisperId/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markWhisperAsRead(req.params.notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/whispers/:userId/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      await storage.markAllWhispersAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Get unread message count for user
  app.get("/api/notes/:userId/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const count = await storage.getUnreadNoteCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread message count" });
    }
  });

  // Conversations API with user details and last message
  app.get("/api/conversations-with-details/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const conversations = await storage.getConversationsByUserId(userId);
      
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
          const otherUser = await storage.getUser(otherUserId);
          const messages = await storage.getNotesByConversationId(conv.id);
          const lastMessage = messages[messages.length - 1];
          const unreadCount = await storage.getUnreadNoteCountByConversation(conv.id, userId);
          
          return {
            conversation: conv,
            otherUser,
            lastMessage,
            unreadCount,
          };
        })
      );
      
      res.json(conversationsWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const otherUserId = req.body.otherUserId;
      
      if (!otherUserId) {
        return res.status(400).json({ error: "Other user ID is required" });
      }
      
      const conversation = await storage.getOrCreateConversation(
        userId,
        otherUserId
      );
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  // Messages API with pagination
  app.get("/api/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const conversationId = req.params.conversationId;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string | undefined;
      
      // Get the conversation to verify the user is a participant
      const conversations = await storage.getConversationsByUserId(userId);
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        return res.status(403).json({ error: "Access denied to this conversation" });
      }
      
      const result = await storage.getNotesByConversationIdPaginated(conversationId, limit, cursor);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:conversationId/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const conversationId = req.params.conversationId;
      
      // Get the conversation to verify the user is a participant
      const conversations = await storage.getConversationsByUserId(userId);
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        return res.status(403).json({ error: "Access denied to this conversation" });
      }
      
      await storage.markConversationNotesAsRead(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ noServer: true });

  // Store connected clients with their user IDs
  const clients = new Map<string, WebSocket>();

  // Handle WebSocket upgrade with session authentication
  httpServer.on('upgrade', (request, socket, head) => {
    // Only handle WebSocket upgrades on /ws path
    if (request.url !== '/ws') {
      socket.destroy();
      return;
    }

    const sessionParser = getSession();
    
    sessionParser(request as any, {} as any, () => {
      const req = request as any;
      
      // Manually deserialize user from session (passport middleware doesn't run on upgrade)
      if (req.session && req.session.passport && req.session.passport.user) {
        req.user = req.session.passport.user;
      }
      
      // Check if user is authenticated (works for both Replit Auth and local auth)
      if (!req.user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
  });

  wss.on('connection', (ws: WebSocket, request: any) => {
    // Extract user ID from both auth types
    let userId: string;
    try {
      userId = getUserId(request);
    } catch (error) {
      console.error('WebSocket connection failed: Unable to get user ID', error);
      ws.close();
      return;
    }
    
    if (!userId) {
      ws.close();
      return;
    }

    clients.set(userId, ws);
    ws.send(JSON.stringify({ type: 'auth', success: true }));

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'note') {
          // Validate note payload
          if (!message.conversationId || !message.text || typeof message.text !== 'string') {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid note format',
            }));
            return;
          }
          
          // Validate text length
          if (message.text.length > 10000) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Note too long',
            }));
            return;
          }
          
          // Validate that the conversation exists and user is a participant
          const conversations = await storage.getConversationsByUserId(userId);
          const conversation = conversations.find(c => c.id === message.conversationId);
          
          if (!conversation) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Access denied to this conversation',
            }));
            return;
          }
          
          // Derive recipient from conversation (don't trust client-supplied recipientId)
          const recipientId = conversation.user1Id === userId 
            ? conversation.user2Id 
            : conversation.user1Id;
          
          const newMessage = await storage.createNote({
            conversationId: message.conversationId,
            senderId: userId,
            text: message.text,
          });
          
          const recipientWs = clients.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'note',
              message: newMessage,
            }));
          }

          // Confirm to sender
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'note',
              message: newMessage,
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
  });

  return httpServer;
}
