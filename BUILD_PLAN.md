# PSCoMiXX Creator - Build Plan

## Project Overview

Build a comprehensive creative studio platform for comics, trading cards, visual novels, motion graphics, CYOA stories, and cover art with AI-assisted generation, professional drawing tools, and a full community ecosystem.

**Design Aesthetic:** Strict noir/brutalist black-and-white UI with hard shadows, high contrast, and bold typography.

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Setup
- [ ] Initialize project with Vite + React + TypeScript
- [ ] Configure TailwindCSS v4 with custom design tokens
- [ ] Set up path aliases (@/, @shared/, @assets/)
- [ ] Install and configure shadcn/ui (New York variant)
- [ ] Set up Wouter for client-side routing
- [ ] Configure TanStack Query for server state

### 1.2 Design System
- [ ] Define color palette:
  ```css
  --background: #000000
  --foreground: #ffffff
  --muted: #1a1a1a
  --border: #333333
  ```
- [ ] Configure fonts:
  - Display: Space Grotesk
  - Body: Inter
  - Monospace: JetBrains Mono
- [ ] Create base UI components with brutalist styling:
  - Buttons (solid, outline, ghost variants)
  - Cards (hard shadow, white border)
  - Inputs (black background, white border)
  - Modals (black with white border)
  - Tabs
  - Dropdowns
  - Tooltips

### 1.3 Backend Setup
- [ ] Initialize Express.js server with TypeScript
- [ ] Configure PostgreSQL with Drizzle ORM
- [ ] Set up Neon serverless driver
- [ ] Create database connection pool
- [ ] Configure CORS and body parsing middleware
- [ ] Set up development hot reload with tsx

### 1.4 Database Schema
- [ ] Create `users` table:
  ```sql
  id, email, password, name, role, 
  ip_disclosure_accepted, user_agreement_accepted, created_at
  ```
- [ ] Create `projects` table:
  ```sql
  id, user_id, title, type, status, data (JSONB), 
  thumbnail, created_at, updated_at
  ```
- [ ] Create `assets` table:
  ```sql
  id, user_id, project_id, url, type, filename, 
  metadata (JSONB), created_at
  ```
- [ ] Generate Zod schemas for each table
- [ ] Create type exports for Insert and Select types

### 1.5 Authentication System
- [ ] Install Passport.js with local strategy
- [ ] Implement password hashing with scrypt
- [ ] Configure express-session with secure cookies
- [ ] Create auth middleware (isAuthenticated, isAdmin)
- [ ] Build API routes:
  - POST /api/auth/signup
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/user

### 1.6 Legal Gate
- [ ] Create NDA acceptance modal
- [ ] Create IP disclosure acceptance modal
- [ ] Create user agreement acceptance modal
- [ ] Store acceptance timestamps in user record
- [ ] Block access to creators until agreements accepted

---

## Phase 2: Core Creator Tools (Week 3-6)

### 2.1 Comic Creator

#### 2.1.1 Page/Spread System
- [ ] Build dual-page spread view (left/right pages)
- [ ] Create page navigation (prev/next spread)
- [ ] Implement spread management (add/delete/reorder)
- [ ] Build page zoom controls

#### 2.1.2 Panel System
- [ ] Create 30 panel templates across 9 categories:
  
  **Basic (5 templates):**
  - Full page (100%)
  - Half horizontal (50/50)
  - Half vertical (50/50)
  - Thirds horizontal
  - Quarters (2x2)
  
  **Grid (5 templates):**
  - 2x2 grid
  - 2x3 grid
  - 3x2 grid
  - 3x3 grid
  - 4x4 grid
  
  **Action (4 templates):**
  - Diagonal split
  - Dynamic angles
  - Splash page with insets
  - Impact burst
  
  **Dialogue (3 templates):**
  - Conversation (2 tall panels)
  - Interview (speaker + reactions)
  - Drama (close-ups)
  
  **Manga (3 templates):**
  - Right-to-left flow
  - Speed line composition
  - Emotion panels
  
  **Webtoon (2 templates):**
  - Vertical scroll sections
  - Long panel sequence
  
  **Cinematic (3 templates):**
  - Letterbox (2.35:1)
  - Widescreen strips
  - Establishing shots
  
  **Creative (3 templates):**
  - Circular panels
  - Overlapping panels
  - Broken borders
  
  **Classic (2 templates):**
  - Golden age (6-panel)
  - Sunday strip (4-panel)

