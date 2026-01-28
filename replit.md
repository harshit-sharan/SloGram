# Slogram - Slow Living Social Platform

## Overview

Slogram is a mindfulness-focused social media platform inspired by Instagram's interface but adapted for slow living and intentional content sharing. It uses contemplative terminology for its features (e.g., "moments" for posts, "savors" for likes). Users share photos and videos, engage with content, and connect via direct messages. The platform emphasizes calm minimalism with a zen-like aesthetic, featuring sage green accents and generous whitespace, promoting a serene digital experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Technology Stack**: React with TypeScript, Vite, Wouter for routing, TanStack Query for state management, Tailwind CSS for styling.
- **UI Component System**: Radix UI primitives, shadcn/ui (New York style), custom design system based on Instagram, and theme provider for light/dark modes.
- **Design Philosophy**: Instagram-like image-first layout, calm minimalism, zen-like color palette (sage green accent), Inter for body text, Libre Baskerville for headers, content-over-chrome, mobile-first responsive design with adaptive scaling and spacing.

### Backend

- **Server Framework**: Express.js for REST APIs, WebSocket server for real-time messaging, session-based architecture with `connect-pg-simple`.
- **API Structure**: RESTful endpoints for core features (moments, users, savors, reflects, keeps, whispers). File upload handling via Multer. Real-time notes via WebSockets. Wander page uses weighted randomization with per-user caching.
- **Data Layer**: Drizzle ORM for type-safe database operations, schema-first approach with Zod validation.
- **AI Integration**: GPT-5 via Replit AI Integrations for content moderation based on peacefulness, mindfulness, and harmony. GPT-4 Vision API for visual content analysis to detect urgent or aggressive imagery. Integrates into moment creation with a fail-closed strategy for moderation.

### Database

- **Technology**: PostgreSQL via Neon serverless, connection pooling.
- **Schema**:
    - `users`: Profile data, includes auto-generated zen-themed usernames/display names for new users.
    - `sessions`: PostgreSQL session storage.
    - `moments`: Content with media, captions.
    - `savors`: User appreciation of moments.
    - `reflects`: User responses to moments.
    - `keeps`: User-saved moments.
    - `whispers`: User activity notifications (savor, reflect, follow).
    - `conversations`: Direct note channels.
    - `notes`: Encrypted note content with read status.
- **Data Integrity**: Cascading deletes for related data.

### Authentication & Security

- **Dual Authentication**: Replit Auth (OpenID Connect) and local email/password authentication (scrypt hashing). Both use the same session store.
- **Session Management**: Session-based with httpOnly secure cookies, PostgreSQL storage, 7-day TTL.
- **Authorization**: `isAuthenticated` middleware protects all routes. Server-side user ID validation. Client-side redirect system protects frontend pages.
- **Protected Routes**: All pages redirect to home (`/`) when not authenticated, except for the home page itself and `/support` which are publicly accessible.
- **Security Measures**: Timing-safe password comparison, password validation, user object sanitization, unique email constraint. End-to-end note encryption (AES-256-GCM) with key from `MESSAGE_ENCRYPTION_KEY`.

## External Dependencies

- **Third-Party Services**:
    - Neon Database (PostgreSQL hosting)
    - Google Fonts CDN (Inter, Libre Baskerville)
- **File Storage**: Local filesystem storage for uploaded media, served statically.
- **Key Integrations**:
    - Replit Auth (OpenID Connect)
    - WebSocket protocol (`ws` library)
    - `connect-pg-simple` for PostgreSQL session management
    - Multer for image/video uploads
    - OpenAI-compatible API (GPT-5, GPT-4 Vision) via Replit AI Integrations for content moderation.

## Recent Changes

### January 28, 2026 - AI-Powered Content Recommender
- **Added personalized feed recommendations**: Posts are now sorted by AI-determined relevance to user interests
  - New `server/recommender.ts` module with GPT-powered content matching
  - Builds user interest profiles from bio/story and recent post captions
  - Scores posts based on thematic alignment and mood compatibility
  - In-memory caching with TTL (1 hour for profiles, 30 minutes for scores)
  - Combines relevance score (60%) with recency score (40%) for final ranking
  - Integrated into both Flow feed and Explore/Wander pages
  - Uses Replit AI Integrations for OpenAI access (no API key required)
  - Graceful fallback to chronological order on errors

### January 13, 2026 - Account Deletion Feature
- **Added account deletion option**: Users can permanently delete their account and all associated data
  - New `deleteUser` method in storage layer
  - DELETE `/api/account` endpoint with session cleanup
  - Settings page "Danger Zone" section with confirmation dialog
  - Shows list of data that will be deleted (moments, messages, followers, saved content)
  - Buttons disabled during deletion, proper error handling and feedback
  - Cascading delete removes all user data: moments, savors, keeps, reflects, conversations, notes, whispers, follows, reports

