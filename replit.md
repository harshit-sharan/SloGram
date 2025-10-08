# Slogram - Slow Living Social Platform

## Overview

Slogram is a mindfulness-focused social media platform inspired by Instagram's interface but adapted for slow living and intentional content sharing. The application uses contemplative terminology throughout: moments (posts), savors (likes), reflects (comments), whispers (notifications), keeps (saves), flow (feed), space (profile), wander (explore), story (bio), and notes (messages). Users share photos and videos with captions, engage through savors and reflects, and connect via direct notes. The platform emphasizes calm minimalism with a zen-like aesthetic featuring sage green accents and generous whitespace.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query for server state management and data fetching
- Tailwind CSS for utility-first styling

**UI Component System:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library (New York style variant)
- Custom design system based on Instagram's clean interface with slow living adaptations
- Theme provider supporting light/dark modes with CSS custom properties

**Design Philosophy:**
- Reference-based approach using Instagram's image-first layout
- Calm minimalism with generous whitespace
- Zen-like color palette (sage green accent: 160 45% 45%)
- Typography: Inter for body text, Libre Baskerville for display/headers
- Content-over-chrome philosophy letting posts breathe
- Mobile-first responsive design:
  - Logo scales appropriately on mobile (10x10 on mobile, 12x12 on desktop) with object-contain to prevent squishing
  - Reduced icon spacing on mobile (gap-1 on mobile, gap-2 on desktop) for better space utilization

### Backend Architecture

**Server Framework:**
- Express.js for REST API endpoints
- WebSocket server for real-time messaging functionality
- Session-based architecture (connect-pg-simple for session storage)

**API Structure:**
- RESTful endpoints for moments, users, savors, reflects, keeps, and whispers
- File upload handling via Multer (stored in `/uploads` directory)
- WebSocket connections for live notes between users
- Wander page uses weighted randomization with per-user caching (5-minute TTL) to ensure consistent pagination
- Periodic cache cleanup (60-second intervals) prevents memory bloat

**Data Layer:**
- Drizzle ORM for type-safe database operations
- Schema-first approach with Zod validation
- Database models: users, moments, savors, reflects, keeps, whispers, conversations, notes

### Database Design

**Database Technology:**
- PostgreSQL via Neon serverless (@neondatabase/serverless)
- WebSocket constructor override for serverless compatibility
- Connection pooling for efficient resource management

**Schema Architecture:**
- `users`: Profile data (username, displayName, story, avatar, email, firstName, lastName, profileImageUrl)
  - New users automatically assigned random zen-themed usernames (e.g., "cosmic_wanderer42") and display names (e.g., "Mindful Spirit")
- `sessions`: PostgreSQL session storage for Replit Auth (connect-pg-simple)
- `moments`: Content with media URLs, captions, timestamps, and user references
- `savors`: Many-to-many relationship between users and moments (mindful appreciation system)
- `reflects`: Thoughtful responses on moments with user attribution
- `keeps`: Moments saved by users for later viewing
- `whispers`: User activity alerts (savors, reflects, follows) with read status
  - Supports three whisper types: "savor", "reflect", "follow"
  - Follow whispers do not require momentId (nullable field)
- `conversations`: Direct note channels between two users
- `notes`: Note content with read status and timestamps
- Cascading deletes for data integrity (ON DELETE CASCADE)

### External Dependencies

**Third-Party Services:**
- Neon Database (PostgreSQL hosting) - Required DATABASE_URL environment variable
- Google Fonts CDN - Inter and Libre Baskerville font families

**File Storage:**
- Local filesystem storage for uploaded media files
- Files served statically from `/uploads` directory via Express

**Development Tools:**
- Replit-specific plugins for development experience (cartographer, dev-banner, runtime-error-modal)
- TypeScript for static type checking across shared code

**Key Integrations:**
- Replit Auth (OpenID Connect) for authentication with session-based security
- WebSocket protocol for real-time messaging (ws library)
- Session management via PostgreSQL (connect-pg-simple)
- Image/video upload handling (Multer middleware)

### Authentication & Security

**Authentication Method:**
- Replit Auth using OpenID Connect protocol
- Session-based authentication with httpOnly secure cookies
- Sessions stored in PostgreSQL with 7-day TTL
- All API routes protected with isAuthenticated middleware
- WebSocket connections authenticated via session validation

**User Claims from Replit:**
- `sub`: User ID (unique identifier)
- `email`: User's email address
- `first_name`: User's first name
- `last_name`: User's last name
- `profile_image_url`: User's profile image URL

**Security Measures:**
- Server-side user ID validation (req.user.claims.sub) on all routes
- WebSocket upgrade handler validates session before establishing connection
- No client-provided user IDs trusted - all derived from authenticated session
- IDOR vulnerabilities prevented via server-side authorization checks
- End-to-end note encryption using AES-256-GCM algorithm
  - All direct notes encrypted before storage in database
  - Encryption key stored securely in MESSAGE_ENCRYPTION_KEY environment variable
  - Backward compatibility maintained for legacy plaintext notes
  - Notes automatically decrypted when retrieved for display

## Recent Changes

### October 8, 2025 - Conversation Navigation Improvements
- **Fixed conversation routing from user space**: Updated Space.tsx to navigate to `/conversations` instead of `/messages`
  - Renamed `messageMutation` to `conversationMutation` for consistent terminology
  - Updated navigation path from `/messages?conversation=${id}` to `/conversations?conversation=${id}`
  - Updated button handler from `handleMessageClick` to `handleConversationClick`
  - Updated data-testid from `button-message` to `button-conversation`
- **Added clickable user headers in conversation windows**: Made user name and avatar in conversation windows navigate to their space
  - MessageThread component: Avatar and name wrapped in Link to `/space/${userId}` with data-testid="link-user-space"
  - Messages.tsx mobile header: Avatar and name wrapped in Link to `/space/${userId}` with data-testid="link-user-space-mobile"
  - Added hover-elevate effects to both clickable headers

### October 8, 2025 - Terminology Consistency Updates
- **Fixed kept moments feature**: Migrated all "save/saved" terminology to "keep/kept" throughout the application
  - Updated backend endpoints: `/api/save` → `/api/keeps`, `/api/saved-posts` → `/api/keeps`
  - Updated frontend state management in Post and VideoPost components: `saved/setSaved` → `kept/setKept`
  - Updated UI labels and data-testid attributes: `button-save` → `button-keep`
  - Fixed "saved is not defined" error in VideoPost component
- **Fixed reflect feature**: Updated all "comment" references to "reflect" in backend APIs and frontend components
  - Backend endpoint: `/api/moments/:momentId/reflects`
  - Updated profanity filter to use "reflection" terminology

### October 8, 2025 - Routing Fixes
- **Fixed Space page routing issue**: Corrected Space component to use `/space/:userId` route pattern (was using incorrect `/profile/:userId`)
- **Fixed WebSocket note handling**: Aligned backend WebSocket handler to use `type: 'note'` matching frontend (was using `type: 'message'`)
- **Updated all user profile links**: Changed all navigation links from `/profile/` to `/space/` across:
  - Post component (author name and avatar links)
  - Whispers page (follow whisper links)
  - Wander page (search result links)
  - UserListDrawer component (user list links)