- [ ] Implement freeform panel drawing
- [ ] Build panel resize handles
- [ ] Create panel type options (rectangle, circle, custom)
- [ ] Implement panel z-index management

#### 2.1.3 Layer System
- [ ] Build layer panel UI in sidebar
- [ ] Implement layer reordering (drag-drop)
- [ ] Create layer visibility toggle
- [ ] Add layer lock toggle
- [ ] Build layer selection highlighting
- [ ] Create layer thumbnail previews

#### 2.1.4 Content Types
- [ ] Image content (upload, drag-drop, paste)
- [ ] Video/GIF content with playback
- [ ] Drawing content (vector paths)
- [ ] Text content with styling
- [ ] Bubble content with text overlay

#### 2.1.5 Drawing Tools
- [ ] Implement Canvas drawing with:
  - Brush tool (variable size)
  - Eraser tool
  - Color picker
  - Undo/redo stack
- [ ] Support both raster and vector modes
- [ ] Create brush size slider
- [ ] Build color palette selector

#### 2.1.6 Asset Library Integration
- [ ] Create asset browser panel
- [ ] Implement 89 built-in assets:
  - 48 speech bubble styles (various shapes)
  - 41 action effects (POW, BAM, CRASH, etc.)
- [ ] Build category filtering
- [ ] Add search functionality
- [ ] Implement drag-drop onto canvas
- [ ] Create favorites system

#### 2.1.7 Speech Bubble Text
- [ ] Detect bubble assets (isBubbleAsset flag)
- [ ] Create text overlay positioned in bubble
- [ ] Build text editing on double-click
- [ ] Add font selection (include Bangers for comics)
- [ ] Add font size control
- [ ] Add text color control
- [ ] Render text in export

#### 2.1.8 Export System
- [ ] Export single page as PNG
- [ ] Export all pages as PNG sequence
- [ ] Export print-ready spreads
- [ ] Proper DPI settings for print

### 2.2 Motion Studio (After Effects-style)

#### 2.2.1 Timeline UI
- [ ] Create horizontal timeline with time ruler
- [ ] Build track lanes (video, audio, image)
- [ ] Implement playhead with scrubbing
- [ ] Create zoom controls for timeline
- [ ] Build time display (current time, duration)

#### 2.2.2 Track System
- [ ] Create track add/remove functionality
- [ ] Build track mute/solo toggles
- [ ] Implement track lock toggle
- [ ] Create track height resize
- [ ] Add track reordering

#### 2.2.3 Clip Management
- [ ] Drag clips onto timeline
- [ ] Resize clip duration (handles)
- [ ] Move clips along timeline
- [ ] Split clips at playhead
- [ ] Delete clips

#### 2.2.4 Keyframe Animation
- [ ] Create keyframe diamond markers
- [ ] Support properties:
  - Position (x, y)
  - Scale (x, y)
  - Rotation (degrees)
  - Opacity (0-100%)
- [ ] Build keyframe editor panel
- [ ] Implement keyframe interpolation

#### 2.2.5 Easing System
- [ ] Implement easing presets:
  - Linear
  - Ease-in
  - Ease-out
  - Ease-in-out
  - Bounce
  - Elastic
- [ ] Create easing curve preview
- [ ] Apply easing between keyframes

#### 2.2.6 Effects System
- [ ] Build effects panel
- [ ] Implement effects:
  - Blur (radius)
  - Glow (color, intensity)
  - Shadow (offset, blur, color)
  - Sepia (intensity)
  - Invert
  - Saturation (level)
- [ ] Create effect parameters UI
- [ ] Support effect stacking

