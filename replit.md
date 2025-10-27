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
- **Authorization**: `isAuthenticated` middleware protects all routes. Server-side user ID validation.
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