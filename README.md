# Slogram

A mindfulness-focused social platform for slow living

### [Try it](https://slogram.app)

---

This app is an **educational project**, built and operated entirely by AI. It uses AI-powered features throughout. Please feel free to use **random or fake credentials** when signing up -- multi-factor authentication is not enabled, however credentials are stored with enterprise grade security. Please remember to leave a feedback in the app! Continue reading this page for the product, design, and technical details.

---

## Our Philosophy

Slogram is a social media platform reimagined for intentional living. Inspired by Instagram's visual-first approach but designed with a fundamentally different purpose, Slogram encourages users to slow down, be present, and share content that nurtures peace and mindfulness.

In a world of endless scrolling and attention-grabbing algorithms, Slogram offers a serene digital space where quality matters more than quantity, and every interaction is an invitation to pause and appreciate the beauty of everyday life.

Our platform is built on four guiding principles:

- **Peacefulness** -- A calm, serene digital environment free from noise and hostility
- **Mindfulness** -- Encouraging thoughtful, intentional content creation and consumption
- **Harmony** -- Fostering respectful, supportive community interactions
- **Slow Living** -- Promoting presence and appreciation over urgency and comparison

## Contemplative Language

Every detail of Slogram is designed to evoke mindfulness, including the language we use. Instead of the typical social media vocabulary, we use contemplative terminology that encourages a slower, more intentional experience:

| Term | Replaces | Meaning |
|------|----------|---------|
| **Moments** | Posts | Each shared piece of content is a captured moment in time |
| **Savors** | Likes | To truly savor and appreciate someone's shared moment |
| **Reflects** | Comments | Thoughtful reflections on someone's moment |
| **Keeps** | Saves | Moments you want to keep and revisit |
| **Whispers** | Notifications | Gentle nudges about activity on your moments |
| **Notes** | Direct Messages | Private, encrypted conversations between users |
| **Wander** | Explore | Wander through content and discover new perspectives |
| **Space** | Profile | Your personal space for self-expression |

## Features

### Photo and Video Sharing
Share images and videos as "moments." Upload media with captions that tell the story behind each moment. Your content is stored securely using cloud object storage.

### Personalized Feed (Flow)
Your main feed shows moments from people you follow, sorted using AI-powered recommendations that learn what resonates with you. The algorithm combines content relevance (60%) with recency (40%) so you see both meaningful and fresh content.

### Explore and Discover (Wander)
Browse content from across the community with weighted randomization and AI-powered suggestions. Discover new creators and perspectives you might enjoy.

### Encrypted Direct Messaging (Notes)
Send private messages to other users through end-to-end encrypted conversations. Messages are encrypted using AES-256-GCM before being stored, with real-time delivery powered by WebSockets. Only you and the recipient can read your notes.

### Real-Time Notifications (Whispers)
Receive gentle notifications when someone savors your moment, leaves a reflection, or follows you. Whispers are delivered in real time through WebSocket connections.

### User Profiles (Spaces)
Customize your personal space with a display name, bio (story), and profile avatar. Share your profile via username-based URLs and let others discover your moments. Follow other users to build your own curated community.

### Save and Revisit (Keeps)
Bookmark moments that inspire you and revisit them anytime from your personal collection of kept moments.

## AI-Powered Content Moderation

Every moment shared on Slogram passes through an AI content moderation system before it appears on the platform. This system uses two layers of analysis:

**Text Analysis** -- Captions are evaluated by GPT for peacefulness, mindfulness, and harmony on a scale of 1 to 10. Content that scores below the threshold is gently rejected with constructive feedback suggesting how to rephrase in a more mindful way.

**Visual Analysis** -- Images are analyzed using GPT Vision to detect urgent, aggressive, or inappropriate imagery. This ensures the visual experience on Slogram remains peaceful and welcoming.

The moderation system uses a fail-closed strategy: if the AI system is unavailable, content is not published until it can be properly evaluated. This ensures the platform always maintains its peaceful standards.