### October 27, 2025 - Report System for Objectionable Content
- **Added reporting system for content and users**: Users can report objectionable moments and abusive users
  - New `reports` database table storing reporterId, targetType (moment/user), targetId, reason, notes, createdAt
  - Report reasons: harassment, hate, explicit, spam, self_harm, other
  - API endpoints: POST `/api/reports/moments/:momentId`, POST `/api/reports/users/:targetUserId`
  - GET endpoints to fetch user's reported content/users for filtering
  - Prevents duplicate reports and self-reporting
- **Automatic content filtering**: Reported content is hidden from the reporting user's experience
  - Flow page (`/api/moments-with-authors`) filters out reported moments and moments from reported users
  - Explore/Wander page (`/api/explore-posts`) applies same filtering
  - Filtering happens server-side for performance
- **UI integration**: Report dialogs added throughout the app
  - ReportDialog component with radio button reasons and optional notes
  - Report button on moment cards (three-dot menu for other users' posts)
  - Report user button on profile pages (flag icon for other users)
  - Confirmation toast and automatic feed refresh after reporting

### October 27, 2025 - Terms of Service and Policy Acceptance
- **Added Terms of Service page**: Comprehensive EULA with zero tolerance policy for objectionable content and abusive users
  - New `/terms` route with dedicated Terms page component
  - Emphasis on platform philosophy (peacefulness, mindfulness, harmony, slow living)
  - Clear zero tolerance section with prohibited content list
  - Content moderation, user responsibilities, and account termination policies
  - Accessible from Settings and Support pages
- **Added policy acceptance checkbox to signup**: Users must accept Terms and Privacy Policy during registration
  - Single checkbox with links to both Terms of Service and Privacy Policy
  - Signup button disabled until terms are accepted
  - Backend validates `acceptedTerms` field and rejects signups without acceptance
  - `policiesAcceptedAt` timestamp stored in database for compliance tracking

### October 27, 2025 - Authentication Redirect System
- **Added client-side authentication redirect**: Non-authenticated users are now redirected to home when attempting to access protected pages
  - Redirect logic implemented in Router component's useEffect hook
  - Waits for auth loading to complete before checking and redirecting
  - Public pages accessible to everyone: `/` (home), `/support`, `/privacy`, `/terms`
  - Protected pages redirect to home: `/wander`, `/settings`, `/whispers`, `/conversations`, `/kept`, `/space/:userId`, `/moment/:id`
  - Uses wouter's `setLocation` for client-side navigation
  - Prevents flash of protected content by checking `isLoading` state

### October 27, 2025 - Support Request System
- **Added support page and request system**: Users can now submit support requests directly through the platform
  - New `/support` route with dedicated Support page component
  - Form includes fields for name, email, subject, and message with validation
  - Smart conditional rendering: hides name/email fields for logged-in users (auto-filled from their account)
  - Shows "Submitting as [Name] (email)" notification for authenticated users
  - Backend endpoint `/api/support` stores requests in `support_requests` table
  - Support accessible via Settings page "Contact Support" button
  - Works for both authenticated and anonymous users
  - Form validation: name required, valid email format, subject required, message minimum 10 characters
  - On success: displays toast and clears subject/message while preserving user identity

### October 27, 2025 - Username-based Profile URLs and Share Profile Feature
- **Added username-based profile navigation**: Users can now access profiles using either user ID or username in the URL
  - Backend endpoint `/api/users/:userIdOrUsername` tries to fetch by ID first, then falls back to username
  - Frontend Space component properly handles both URL formats: `/space/{userId}` and `/space/{username}`
  - All API calls use the resolved user.id instead of the route parameter for consistency
- **Added share profile button**: Users can now share any profile (their own or others') via a share button
  - Share button visible on all user profiles with data-testid="button-share-profile"
  - Uses native device share options (navigator.share API) for seamless sharing across apps
  - Includes profile title, description (story or fallback text), and URL in share data
  - Prefers username in URL format, falls back to user ID if username is not set
  - Shows error toast only for genuine failures (not user cancellation/AbortError)
  - Positioned alongside other profile action buttons (Edit Profile/Settings for own profile, Follow/Message for others)

### October 27, 2025 - Fixed Whisper Navigation
- **Fixed whisper click navigation**: Updated whisper interface to use `momentId` and `moment` instead of `postId` and `post` to match backend schema
  - Clicking on savor/reflect whispers now correctly navigates to the moment page
  - Fixed "undefined" in URL error when clicking whispers