#### 2.2.7 Blend Modes
- [ ] Implement blend modes:
  - Normal
  - Multiply
  - Screen
  - Overlay
  - Darken
  - Lighten
  - Color dodge
  - Color burn
- [ ] Apply to clips/layers

#### 2.2.8 Onion Skinning
- [ ] Show ghost frames before/after
- [ ] Adjustable opacity for ghosts
- [ ] Toggle on/off
- [ ] Configure frame count

#### 2.2.9 Drawing on Frames
- [ ] Drawing tools on canvas
- [ ] Per-frame drawings
- [ ] Drawing layer management

#### 2.2.10 Playback
- [ ] Play/pause toggle
- [ ] Frame-by-frame stepping
- [ ] Loop toggle
- [ ] Playback speed control
- [ ] Audio sync

### 2.3 Trading Card Creator

#### 2.3.1 Card Frame System
- [ ] Create card template selector
- [ ] Build card preview canvas
- [ ] Implement front/back toggle
- [ ] Add card border styling

#### 2.3.2 Card Elements
- [ ] Name field (top of card)
- [ ] Card type selector
- [ ] Artwork area (main image)
- [ ] Stats block:
  - Attack value
  - Defense value
  - Cost/mana value
  - HP value
- [ ] Lore/flavor text area

#### 2.3.3 Rarity System
- [ ] Rarity selector:
  - Common (gray border)
  - Uncommon (green border)
  - Rare (blue border)
  - Epic (purple border)
  - Legendary (gold border)
- [ ] Visual indicators per rarity
- [ ] Rarity badge/icon

#### 2.3.4 Evolution System
- [ ] Link cards in chains
- [ ] Evolution stage indicator
- [ ] Visual evolution arrows
- [ ] Next evolution selector

#### 2.3.5 Export
- [ ] Export single card
- [ ] Batch export entire set
- [ ] Print-ready dimensions

### 2.4 Visual Novel Creator

#### 2.4.1 Scene Graph
- [ ] Visual node editor
- [ ] Create/delete scenes
- [ ] Connect scenes with arrows
- [ ] Scene preview thumbnails
- [ ] Auto-layout algorithm

#### 2.4.2 Scene Editor
- [ ] Background image selector
- [ ] Character sprite placement
- [ ] Multiple character positions
- [ ] Scene title field

#### 2.4.3 Character System
- [ ] Character list panel
- [ ] Character sprites (emotions)
- [ ] Character name/color
- [ ] Sprite switching in dialogue

#### 2.4.4 Dialogue Editor
- [ ] Speaker name field
- [ ] Dialogue text area
- [ ] Character sprite selector
- [ ] Add/remove dialogue lines
- [ ] Dialogue ordering

#### 2.4.5 Choice System
- [ ] Add choice options
- [ ] Link choices to scenes
- [ ] Choice text editing
- [ ] Choice preview

#### 2.4.6 Preview/Playback
- [ ] VN-style text display
- [ ] Character fade in/out
- [ ] Background transitions
- [ ] Choice presentation

### 2.5 CYOA Creator

#### 2.5.1 Node Editor
- [ ] Canvas with pan/zoom
- [ ] Create story nodes
- [ ] Drag nodes to position
- [ ] Node title/content editing

#### 2.5.2 Branching
- [ ] Add choice options to nodes
- [ ] Connect choices to target nodes
- [ ] Visual connection lines
- [ ] Validate dead ends

#### 2.5.3 Node Properties
- [ ] Title field
- [ ] Content/description area
- [ ] Mark as ending toggle
- [ ] Node styling options

#### 2.5.4 Layout Tools
- [ ] Auto-arrange nodes
- [ ] Snap to grid
- [ ] Align tools
- [ ] Minimap navigation

### 2.6 Cover Art Creator

#### 2.6.1 Layout System
- [ ] Front cover template
- [ ] Back cover template
- [ ] Spine template
- [ ] Full wrap view