## AI-Powered Recommendations

Slogram uses a multi-layered AI recommendation system to surface content that aligns with your interests and values:

**Pre-Computed Summaries** -- When you create a moment or update your profile, GPT generates and stores a thematic summary of your content and an interest profile based on your bio and recent posts. These are persisted in the database with hash-based deduplication to avoid unnecessary recomputation.

**Vector Similarity Search** -- Content and user profiles are converted into vector embeddings using OpenAI's text-embedding-3-small model. The system uses pgvector with HNSW indexes for fast cosine similarity search, matching your interests to relevant moments at database speed.

**GPT-Based Scoring** -- As a fallback when vector embeddings aren't available, GPT evaluates each post's relevance to your stored interest profile, considering thematic alignment, mood compatibility, and content quality. Results are cached for 30 minutes to keep the feed responsive.

The final feed ranking combines relevance (60%) with recency (40%), and the system gracefully falls back to chronological order if AI services are unavailable.

## Security and Authentication

Slogram offers two ways to sign in, both built with security as a top priority:

**Replit Auth (OAuth / OpenID Connect)** -- One-click sign-in using your Replit account through the OpenID Connect protocol. No password to manage -- authentication is handled securely by the identity provider.

**Email and Password** -- Traditional registration with email and password. Passwords are hashed using scrypt with timing-safe comparison to prevent brute-force and timing attacks. Unique email constraints prevent duplicate accounts.

Sessions are stored in PostgreSQL with httpOnly secure cookies and a 7-day TTL. All protected routes enforce server-side authentication, and the client-side redirects unauthenticated users away from private pages.

## Community Safety

**Reporting System** -- Users can report objectionable moments or abusive users with specific reasons (harassment, hate, explicit content, spam, self-harm, or other). Reported content is automatically hidden from the reporter's feed, and reports are stored for review. Duplicate reports and self-reporting are prevented.

**Account Deletion** -- Users have full control over their data. Account deletion permanently removes all associated content including moments, messages, followers, saved content, and notifications through cascading database deletes.

**Zero Tolerance Policy** -- Slogram maintains strict zero tolerance for harassment, hate speech, violence, explicit content, and any behavior that disrupts the peaceful atmosphere. Users must accept the Terms of Service and Privacy Policy during registration.

## Technical Architecture

**Frontend** -- Built with React and TypeScript, bundled by Vite. Routing is handled by Wouter and server state is managed with TanStack Query. The UI uses Radix UI primitives and shadcn/ui components styled with Tailwind CSS, featuring a zen-like color palette with sage green accents, Inter for body text, and Libre Baskerville for headings. Full light and dark mode support.

**Backend** -- Express.js serves RESTful APIs for all core features. A WebSocket server (ws library) handles real-time messaging and notification delivery. File uploads are processed with Multer and stored in cloud object storage. The Wander page uses weighted randomization with per-user caching.

**Database** -- PostgreSQL (Neon serverless) with connection pooling. Drizzle ORM provides type-safe database operations with a schema-first approach and Zod validation. The pgvector extension enables vector similarity search with HNSW indexes for the recommendation system. All related data uses cascading deletes for clean data lifecycle management.

**AI Services** -- Multiple AI integrations power different aspects of the platform: Content Moderation, Visual Analysis, Interest Profiling, Content Summarization, Vector Embeddings, Relevance Scoring.

**Encryption** -- Direct messages are encrypted at rest using AES-256-GCM. Passwords are hashed with scrypt. Sessions use httpOnly secure cookies. All authentication flows implement timing-safe comparison to prevent side-channel attacks.

## Design Philosophy

The visual design of Slogram follows the principle of calm minimalism:

- Instagram-inspired image-first layout that puts content at the center
- Sage green accent color palette evoking nature and tranquility
- Generous whitespace and gentle transitions creating breathing room
- Mobile-first responsive design with adaptive scaling
- Content-over-chrome approach that minimizes visual clutter
- Thoughtful dark mode that maintains the serene atmosphere
