import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./replitAuth";
import multer from "multer";
import { insertPostSchema, insertMessageSchema } from "@shared/schema";

const upload = multer({ dest: "uploads/" });

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
      const posts = await storage.getPosts();
      
      // Filter out current user's posts
      const otherUsersPosts = posts.filter(post => post.userId !== currentUserId);
      
      const postsWithAuthors = await Promise.all(
        otherUsersPosts.map(async (post) => {
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
      
      res.json(postsWithAuthors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
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

  app.get("/api/posts/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getPostsByUserId(req.params.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user posts" });
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
          
          return {
            conversation: conv,
            otherUser,
            lastMessage,
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

  // Messages API
  app.get("/api/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.conversationId;
      
      // Get the conversation to verify the user is a participant
      const conversations = await storage.getConversationsByUserId(userId);
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        return res.status(403).json({ error: "Access denied to this conversation" });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
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
      if (!request.user || !(request as any).user.claims) {
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
          const newMessage = await storage.createMessage({
            conversationId: message.conversationId,
            senderId: userId,
            text: message.text,
          });

          // Send to recipient if they're online
          const conversation = await storage.getOrCreateConversation(
            message.recipientId,
            userId
          );
          
          const recipientWs = clients.get(message.recipientId);
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
