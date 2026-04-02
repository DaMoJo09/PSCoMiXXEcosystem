# PSCoMiXX Ecosystem Integration Spec
## For Streaming Platform (psstreaming.com) & LMS (pressstart.tech) Builds

**Source App:** PSCoMiXX Creator at `pscomixx.com`
**This document covers everything needed to build a Streaming Platform and/or LMS that fully integrates with CoMiXX.**

---

## 1. ECOSYSTEM SSO — Cross-Platform Authentication

CoMiXX acts as the identity provider. All platforms share a single user identity via JWT tokens.

### Token Format (HS256 JWT)

```typescript
interface EcosystemTokenPayload {
  sub: string;          // User UUID
  email: string;
  name: string;
  username: string;
  role: string;         // "user" | "admin" | "teacher"
  accountType: string;  // "creator" | "student"
  avatar: string | null;
  xp: number;
  level: number;        // 1-30
  levelTitle: string;   // e.g. "Novice", "Creator", "Master"
  totalMinutes: number; // Active time tracked
  subscriptionTier: string; // "free" | "creator" | "pro" | "studio" | "lifetime" | "school"
  iss: string;          // "pscomixx" (issuer)
  iat: number;          // Issued at (unix seconds)
  exp: number;          // Expires (1 hour from iat)
}
```

### Signing
- Algorithm: HS256
- Secret: Shared `ECOSYSTEM_JWT_SECRET` environment variable (must be identical across all apps)
- Base64url encoding (no padding)

### SSO Flow (Redirect-Based)
1. **CoMiXX → Your App:** User clicks ecosystem link in CoMiXX sidebar. CoMiXX calls `GET /api/auth/sso/redirect?target=streaming` (or `target=lms`). This generates a JWT and redirects to:
   ```
   https://psstreaming.com/sso/callback?token=<JWT>&source=pscomixx
   ```
2. **Your App Receives Token:** At `/sso/callback`, verify the JWT using the shared secret. Extract the user payload. Create or update a local user record from the token data. Establish a session.
3. **Your App → CoMiXX:** If a user on your platform wants to go to CoMiXX, redirect them to:
   ```
   https://pscomixx.com/api/auth/sso/authorize?redirect_uri=https://yourapp.com/sso/callback&source=streaming
   ```
   CoMiXX will authenticate (or use existing session) and redirect back with a token.

### Allowed Origins
CoMiXX validates redirect URIs against this whitelist:
```
pscomixx.com, pscomixx.online, psstreaming.com, pressstart.tech
```
If your domains differ, we'll need to update this list on both sides.

### Auto-Provisioning
When a user arrives via SSO with a valid token but no local account exists, create one using the token data. The `sub` (user UUID) should be stored as `ps_user_id` for cross-platform linking.

---

## 2. CONTENT PUBLISHING — CoMiXX → Streaming

When a creator publishes content in CoMiXX, the publish pipeline syncs it to the streaming platform.

### Endpoint Your Streaming Platform Must Implement

```
POST /api/replit/sync/content
Headers:
  Content-Type: application/json
  x-webhook-secret: <PSSTREAMING_WEBHOOK_SECRET>
```

### Content Sync Payload

```typescript
{
  contract_version: "v1",
  content_id: string,        // UUID — use as primary key
  content_type: "comic" | "comic_issue" | "visual_novel" | "cyoa" | "trading_card" | "cover" | "motion" | "hop",
  title: string,
  description: string,
  cover_url: string,         // URL to cover image
  creator_ps_user_id: string, // UUID matching SSO sub
  creator_display_name: string,
  visibility: "private" | "unlisted" | "public",
  tags: string[],

  // Type-specific payload fields (see below)
  pages?: { page_number: number; image_url: string }[],  // for comics
  scenes?: object[],         // for visual novels
  nodes?: object[],          // for CYOA
  cards?: object[],          // for trading cards
  tracks?: object[],         // for motion
  hop_data?: object,         // for HOPs (see HOP section)
}
```

### Expected Response
```json
{ "success": true, "content_id": "<uuid>", "action": "created" | "updated" }
```

### Creator Profile Sync

```
POST /api/replit/sync/creator
Headers:
  Content-Type: application/json
  x-webhook-secret: <PSSTREAMING_WEBHOOK_SECRET>

Body:
{
  "ps_user_id": "uuid",
  "display_name": "string",
  "avatar_url": "string",
  "bio": "string",
  "email": "string"
}
```