#### 2.6.2 Front Cover
- [ ] Title text field
- [ ] Subtitle text field
- [ ] Author name field
- [ ] Hero image area
- [ ] Logo placement

#### 2.6.3 Back Cover
- [ ] Synopsis text area
- [ ] Author bio
- [ ] ISBN field
- [ ] Barcode generator
- [ ] QR code generator

#### 2.6.4 Spine
- [ ] Spine text (vertical)
- [ ] Spine width calculator
- [ ] Logo placement

#### 2.6.5 Guides
- [ ] Bleed margin overlay
- [ ] Safe zone overlay
- [ ] Fold lines
- [ ] Print preview

---

## Phase 3: AI Integration (Week 7)

### 3.1 Pollinations.ai Setup
- [ ] Create AI API wrapper
- [ ] Handle prompt encoding
- [ ] Random seed generation
- [ ] Error handling

### 3.2 Image Generation
- [ ] Build prompt input UI
- [ ] Create style presets:
  - Comic style
  - Manga style
  - Realistic
  - Cartoon
  - Noir
- [ ] Generate image from prompt
- [ ] Insert result into canvas
- [ ] Save to asset library

### 3.3 Prompt Templates
- [ ] Character description templates
- [ ] Background scene templates
- [ ] Action pose templates
- [ ] Emotion expression templates
- [ ] Object/item templates

---

## Phase 4: Collaboration (Week 8)

### 4.1 WebSocket Server
- [ ] Set up ws library
- [ ] Create connection handling
- [ ] Implement heartbeat/ping
- [ ] Handle disconnections

### 4.2 Session Management
- [ ] Generate session IDs
- [ ] Join/leave session
- [ ] Track active users per session
- [ ] Session timeout cleanup

### 4.3 Real-time Features
- [ ] Cursor position sharing
- [ ] User presence indicators
- [ ] Color-coded user cursors
- [ ] Active tool display

### 4.4 Conflict Resolution
- [ ] Optimistic updates
- [ ] Last-write-wins strategy
- [ ] Element locking (optional)

---

## Phase 5: Asset Library (Week 9)

### 5.1 Built-in Assets
- [ ] Organize 89 assets into categories:
  - Speech bubbles (48)
  - Action effects (41)
- [ ] Create asset metadata
- [ ] Optimize for web loading

### 5.2 Asset Browser UI
- [ ] Category tabs/filters
- [ ] Search by name/tags
- [ ] Grid/list view toggle
- [ ] Asset preview on hover
- [ ] Drag-to-canvas

### 5.3 User Assets
- [ ] Upload images/videos/audio
- [ ] Store in database with metadata
- [ ] Organize in folders
- [ ] Tag system
- [ ] Favorites list

### 5.4 Cross-tool Integration
- [ ] Use assets in all creators
- [ ] Asset usage tracking
- [ ] Duplicate to project

---

## Phase 6: Project Management (Week 10)

### 6.1 Project CRUD
- [ ] Create new project (by type)
- [ ] List user's projects
- [ ] Filter by project type
- [ ] Search projects
- [ ] Delete project

### 6.2 Auto-save
- [ ] Debounced save on changes
- [ ] Save indicator (saving/saved)
- [ ] Manual save button
- [ ] Last saved timestamp

### 6.3 Project Thumbnails
- [ ] Generate preview image
- [ ] Update on save
- [ ] Display in project list

### 6.4 Project Status
- [ ] Draft status
- [ ] Published status
- [ ] Publish action
- [ ] Unpublish action

---

## Phase 7: Community Features (Week 11-12)

### 7.1 Extended Database Schema
- [ ] Create tables:
  - portfolio_artworks
  - artwork_categories
  - portfolio_events
  - blog_posts
  - contact_messages
  - newsletter_subscribers
  - artist_profiles
  - favorites
  - cart_items
  - orders
  - creator_roles
  - user_roles
  - creator_xp
  - xp_transactions
  - badges
  - user_badges
  - learning_pathways
  - lessons
  - lesson_progress
  - schools
  - creator_teams
  - team_members

