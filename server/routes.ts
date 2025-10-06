import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./replitAuth";
import multer from "multer";
import { insertPostSchema, insertMessageSchema, updateUserProfileSchema, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for videos
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, MOV, AVI, WebM videos are allowed.'));
    }
  },
});


interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Posts API with author details and counts
  app.get("/api/posts-with-authors", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const now = Date.now();
      
      // Get list of users that current user follows
      const followedUserIds = await storage.getFollowedUserIds(currentUserId);
      
      const posts = await storage.getPosts();
      
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
          const likesCount = await storage.getLikesByPostId(post.id);
          const comments = await storage.getCommentsByPostId(post.id);
          
          return {
            ...post,
            user,
            _count: {
              likes: likesCount,
              comments: comments.length,
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
      const paginatedPosts = shuffled.slice(offset, offset + limit);
      const hasMore = offset + limit < shuffled.length;
      
      res.json({ posts: paginatedPosts, hasMore });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Explore posts API - posts from users you don't follow
  app.get("/api/explore-posts", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const now = Date.now();
      
      const followedUserIds = await storage.getFollowedUserIds(currentUserId);
      
      const posts = await storage.getPosts();
      
      const explorePosts = posts.filter(
        post => !followedUserIds.includes(post.userId) && post.userId !== currentUserId
      );
      
      const postsWithAuthors = await Promise.all(
        explorePosts.map(async (post) => {
          const user = await storage.getUser(post.userId);
          const likesCount = await storage.getLikesByPostId(post.id);
          const comments = await storage.getCommentsByPostId(post.id);
          
          return {
            ...post,
            user,
            _count: {
              likes: likesCount,
              comments: comments.length,
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
      
      const paginatedPosts = shuffled.slice(offset, offset + limit);
      const hasMore = offset + limit < shuffled.length;
      
      res.json({ posts: paginatedPosts, hasMore });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch explore posts" });
    }
  });

  // Posts API
  app.get("/api/posts", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", isAuthenticated, upload.single("media"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mediaUrl = req.file ? `/uploads/${req.file.filename}` : req.body.mediaUrl;
      const postData = insertPostSchema.parse({
        userId,
        type: req.body.type,
        mediaUrl,
        caption: req.body.caption,
      });
      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      res.status(400).json({ error: "Invalid post data" });
    }
  });

  app.post("/api/users/:userId/profile-picture", isAuthenticated, (req: any, res, next) => {
    upload.single("profilePicture")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 5MB" });
        }
        return res.status(400).json({ error: "File upload error" });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestedUserId = req.params.userId;
      
      // Ensure user can only update their own profile picture
      if (userId !== requestedUserId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const profileImageUrl = `/uploads/${req.file.filename}`;
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update user with both avatar and profileImageUrl
      await storage.upsertUser({
        id: userId,
        email: existingUser.email,
        avatar: profileImageUrl,
        profileImageUrl: profileImageUrl,
      });
      
      res.json({ profileImageUrl });
    } catch (error) {
      console.error("Profile picture upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload profile picture";
      res.status(400).json({ error: errorMessage });
    }
  });

  app.get("/api/posts/:postId", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getPosts();
      const post = posts.find(p => p.id === req.params.postId);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      const user = await storage.getUser(post.userId);
      const likesCount = await storage.getLikesByPostId(post.id);
      const comments = await storage.getCommentsByPostId(post.id);
      
      res.json({
        ...post,
        user,
        _count: {
          likes: likesCount,
          comments: comments.length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.delete("/api/posts/:postId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = req.params.postId;
      
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      if (post.userId !== userId) {
        return res.status(403).json({ error: "You can only delete your own posts" });
      }
      
      await storage.deletePost(postId);
      
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
      res.json(users);
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
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
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
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/posts/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getPostsByUserId(req.params.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  });

  // Follow API
  app.post("/api/users/:userId/follow", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      
      if (currentUserId === targetUserId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }
      
      const isFollowing = await storage.toggleFollow(currentUserId, targetUserId);
      res.json({ following: isFollowing });
    } catch (error) {
      console.error("Error toggling follow:", error);
      res.status(500).json({ error: "Failed to toggle follow" });
    }
  });

  app.get("/api/users/:userId/is-following", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
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

  app.get("/api/users/:userId/followers", isAuthenticated, async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.params.userId);
      res.json(followers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  app.get("/api/users/:userId/following", isAuthenticated, async (req, res) => {
    try {
      const following = await storage.getFollowing(req.params.userId);
      res.json(following);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  // Likes API
  app.post("/api/posts/:postId/like", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const liked = await storage.toggleLike(userId, req.params.postId);
      
      // Create notification if liked (not if unliked)
      if (liked) {
        const post = await storage.getPost(req.params.postId);
        
        // Only create notification if it's not the post owner liking their own post
        if (post && post.userId !== userId) {
          await storage.createNotification({
            userId: post.userId,
            type: "like",
            actorId: userId,
            postId: req.params.postId,
          });
        }
      }
      
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  app.get("/api/posts/:postId/likes", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getLikesByPostId(req.params.postId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  app.get("/api/posts/:postId/liked", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const liked = await storage.isPostLikedByUser(userId, req.params.postId);
      // Disable HTTP caching for like status
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Saves API
  app.post("/api/posts/:postId/save", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const saved = await storage.toggleSave(userId, req.params.postId);
      res.json({ saved });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle save" });
    }
  });

  app.get("/api/posts/:postId/saved", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const saved = await storage.isPostSavedByUser(userId, req.params.postId);
      // Disable HTTP caching for save status
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ saved });
    } catch (error) {
      res.status(500).json({ error: "Failed to check save status" });
    }
  });

  app.get("/api/saved-posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedPosts = await storage.getSavedPostsByUserId(userId);
      res.json(savedPosts);
    } catch (error) {
      console.error("Failed to fetch saved posts:", error);
      res.status(500).json({ error: "Failed to fetch saved posts" });
    }
  });

  // Comments API
  app.post("/api/posts/:postId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const comment = await storage.createComment({
        userId,
        postId: req.params.postId,
        text: req.body.text,
      });
      
      // Create notification for comment
      const post = await storage.getPost(req.params.postId);
      
      // Only create notification if it's not the post owner commenting on their own post
      if (post && post.userId !== userId) {
        await storage.createNotification({
          userId: post.userId,
          type: "comment",
          actorId: userId,
          postId: req.params.postId,
        });
      }
      
      res.json(comment);
    } catch (error) {
      res.status(400).json({ error: "Failed to create comment" });
    }
  });

  app.get("/api/posts/:postId/comments", isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getCommentsByPostId(req.params.postId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Notifications API
  app.get("/api/notifications/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/:userId/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/:notificationId/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/:userId/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Get unread message count for user
  app.get("/api/messages/:userId/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread message count" });
    }
  });

  // Conversations API with user details and last message
  app.get("/api/conversations-with-details/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUserId(userId);
      
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
          const otherUser = await storage.getUser(otherUserId);
          const messages = await storage.getMessagesByConversationId(conv.id);
          const lastMessage = messages[messages.length - 1];
          const unreadCount = await storage.getUnreadMessageCountByConversation(conv.id, userId);
          
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
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const conversationId = req.params.conversationId;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string | undefined;
      
      // Get the conversation to verify the user is a participant
      const conversations = await storage.getConversationsByUserId(userId);
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        return res.status(403).json({ error: "Access denied to this conversation" });
      }
      
      const result = await storage.getMessagesByConversationIdPaginated(conversationId, limit, cursor);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
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
      
      if (!req.user || !req.user.claims) {
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
    const userId = request.user.claims.sub;
    
    if (!userId) {
      ws.close();
      return;
    }

    clients.set(userId, ws);
    ws.send(JSON.stringify({ type: 'auth', success: true }));

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'message') {
          // Validate message payload
          if (!message.conversationId || !message.text || typeof message.text !== 'string') {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
            }));
            return;
          }
          
          // Validate text length
          if (message.text.length > 10000) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Message too long',
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
          
          const newMessage = await storage.createMessage({
            conversationId: message.conversationId,
            senderId: userId,
            text: message.text,
          });
          
          const recipientWs = clients.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'message',
              message: newMessage,
            }));
          }

          // Confirm to sender
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'message',
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
