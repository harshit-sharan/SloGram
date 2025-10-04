# Slogram Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based (Instagram-inspired with Slow Living Adaptation)

**Primary Reference:** Instagram's clean, image-first interface adapted for mindfulness and slow living

**Key Design Principles:**
- Calm minimalism with generous whitespace
- Image-centric layouts that breathe
- Subtle, mindful interactions
- Zen-like color palette emphasizing tranquility
- Content over chrome - let posts shine

## Color Palette

**Light Mode:**
- Primary Background: 0 0% 98%
- Secondary Background: 0 0% 95%
- Primary Text: 200 15% 20%
- Secondary Text: 200 10% 45%
- Accent: 160 45% 45% (sage green - calming, natural)
- Border: 200 10% 88%
- Interactive Elements: 160 50% 40%

**Dark Mode:**
- Primary Background: 220 15% 12%
- Secondary Background: 220 12% 16%
- Primary Text: 200 10% 90%
- Secondary Text: 200 8% 65%
- Accent: 160 35% 55% (lighter sage for contrast)
- Border: 220 10% 25%
- Interactive Elements: 160 40% 50%

## Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - clean, modern readability
- Display: 'Libre Baskerville' (Google Fonts) - for usernames and headers, adds warmth

**Hierarchy:**
- H1: text-3xl font-serif (Libre Baskerville, usernames)
- H2: text-2xl font-medium
- Body: text-base font-normal
- Caption: text-sm text-secondary
- Metadata: text-xs text-secondary (timestamps, post info)

## Layout System

**Spacing Primitives:** Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16, 24
- Tight spacing: p-2, gap-2
- Standard spacing: p-4, gap-4, m-6
- Section spacing: py-8, py-12, py-16
- Large gaps: gap-8, gap-12

**Container Strategy:**
- Mobile: Full width with px-4 padding
- Desktop feed: max-w-2xl mx-auto (640px - optimal for square/vertical images)
- Profile grid: max-w-5xl mx-auto
- Fixed top navigation

## Component Library

**Navigation:**
- Sticky top bar (h-16) with logo, search, and profile icons
- Bottom mobile nav with Home, Explore, Create, Profile (Instagram style)
- Clean icon-only design with subtle hover states

**Feed Posts:**
- Square or 4:5 ratio image containers
- Profile picture (w-10 h-10) with username above post
- Caption below with "Read more" for long text
- Like/Comment/Share icons below (subtle, monochrome)
- Timestamp in muted text
- Generous py-6 between posts

**Profile Layout:**
- Header: Large profile photo (w-32 h-32), name, bio, stats (posts/followers/following)
- 3-column masonry grid for posts (grid-cols-3 gap-1)
- Minimal chrome, content-focused

**Post Creation:**
- Full-screen modal overlay
- Image preview at top
- Caption textarea with character count
- Hashtag suggestions
- "Share" button in top-right

**Interactions:**
- Heart icon for likes (outlined → filled with subtle scale animation)
- Comment section: Instagram-style threaded comments
- Simple tap areas, no complex gestures

## Images

**Hero Section:** No traditional hero - immediately show the feed (Instagram approach)

**Post Images:**
- Primary content display: Square format (1:1) or portrait (4:5)
- High-quality, full-width within feed container
- Subtle rounded corners (rounded-sm)
- Lazy loading for performance

**Profile Images:**
- Circular avatars throughout
- Multiple sizes: w-10 (feed), w-20 (comments), w-32 (profile header)
- Consistent border treatment

**Empty States:**
- Illustrated placeholders for no posts/followers
- Calming, minimal line illustrations in accent color

## Visual Enhancements

**Cards & Surfaces:**
- Very subtle shadows (shadow-sm on hover only)
- Clean borders where needed (border-gray-200 dark:border-gray-700)
- No heavy elevation, flat design preferred

**Buttons:**
- Primary: Filled with accent color, rounded-lg
- Secondary: Outline with transparent background
- Ghost: Text-only for tertiary actions
- Over images: Blurred background (backdrop-blur-md bg-white/20)

**Forms:**
- Clean inputs with border-b-2 focus style
- Floating labels for elegance
- Subtle placeholder text
- Consistent h-12 input height

**Animations:** Minimal and purposeful
- Micro-interactions only: like button scale, image fade-in on load
- Smooth page transitions (150ms ease)
- No distracting motion

**Accessibility:**
- Consistent dark mode throughout all components
- Form inputs maintain theme in both modes
- Focus states clearly visible
- Touch targets minimum 44x44px

This design creates a visually calming, Instagram-familiar experience that encourages mindful content sharing and consumption.