// Local email/password authentication module
// This works alongside Replit Auth to provide dual authentication options
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express } from "express";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// Sanitize user object to remove sensitive fields
// CRITICAL: Always use this before sending user data to clients or storing in session
export function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// Hash password using scrypt
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare password with stored hash, also supports plaintext stored passwords
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored.includes(".")) {
    return supplied === stored;
  }
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate a random zen-themed username
function generateRandomUsername(): string {
  const adjectives = ["tranquil", "serene", "peaceful", "mindful", "gentle", "calm", "quiet", "still", "flowing", "centered"];
  const nouns = ["breeze", "lotus", "stream", "cloud", "moon", "stone", "meadow", "sunrise", "forest", "ocean"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}_${noun}${num}`;
}

// Generate a random zen-themed display name
function generateRandomDisplayName(): string {
  const adjectives = ["Mindful", "Peaceful", "Serene", "Tranquil", "Gentle", "Calm", "Flowing", "Centered"];
  const nouns = ["Spirit", "Soul", "Heart", "Being", "Wanderer", "Dreamer", "Seeker", "Guide"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

// Setup local authentication strategy
export function setupLocalAuth(app: Express) {
  // Configure passport-local strategy
  // Use email as the username field for consistency
  passport.use('local', new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password) {
          return done(null, false, { message: "Invalid email or password" });
        }
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Local signup endpoint
  app.post("/api/local/signup", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, acceptedTerms } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Validate terms acceptance
      if (!acceptedTerms) {
        return res.status(400).json({ error: "You must accept the Terms of Service and Privacy Policy" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate random username and display name if not provided
      const username = generateRandomUsername();
      const displayName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : generateRandomDisplayName();

      // Create user with policy acceptance timestamp
      const user = await storage.createLocalUser({
        email,
        password: hashedPassword,
        username,
        displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        policiesAcceptedAt: new Date(),
      });

      // Remove password hash before storing in session and sending to client
      const sanitizedUser = sanitizeUser(user);

      // Log the user in with sanitized user object
      req.login(sanitizedUser, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitizedUser);
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Local login endpoint
  app.post("/api/local/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      
      // Remove password hash before storing in session and sending to client
      const sanitizedUser = sanitizeUser(user);
      
      req.login(sanitizedUser, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }
        return res.status(200).json(sanitizedUser);
      });
    })(req, res, next);
  });
}