### Health Check
```
GET /api/replit/sync/status
Headers:
  x-webhook-secret: <PSSTREAMING_WEBHOOK_SECRET>
Response: 200 OK
```

---

## 3. PS CONTENT BUNDLE FORMAT (v1)

This is the canonical exchange format for all content across the ecosystem.

```typescript
const psContentBundleSchema = {
  contract_version: "v1",          // Always "v1"
  content_id: string,              // UUID
  content_type: "comic" | "comic_issue" | "visual_novel" | "cyoa" | "trading_card" | "cover" | "motion" | "hop",
  title: string,
  description?: string,
  cover_asset_url?: string,
  creator: {
    ps_user_id: string,            // UUID
    display_name: string,
    avatar_url?: string,
  },
  visibility: "private" | "unlisted" | "public",
  age_rating?: string,
  tags: string[],
  payload: any,                    // Content-type-specific data
  assets: [{
    asset_id: string,
    url: string,
    type: string,
    thumbnail_url?: string,
  }],
  published_at?: string,           // ISO 8601
  updated_at?: string,
}
```

---

## 4. HOPs (Hot One-Page Stories) — THE VIRAL FORMAT

This is the short-form looping content format — the TikTok/LoFi-girl moment.

### HOP Scene Schema
```typescript
{
  id: string,
  order: number,
  assetType: "image" | "gif" | "video" | "text_card" | "motion_scene",
  assetUrl?: string,             // URL to the asset
  textOverlay?: string,          // Text displayed on screen
  caption?: string,              // Subtitle/caption text
  duration: number,              // Seconds this scene displays
  transition: "cut" | "fade" | "zoom" | "glitch",
  loopInScene: boolean,          // Loop this scene's asset
  effects?: string[],            // FX effect identifiers
}
```

### HOP Data Schema
```typescript
{
  type: "single" | "series",
  clipLengthMode: "30s" | "90s" | "custom",
  loopMode: "single_loop" | "full_series_loop" | "manual_advance",
  audioTrack?: {
    src: string,                 // URL or base64 data URL
    name: string,                // Track name
    volume: number,              // 0-1, default 0.8
    loop: boolean,               // default true
    bpm?: number,                // Beats per minute (optional)
    fadeIn?: number,             // Fade in duration (seconds)
    fadeOut?: number,
  },
  scenes: HopScene[],           // Array of scenes
  coverImage?: string,
  tags?: string[],
  visibility: "private" | "unlisted" | "public",
  totalDuration?: number,        // Computed total in seconds
  previewSettings?: {
    autoplay: boolean,           // default true
    mutedByDefault: boolean,     // default false
    showCaptions: boolean,       // default true
  },
  streamingSyncStatus: "draft" | "queued" | "published" | "failed",
  seriesId?: string,
  seriesTitle?: string,
  episodeNumber?: number,
  partLabel?: string,
}
```

### How HOPs Arrive at Streaming
HOPs publish through the same `POST /api/replit/sync/content` endpoint with `content_type: "hop"`. The `hop_data` field in the payload contains the full HopData object.

The streaming platform should:
1. Store the HOP metadata and scenes
2. Render a fullscreen looping player (scenes cycle with transitions, audio loops)
3. Support series (multiple HOPs in sequence with `full_series_loop` mode)
4. Show creator attribution linked to the creator profile

---

## 5. XP SYNCHRONIZATION — Bidirectional

CoMiXX broadcasts XP events to all ecosystem apps in real time.

### Endpoint Your App Must Implement (Receive XP from CoMiXX)

**For Streaming Platform:**
```
POST /api/xp/sync/incoming
Headers:
  Content-Type: application/json
  x-webhook-secret: <PSSTREAMING_WEBHOOK_SECRET>

Body:
{
  "user_id": "string",          // UUID or email
  "user_email": "string",
  "action": "string",           // e.g. "heartbeat", "project_created", "hop_published"
  "xp_amount": number,          // XP awarded in this event
  "total_xp": number,           // User's total XP across ecosystem
  "level": number,              // 1-30
  "level_title": "string",      // e.g. "Apprentice"
  "total_minutes": number,      // Total active minutes
  "source_platform": "pscomixx",
  "timestamp": "ISO 8601"
}
```

**For LMS:**
```
POST /api/webhooks/xp-sync
Headers:
  Content-Type: application/json
  X-API-Key: <PSLMS_API_KEY>

Body:
{
  "event": "xp.sync",
  "user_email": "string",
  "xp_awarded": number,
  "action": "string",
  "total_xp": number,
  "level": number,
  "level_title": "string",
  "total_minutes": number,
  "source": "comixx",
  "timestamp": "ISO 8601"
}
```

