import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Info,
  Leaf,
  Camera,
  Heart,
  MessageCircle,
  Bookmark,
  Bell,
  Search,
  Shield,
  Lock,
  Brain,
  Sparkles,
  Eye,
  Database,
  Server,
  Layers,
  Palette,
  Users,
  Flag,
  Trash2,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <h1
            className="text-4xl font-serif text-foreground"
            data-testid="text-about-title"
          >
            About Slogram
          </h1>
        </div>

        <p
          className="text-muted-foreground mb-8"
          data-testid="text-about-subtitle"
        >
          A mindfulness-focused social platform for slow living
        </p>

        <div
          className="rounded-md bg-primary/10 border border-primary/30 p-4 mb-8"
          data-testid="banner-disclaimer"
        >
          <p className="text-sm text-foreground/90">
            This app is an <strong>educational project</strong>, built and
            operated entirely by AI. It uses AI-powered features throughout.
            Please use <strong>random or fake credentials</strong> when signing
            up &mdash; do not use real personal information. Alternatively, you
            can log in with an existing account: email{" "}
            <strong>abc@xyz.com</strong> and password 170992. Your feedback is
            very welcome! Continue reading this page for the product, design,
            and technical details.
          </p>
        </div>

        <div className="space-y-6">
          <Card data-testid="card-philosophy">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <CardTitle>Our Philosophy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Slogram is a social media platform reimagined for intentional
                living. Inspired by Instagram's visual-first approach but
                designed with a fundamentally different purpose, Slogram
                encourages users to slow down, be present, and share content
                that nurtures peace and mindfulness.
              </p>
              <p>
                In a world of endless scrolling and attention-grabbing
                algorithms, Slogram offers a serene digital space where quality
                matters more than quantity, and every interaction is an
                invitation to pause and appreciate the beauty of everyday life.
              </p>
              <p>Our platform is built on four guiding principles:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Peacefulness</strong> &mdash; A calm, serene digital
                  environment free from noise and hostility
                </li>
                <li>
                  <strong>Mindfulness</strong> &mdash; Encouraging thoughtful,
                  intentional content creation and consumption
                </li>
                <li>
                  <strong>Harmony</strong> &mdash; Fostering respectful,
                  supportive community interactions
                </li>
                <li>
                  <strong>Slow Living</strong> &mdash; Promoting presence and
                  appreciation over urgency and comparison
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-contemplative-language">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Contemplative Language</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Every detail of Slogram is designed to evoke mindfulness,
                including the language we use. Instead of the typical social
                media vocabulary, we use contemplative terminology that
                encourages a slower, more intentional experience:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Camera className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Moments</p>
                    <p className="text-sm text-muted-foreground">
                      Posts &mdash; each shared piece of content is a captured
                      moment in time
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Heart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Savors</p>
                    <p className="text-sm text-muted-foreground">
                      Likes &mdash; to truly savor and appreciate someone's
                      shared moment
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Reflects</p>
                    <p className="text-sm text-muted-foreground">
                      Comments &mdash; thoughtful reflections on someone's
                      moment
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Bookmark className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Keeps</p>
                    <p className="text-sm text-muted-foreground">
                      Saves &mdash; moments you want to keep and revisit
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Whispers</p>
                    <p className="text-sm text-muted-foreground">
                      Notifications &mdash; gentle nudges about activity on your
                      moments
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Send className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Notes</p>
                    <p className="text-sm text-muted-foreground">
                      Direct messages &mdash; private, encrypted conversations
                      between users
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Search className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Wander</p>
                    <p className="text-sm text-muted-foreground">
                      Explore &mdash; wander through content and discover new
                      perspectives
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Space</p>
                    <p className="text-sm text-muted-foreground">
                      Profile &mdash; your personal space for self-expression
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-features">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Features</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 text-foreground/90">
              <div>
                <h3 className="font-semibold mb-1">Photo and Video Sharing</h3>
                <p className="text-sm text-muted-foreground">
                  Share images and videos as "moments." Upload media with
                  captions that tell the story behind each moment. Your content
                  is stored securely using cloud object storage.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Personalized Feed (Flow)</h3>
                <p className="text-sm text-muted-foreground">
                  Your main feed shows moments from people you follow, sorted
                  using AI-powered recommendations that learn what resonates
                  with you. The algorithm combines content relevance (60%) with
                  recency (40%) so you see both meaningful and fresh content.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  Explore and Discover (Wander)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Browse content from across the community with weighted
                  randomization and AI-powered suggestions. Discover new
                  creators and perspectives you might enjoy.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  Encrypted Direct Messaging (Notes)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send private messages to other users through end-to-end
                  encrypted conversations. Messages are encrypted using
                  AES-256-GCM before being stored, with real-time delivery
                  powered by WebSockets. Only you and the recipient can read
                  your notes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  Real-Time Notifications (Whispers)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Receive gentle notifications when someone savors your moment,
                  leaves a reflection, or follows you. Whispers are delivered in
                  real time through WebSocket connections.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">User Profiles (Spaces)</h3>
                <p className="text-sm text-muted-foreground">
                  Customize your personal space with a display name, bio
                  (story), and profile avatar. Share your profile via
                  username-based URLs and let others discover your moments.
                  Follow other users to build your own curated community.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Save and Revisit (Keeps)</h3>
                <p className="text-sm text-muted-foreground">
                  Bookmark moments that inspire you and revisit them anytime
                  from your personal collection of kept moments.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-moderation">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle>AI-Powered Content Moderation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Every moment shared on Slogram passes through an AI content
                moderation system before it appears on the platform. This system
                uses two layers of analysis:
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">Text Analysis</p>
                  <p className="text-sm text-muted-foreground">
                    Captions are evaluated by GPT for peacefulness, mindfulness,
                    and harmony on a scale of 1 to 10. Content that scores below
                    the threshold is gently rejected with constructive feedback
                    suggesting how to rephrase in a more mindful way.
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">Visual Analysis</p>
                  <p className="text-sm text-muted-foreground">
                    Images are analyzed using GPT Vision to detect urgent,
                    aggressive, or inappropriate imagery. This ensures the
                    visual experience on Slogram remains peaceful and welcoming.
                  </p>
                </div>
              </div>
              <p className="text-sm">
                The moderation system uses a fail-closed strategy: if the AI
                system is unavailable, content is not published until it can be
                properly evaluated. This ensures the platform always maintains
                its peaceful standards.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-recommendations">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle>AI-Powered Recommendations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Slogram uses a multi-layered AI recommendation system to surface
                content that aligns with your interests and values:
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">Pre-Computed Summaries</p>
                  <p className="text-sm text-muted-foreground">
                    When you create a moment or update your profile, GPT
                    generates and stores a thematic summary of your content and
                    an interest profile based on your bio and recent posts.
                    These are persisted in the database with hash-based
                    deduplication to avoid unnecessary recomputation.
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">Vector Similarity Search</p>
                  <p className="text-sm text-muted-foreground">
                    Content and user profiles are converted into vector
                    embeddings using OpenAI's text-embedding-3-small model. The
                    system uses pgvector with HNSW indexes for fast cosine
                    similarity search, matching your interests to relevant
                    moments at database speed.
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">GPT-Based Scoring</p>
                  <p className="text-sm text-muted-foreground">
                    As a fallback when vector embeddings aren't available, GPT
                    evaluates each post's relevance to your stored interest
                    profile, considering thematic alignment, mood compatibility,
                    and content quality. Results are cached for 30 minutes to
                    keep the feed responsive.
                  </p>
                </div>
              </div>
              <p className="text-sm">
                The final feed ranking combines relevance (60%) with recency
                (40%), and the system gracefully falls back to chronological
                order if AI services are unavailable.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-security">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Security and Authentication</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Slogram offers two ways to sign in, both built with security as
                a top priority:
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">
                    Replit Auth (OAuth / OpenID Connect)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    One-click sign-in using your Replit account through the
                    OpenID Connect protocol. No password to manage &mdash;
                    authentication is handled securely by the identity provider.
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">Email and Password</p>
                  <p className="text-sm text-muted-foreground">
                    Traditional registration with email and password. Passwords
                    are hashed using scrypt with timing-safe comparison to
                    prevent brute-force and timing attacks. Unique email
                    constraints prevent duplicate accounts.
                  </p>
                </div>
              </div>
              <p className="text-sm">
                Sessions are stored in PostgreSQL with httpOnly secure cookies
                and a 7-day TTL. All protected routes enforce server-side
                authentication, and the client-side redirects unauthenticated
                users away from private pages.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-safety">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Community Safety</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <div className="flex items-start gap-3">
                <Flag className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Reporting System</p>
                  <p className="text-sm text-muted-foreground">
                    Users can report objectionable moments or abusive users with
                    specific reasons (harassment, hate, explicit content, spam,
                    self-harm, or other). Reported content is automatically
                    hidden from the reporter's feed, and reports are stored for
                    review. Duplicate reports and self-reporting are prevented.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Account Deletion</p>
                  <p className="text-sm text-muted-foreground">
                    Users have full control over their data. Account deletion
                    permanently removes all associated content including
                    moments, messages, followers, saved content, and
                    notifications through cascading database deletes.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Zero Tolerance Policy</p>
                  <p className="text-sm text-muted-foreground">
                    Slogram maintains strict zero tolerance for harassment, hate
                    speech, violence, explicit content, and any behavior that
                    disrupts the peaceful atmosphere. Users must accept the
                    Terms of Service and Privacy Policy during registration.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-technical-architecture">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>Technical Architecture</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 text-foreground/90">
              <div className="flex items-start gap-3">
                <Palette className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Frontend</p>
                  <p className="text-sm text-muted-foreground">
                    Built with React and TypeScript, bundled by Vite. Routing is
                    handled by Wouter and server state is managed with TanStack
                    Query. The UI uses Radix UI primitives and shadcn/ui
                    components styled with Tailwind CSS, featuring a zen-like
                    color palette with sage green accents, Inter for body text,
                    and Libre Baskerville for headings. Full light and dark mode
                    support.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Server className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Backend</p>
                  <p className="text-sm text-muted-foreground">
                    Express.js serves RESTful APIs for all core features. A
                    WebSocket server (ws library) handles real-time messaging
                    and notification delivery. File uploads are processed with
                    Multer and stored in cloud object storage. The Wander page
                    uses weighted randomization with per-user caching.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">
                    PostgreSQL (Neon serverless) with connection pooling.
                    Drizzle ORM provides type-safe database operations with a
                    schema-first approach and Zod validation. The pgvector
                    extension enables vector similarity search with HNSW indexes
                    for the recommendation system. All related data uses
                    cascading deletes for clean data lifecycle management.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">AI Services</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Multiple AI integrations power different aspects of the
                    platform:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Content Moderation</Badge>
                    <Badge variant="secondary">Visual Analysis</Badge>
                    <Badge variant="secondary">Interest Profiling</Badge>
                    <Badge variant="secondary">Content Summarization</Badge>
                    <Badge variant="secondary">Vector Embeddings</Badge>
                    <Badge variant="secondary">Relevance Scoring</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Encryption</p>
                  <p className="text-sm text-muted-foreground">
                    Direct messages are encrypted at rest using AES-256-GCM.
                    Passwords are hashed with scrypt. Sessions use httpOnly
                    secure cookies. All authentication flows implement
                    timing-safe comparison to prevent side-channel attacks.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-design">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Design Philosophy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                The visual design of Slogram follows the principle of calm
                minimalism:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Instagram-inspired image-first layout that puts content at the
                  center
                </li>
                <li>
                  Sage green accent color palette evoking nature and tranquility
                </li>
                <li>
                  Generous whitespace and gentle transitions creating breathing
                  room
                </li>
                <li>Mobile-first responsive design with adaptive scaling</li>
                <li>
                  Content-over-chrome approach that minimizes visual clutter
                </li>
                <li>
                  Thoughtful dark mode that maintains the serene atmosphere
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 pt-2 pb-8">
            <Link href="/terms">
              <Button variant="outline" data-testid="link-terms">
                Terms of Service
              </Button>
            </Link>
            <Link href="/privacy">
              <Button variant="outline" data-testid="link-privacy">
                Privacy Policy
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="outline" data-testid="link-support">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