### 7.2 Social Feed
- [ ] Post creation form
- [ ] Feed display (timeline)
- [ ] Image/project attachments
- [ ] Like/react system
- [ ] Comment threads

### 7.3 User Profiles
- [ ] Public profile page
- [ ] Bio and avatar
- [ ] Portfolio gallery
- [ ] Social links
- [ ] Stats display

### 7.4 Messaging
- [ ] Direct message UI
- [ ] Conversation list
- [ ] Real-time updates
- [ ] Message notifications

### 7.5 Notifications
- [ ] Notification types:
  - New follower
  - Comment on work
  - Like on work
  - Collaboration invite
  - System announcements
- [ ] Notification bell
- [ ] Mark as read
- [ ] Notification settings

### 7.6 Events
- [ ] Event calendar view
- [ ] Event details page
- [ ] RSVP functionality
- [ ] Event categories

---

## Phase 8: Learning Module (Week 13)

### 8.1 Pathway System
- [ ] Create learning pathways
- [ ] Categories:
  - Comics fundamentals
  - Animation basics
  - 3D modeling
  - Worldbuilding
  - Writing
  - Tool tutorials
- [ ] Difficulty levels
- [ ] Estimated time

### 8.2 Lesson Content
- [ ] Video embeds
- [ ] Text/markdown content
- [ ] Interactive elements
- [ ] Challenge prompts

### 8.3 Progress Tracking
- [ ] Lesson completion
- [ ] Pathway progress bar
- [ ] Resume where left off
- [ ] Completion certificates

### 8.4 XP & Gamification
- [ ] XP rewards per action
- [ ] Level progression
- [ ] Tier unlocks:
  - Learner
  - Creator
  - Mentor
  - Professional
  - Founder
  - Community Builder
- [ ] Leaderboards

### 8.5 Badges
- [ ] Badge designs
- [ ] Unlock conditions
- [ ] Badge display on profile
- [ ] Rarity tiers

---

## Phase 9: Admin Dashboard (Week 14)

### 9.1 Admin UI
- [ ] Admin-only route protection
- [ ] Dashboard layout
- [ ] Navigation menu

### 9.2 User Management
- [ ] User list with search
- [ ] User details view
- [ ] Edit user role
- [ ] Suspend/ban user
- [ ] Delete user

### 9.3 Content Moderation
- [ ] Flagged content queue
- [ ] Review interface
- [ ] Approve/reject actions
- [ ] Ban repeat offenders

### 9.4 Analytics
- [ ] User growth chart
- [ ] Project creation stats
- [ ] Active users (DAU/MAU)
- [ ] Popular content
- [ ] Revenue metrics

### 9.5 System Settings
- [ ] Feature flags
- [ ] Announcement banner
- [ ] Maintenance mode

---

## Phase 10: Monetization (Week 15)

### 10.1 Shop System
- [ ] Product listings
- [ ] Pricing management
- [ ] Availability toggle
- [ ] Featured items

### 10.2 Shopping Cart
- [ ] Add to cart
- [ ] Cart sidebar
- [ ] Quantity adjustment
- [ ] Remove items
- [ ] Cart persistence

### 10.3 Checkout (Stripe Integration)
- [ ] Stripe Elements
- [ ] Payment processing
- [ ] Order creation
- [ ] Confirmation email
- [ ] Order history

### 10.4 Creator Payouts
- [ ] Earnings dashboard
- [ ] Payout requests
- [ ] Revenue split logic

---

## Phase 11: Export & Publishing (Week 16)

### 11.1 Comic Export
- [ ] PNG sequence export
- [ ] PDF export
- [ ] Print-ready settings
- [ ] Resolution options

### 11.2 Motion Export
- [ ] MP4 video export
- [ ] GIF animation export
- [ ] WebM export
- [ ] Quality settings

### 11.3 Trading Card Export
- [ ] Individual card PNG
- [ ] Card sheet layout
- [ ] Print-and-cut guides

### 11.4 Visual Novel Export
- [ ] Web player package
- [ ] Desktop executable
- [ ] Mobile-ready HTML5