### Sending XP Back to CoMiXX
If your app awards XP (e.g. watching streams, completing LMS lessons), send it to:
```
POST https://pscomixx.com/api/webhooks/xp-sync
Headers:
  Content-Type: application/json
  x-webhook-secret: <PSSTREAMING_WEBHOOK_SECRET>

Body: (same format as above, but source = "streaming" or "lms")
```

### XP Event Types from CoMiXX
| Event | XP |
|-------|-----|
| heartbeat (active minute) | 1 |
| first_login | 50 |
| project_created | 25 |
| project_saved | 10 |
| project_exported | 25 |
| hop_created | 25 |
| hop_saved | 25 |
| hop_published | 100 |
| hop_series_created | 150 |
| comic_published | 100 |
| marketplace_sale | 50 |

### Level System
- 30 levels total
- XP thresholds scale exponentially
- Level titles: Novice → Apprentice → Creator → ... → Master → Legend
- Levels unlock tools, features, and certifications

---

## 6. PSLMS INTEGRATION — For the LMS Build

### Endpoints CoMiXX Already Calls on Your LMS

**Portfolio Submission (CoMiXX → LMS):**
```
POST <PSLMS_API_URL>/api/webhooks/comixx
Headers:
  Content-Type: application/json
  x-webhook-signature: HMAC-SHA256(<body>, <PSLMS_WEBHOOK_SECRET>)

Body:
{
  "event": "portfolio_submission",
  "student_email": "string",
  "project_id": "string",
  "project_title": "string",
  "project_type": "comic" | "card" | "visual_novel" | "cyoa" | "motion" | "hop",
  "thumbnail_url": "string",
  "xp_earned": number,
  "level": number,
  "submitted_at": "ISO 8601"
}
```

### Endpoints Your LMS Can Call on CoMiXX

**Fetch Student's Projects:**
```
GET https://pscomixx.com/api/pslms/comics?email=<student_email>
Headers:
  Authorization: Bearer <PSLMS_API_KEY>
Response: [{ id, title, type, thumbnail, created_at, updated_at }]
```

**Fetch Specific Project Data:**
```
GET https://pscomixx.com/api/pslms/comics/<project_id>
Headers:
  Authorization: Bearer <PSLMS_API_KEY>
Response: { id, title, type, data (full project JSON), thumbnail, creator_email }
```

**Health Check:**
```
GET https://pscomixx.com/api/pslms/health
Headers:
  Authorization: Bearer <PSLMS_API_KEY>
Response: { status: "ok", timestamp: "ISO 8601" }
```

### Teacher Dashboard Features in CoMiXX
CoMiXX already has classroom management built in:
- **Assignments:** Teachers create assignments with title, description, due date, allowed project types
- **Submissions:** Students submit projects to assignments from the creator
- **Grading:** Teachers review and grade submissions with feedback
- **Notifications:** Email notifications for new assignments, grades, and submissions

The LMS should mirror these or call the CoMiXX API to display them. The key link is **email** — students are matched across platforms by email address.

---

## 7. WEBHOOK EVENT FORMAT

All webhooks from CoMiXX use this envelope:

```typescript
{
  id: string,           // UUID
  event: string,        // Event type name
  version: "1.0",
  timestamp: string,    // ISO 8601
  source: "comixx",
  data: { ... },        // Event-specific payload
  signature?: string    // HMAC-SHA256 if secret provided
}
```

### Verification
```typescript
// Verify incoming webhook from CoMiXX:
const expectedSignature = crypto
  .createHmac("sha256", YOUR_WEBHOOK_SECRET)
  .update(JSON.stringify(webhookBody))
  .digest("hex");

// Compare with X-Webhook-Signature header
```

### Retry Policy
- Failed webhooks retry up to 3 times
- Delays: 1s, 5s, 30s (exponential backoff)
- Logged in `webhook_delivery_logs` table on CoMiXX side

---

## 8. STREAMING PLATFORM WEBHOOKS → CoMiXX

The streaming platform can send events back to CoMiXX:

**Content Events:**
```
POST https://pscomixx.com/api/webhooks/streaming
Headers:
  Content-Type: application/json
  x-webhook-secret: <PSSTREAMING_WEBHOOK_SECRET>

Body:
{
  "event": "video.published" | "video.viewed" | "content.liked",
  "contentId": "string",
  "userId": "string",
  "metadata": { ... }
}
```
CoMiXX will forward these to LMS automatically.

