import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import multer from "multer";
import { insertPostSchema, insertMessageSchema } from "@shared/schema";

const upload = multer({ dest: "uploads/" });

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Posts API with author details and counts
  app.get("/api/posts-with-authors", async (req, res) => {
    try {
      const currentUserId = "ca1a588a-2f07-4b75-ad8a-2ac21444840e";
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
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", upload.single("media"), async (req: MulterRequest, res) => {
    try {
      const mediaUrl = req.file ? `/uploads/${req.file.filename}` : req.body.mediaUrl;
      const postData = insertPostSchema.parse({
        userId: req.body.userId,
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

  app.get("/api/posts/:postId", async (req, res) => {
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

  app.get("/api/users/search", async (req, res) => {
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

  app.get("/api/users/:userId", async (req, res) => {
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

  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const posts = await storage.getPostsByUserId(req.params.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  });

  // Likes API
  app.post("/api/posts/:postId/like", async (req, res) => {
    try {
      const liked = await storage.toggleLike(req.body.userId, req.params.postId);
      
      // Create notification if liked (not if unliked)
      if (liked) {
        const posts = await storage.getPosts();
        const post = posts.find(p => p.id === req.params.postId);
        
        // Only create notification if it's not the post owner liking their own post
        if (post && post.userId !== req.body.userId) {
          await storage.createNotification({
            userId: post.userId,
            type: "like",
            actorId: req.body.userId,
            postId: req.params.postId,
          });
        }
      }
      
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  app.get("/api/posts/:postId/likes", async (req, res) => {
    try {
      const count = await storage.getLikesByPostId(req.params.postId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  app.get("/api/posts/:postId/liked", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
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
  app.post("/api/posts/:postId/save", async (req, res) => {
    try {
      const saved = await storage.toggleSave(req.body.userId, req.params.postId);
      res.json({ saved });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle save" });
    }
  });

  app.get("/api/posts/:postId/saved", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
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
  app.post("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comment = await storage.createComment({
        userId: req.body.userId,
        postId: req.params.postId,
        text: req.body.text,
      });
      
      // Create notification for comment
      const posts = await storage.getPosts();
      const post = posts.find(p => p.id === req.params.postId);
      
      // Only create notification if it's not the post owner commenting on their own post
      if (post && post.userId !== req.body.userId) {
        await storage.createNotification({
          userId: post.userId,
          type: "comment",
          actorId: req.body.userId,
          postId: req.params.postId,
        });
      }
      
      res.json(comment);
    } catch (error) {
      res.status(400).json({ error: "Failed to create comment" });
    }
  });

  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPostId(req.params.postId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Notifications API
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.params.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/:userId/unread-count", async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.params.userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/:userId/read-all", async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Conversations API with user details and last message
  app.get("/api/conversations-with-details/:userId", async (req, res) => {
    try {
      const conversations = await storage.getConversationsByUserId(req.params.userId);
      
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          const otherUserId = conv.user1Id === req.params.userId ? conv.user2Id : conv.user1Id;
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

  app.get("/api/conversations/:userId", async (req, res) => {
    try {
      const conversations = await storage.getConversationsByUserId(req.params.userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const conversation = await storage.getOrCreateConversation(
        req.body.user1Id,
        req.body.user2Id
      );
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  // Messages API
  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversationId(req.params.conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients with their user IDs
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          userId = message.userId;
          if (userId) {
            clients.set(userId, ws);
          }
          ws.send(JSON.stringify({ type: 'auth', success: true }));
        } else if (message.type === 'message' && userId) {
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