### 11.5 CYOA Export
- [ ] Printable book format
- [ ] Interactive web version
- [ ] Twine-compatible export

### 11.6 Publishing Platform
- [ ] Publish to gallery
- [ ] Privacy settings
- [ ] Share links
- [ ] Embed codes

---

## Phase 12: PWA & Mobile (Week 17)

### 12.1 PWA Setup
- [ ] Web app manifest
- [ ] Service worker
- [ ] Offline support
- [ ] Install prompt

### 12.2 Responsive Design
- [ ] Mobile-friendly layouts
- [ ] Touch interactions
- [ ] Gesture support
- [ ] Orientation handling

### 12.3 Cross-platform Sync
- [ ] Same database backend
- [ ] Session management
- [ ] Real-time sync
- [ ] Conflict resolution

---

## Phase 13: Testing & Polish (Week 18)

### 13.1 Testing
- [ ] Unit tests for utilities
- [ ] Integration tests for API
- [ ] E2E tests for workflows
- [ ] Performance testing

### 13.2 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Focus management
- [ ] ARIA labels

### 13.3 Performance
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Caching strategy

### 13.4 Error Handling
- [ ] Error boundaries
- [ ] User-friendly messages
- [ ] Error logging
- [ ] Recovery options

---

## Phase 14: Launch (Week 19-20)

### 14.1 Deployment
- [ ] Production build
- [ ] Environment configuration
- [ ] Database migrations
- [ ] SSL certificate
- [ ] Custom domain (pressstart.space)

### 14.2 Monitoring
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Analytics integration

### 14.3 Documentation
- [ ] User guides
- [ ] Video tutorials
- [ ] FAQ section
- [ ] Support contact

### 14.4 Launch Checklist
- [ ] Security audit
- [ ] Performance audit
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Load testing
- [ ] Backup procedures
- [ ] Rollback plan

---

## Technology Stack Summary

### Frontend
```
React 19 + TypeScript
Vite 7 (build tool)
TailwindCSS v4 (styling)
Radix UI + shadcn/ui (components)
Wouter (routing)
TanStack Query (data fetching)
Framer Motion (animations)
Lucide React (icons)
Canvas API (drawing/rendering)
```

### Backend
```
Express.js + TypeScript
Passport.js (authentication)
express-session (sessions)
WebSocket/ws (real-time)
Node.js scrypt (password hashing)
```

### Database
```
PostgreSQL (primary database)
Neon Serverless (hosted)
Drizzle ORM (queries)
drizzle-zod (validation)
```

### External Services
```
Pollinations.ai (AI image generation)
Stripe (payments - optional)
Google Analytics (optional)
```

---

## Estimated Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| 1 | Week 1-2 | Foundation & setup |
| 2 | Week 3-6 | Core creator tools |
| 3 | Week 7 | AI integration |
| 4 | Week 8 | Collaboration |
| 5 | Week 9 | Asset library |
| 6 | Week 10 | Project management |
| 7 | Week 11-12 | Community features |
| 8 | Week 13 | Learning module |
| 9 | Week 14 | Admin dashboard |
| 10 | Week 15 | Monetization |
| 11 | Week 16 | Export & publishing |
| 12 | Week 17 | PWA & mobile |
| 13 | Week 18 | Testing & polish |
| 14 | Week 19-20 | Launch |

**Total: ~20 weeks (5 months)**

---

## Team Recommendations

| Role | Count | Responsibilities |
|------|-------|------------------|
| Full-stack Developer | 2 | Core features, API, database |
| Frontend Developer | 1 | UI/UX, animations, canvas work |
| Backend Developer | 1 | API, auth, real-time, integrations |
| UI/UX Designer | 1 | Design system, layouts, user flows |
| QA Engineer | 1 | Testing, bug tracking |
| Project Manager | 1 | Coordination, timelines |

**Minimum Team: 3-4 developers for 5-month timeline**

---

*Build Plan v1.0*
*PSCoMiXX Creator*