**Portfolio Addition (1-click from streaming to LMS portfolio):**
```
POST https://pscomixx.com/api/webhooks/streaming/portfolio
Headers:
  Content-Type: application/json
  x-webhook-secret: <PSSTREAMING_WEBHOOK_SECRET>

Body:
{
  "event": "portfolio.add",
  "student_email": "string",
  "content_id": "string",
  "content_title": "string",
  "content_type": "string",
  "thumbnail_url": "string"
}
```

---

## 9. SHARED SECRETS / ENV VARS

| Variable | Who Has It | Purpose |
|----------|-----------|---------|
| `ECOSYSTEM_JWT_SECRET` | All apps | SSO token signing |
| `PSLMS_API_KEY` | CoMiXX + LMS | CoMiXX authenticating with LMS |
| `PSLMS_WEBHOOK_SECRET` | CoMiXX + LMS | HMAC signing for portfolio submissions |
| `PSSTREAMING_WEBHOOK_SECRET` | CoMiXX + Streaming | Content sync + XP sync auth |

All secrets must be identical on both sides of each integration.

---

## 10. DOMAIN MAP

| App | Domain | Role |
|-----|--------|------|
| CoMiXX Creator | pscomixx.com | Creative studio + identity provider |
| FX Studio | pscomixx.online | Effects pipeline (separate Supabase app) |
| PS Streaming | psstreaming.com | Public content platform + HOPs player |
| Press Start LMS | pressstart.tech | Learning management for K-12 |
| Ecosystem Hub | pressstart.space | Gateway/portal (future) |

---

## 11. USER ACCOUNT MODEL

Your platform should store these fields for ecosystem users:

```typescript
{
  id: string,                    // Local UUID
  ps_user_id: string,           // CoMiXX UUID (from SSO sub)
  email: string,                 // Primary link across platforms
  name: string,
  username: string,
  avatar: string | null,
  role: "user" | "admin" | "teacher",
  accountType: "creator" | "student",
  xp: number,
  level: number,
  levelTitle: string,
  subscriptionTier: string,
  totalMinutes: number,
  createdAt: Date,
  lastSyncedAt: Date,
}
```

The **email** is the cross-platform matching key. The **ps_user_id** is the UUID from CoMiXX that should be used for content attribution and SSO linking.

---

## 12. CONTENT TYPES REFERENCE

| Type | Description | Payload Contains |
|------|-------------|-----------------|
| `comic` | Single comic | spreads, panels, layers, narration |
| `comic_issue` | Issue in a series | Same as comic + series metadata |
| `visual_novel` | VN with scenes | scenes, characters, dialogue, transitions |
| `cyoa` | Choose Your Own Adventure | nodes, choices, variables, conditions |
| `trading_card` | TCG or sports card | card data, stats, artwork |
| `cover` | Standalone cover art | layers, text, images |
| `motion` | Animation/motion comic | timeline tracks, keyframes, audio clips |
| `hop` | Hot One-Page Story | scenes, audio track, loop config |

---

## 13. QUICK START CHECKLIST

### For Streaming Platform Build:
- [ ] Implement `/sso/callback` — receive and verify JWT, create/update user
- [ ] Implement `POST /api/replit/sync/content` — receive published content from CoMiXX
- [ ] Implement `POST /api/replit/sync/creator` — receive creator profile updates
- [ ] Implement `GET /api/replit/sync/status` — health check
- [ ] Implement `POST /api/xp/sync/incoming` — receive XP broadcasts
- [ ] Build HOP player — fullscreen looping with scene transitions + audio sync
- [ ] Build content viewer — comic reader, VN player, CYOA player
- [ ] Set up `ECOSYSTEM_JWT_SECRET` and `PSSTREAMING_WEBHOOK_SECRET`

### For LMS Build:
- [ ] Implement `/sso/callback` — receive and verify JWT, create/update user
- [ ] Implement `POST /api/webhooks/comixx` — receive portfolio submissions
- [ ] Implement `POST /api/webhooks/xp-sync` — receive XP broadcasts
- [ ] Call `GET /api/pslms/comics?email=` to fetch student work from CoMiXX
- [ ] Call `GET /api/pslms/comics/:id` to fetch full project data
- [ ] Build teacher dashboard — assignments, submissions, grading
- [ ] Build student view — portfolio, XP progress, certifications
- [ ] Set up `ECOSYSTEM_JWT_SECRET`, `PSLMS_API_KEY`, `PSLMS_WEBHOOK_SECRET`
