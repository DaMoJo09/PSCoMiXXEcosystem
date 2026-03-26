# PSCoMiXX Ecosystem Integration Guide

Complete reference for all platform teams: **Lovable** (FX Studio), **Emergent** (PSStreaming + Mad Mixed Media), and **Replit** (CoMiXX + PSLMS).

---

## ECOSYSTEM OVERVIEW

```
                        ┌─────────────────────┐
                        │   Press Start LMS    │
                        │   pressstart.tech    │
                        │   (Education Hub)    │
                        └─────────┬───────────┘
                                  │
┌─────────────────┐    ┌──────────┴──────────┐    ┌─────────────────────┐
│   FX Studio     │◄──►│    PSCoMiXX         │◄──►│   PSStreaming        │
│ pscomixx.online │    │    pscomixx.com     │    │   psstreaming.com   │
│  (Effects &     │    │  (Creation Hub)     │    │  (Distribution &    │
│   Assets)       │    │                     │    │   Viewing)          │
│                 │    │  ★ Central XP Hub   │    │                     │
│  Lovable +      │    │  Replit             │    │  Emergent Agent     │
│  Supabase       │    │                     │    │                     │
└─────────────────┘    └──────────┬──────────┘    └─────────────────────┘
                                  │
                        ┌─────────┴───────────┐
                        │  Mad Mixed Media     │
                        │  madmixedmedia.com   │
                        │  (Creator Profiles)  │
                        └─────────────────────┘
```

**CoMiXX is the central hub.** All XP merges happen here using "highest value wins" logic, then CoMiXX rebroadcasts to all other apps.

---

## PART 1: USER IDENTITY

### 1.1 Shared Identity Fields

Users are matched across the ecosystem by **email address**. Every sync payload must include `user_email`. CoMiXX also provides `user_id` (UUID) for platforms that need it.

| Field | Format | Example |
|-------|--------|---------|
| `user_id` | UUID v4 | `97bd0662-d2fb-4124-8cc0-89a410db4165` |
| `user_email` | Email string | `mojocreative1@gmail.com` |

### 1.2 SSO (Single Sign-On)

CoMiXX issues JWT tokens for seamless cross-platform login. Any app can verify a token to authenticate a user without requiring separate credentials.

**Issue a token** (user must be logged into CoMiXX):
```
POST https://pscomixx.com/api/auth/sso/token
Cookie: [session cookie]

Response:
{
  "token": "eyJhbG...",
  "expiresIn": 3600
}
```

**Verify a token** (any app can call this):
```
POST https://pscomixx.com/api/auth/sso/verify
Content-Type: application/json

{
  "token": "eyJhbG..."
}

Response:
{
  "valid": true,
  "user": {
    "id": "97bd0662-...",
    "email": "mojocreative1@gmail.com",
    "name": "MoJo",
    "role": "admin",
    "accountType": "creator"
  }
}
```

**SSO Redirect** (seamless login across apps):
```
GET https://pscomixx.com/api/auth/sso/redirect?target=fxstudio
GET https://pscomixx.com/api/auth/sso/redirect?target=streaming
GET https://pscomixx.com/api/auth/sso/redirect?target=lms

Response:
{
  "redirectUrl": "https://www.pscomixx.online/sso?token=eyJhbG..."
}
```

**Token payload structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "Display Name",
  "role": "user",
  "accountType": "creator",
  "iss": "comixx",
  "iat": 1774496000,
  "exp": 1774499600
}
```

**For Lovable:** Implement a `/sso?token=...` route that calls CoMiXX's verify endpoint, then creates/logs in the local user.

**For Emergent:** Same approach on PSStreaming and PSLMS.

---

## PART 2: XP SYSTEM (UNIFIED)

### 2.1 Level Thresholds (ALL APPS MUST USE THESE)

```
Level  1:       0 XP  (Novice)       Level 16:  11,000 XP (Skilled)
Level  2:     100 XP  (Novice)       Level 17:  13,000 XP (Expert)
Level  3:     250 XP  (Novice)       Level 18:  15,500 XP (Expert)
Level  4:     450 XP  (Novice)       Level 19:  18,500 XP (Expert)
Level  5:     700 XP  (Apprentice)   Level 20:  22,000 XP (Expert)
Level  6:   1,000 XP  (Apprentice)   Level 21:  26,000 XP (Master)
Level  7:   1,400 XP  (Apprentice)   Level 22:  31,000 XP (Master)
Level  8:   1,900 XP  (Apprentice)   Level 23:  37,000 XP (Master)
Level  9:   2,500 XP  (Developing)   Level 24:  44,000 XP (Master)
Level 10:   3,200 XP  (Developing)   Level 25:  52,000 XP (Epic)
Level 11:   4,000 XP  (Developing)   Level 26:  62,000 XP (Epic)
Level 12:   5,000 XP  (Developing)   Level 27:  74,000 XP (Epic)
Level 13:   6,200 XP  (Skilled)      Level 28:  88,000 XP (Legendary)
Level 14:   7,600 XP  (Skilled)      Level 29: 105,000 XP (Legendary)
Level 15:   9,200 XP  (Skilled)      Level 30: 125,000 XP (Legendary)
```

**Tier names:** Novice (1-4), Apprentice (5-8), Developing (9-12), Skilled (13-16), Expert (17-20), Master (21-24), Epic (25-27), Legendary (28-30)

### 2.2 XP Actions (Standardized)

| Action | XP | When |
|--------|----|------|
| `first_login` | 50 | First app login ever |
| `daily_login` | 10 | Each daily login |
| `profile_complete` | 75 | User completes profile |
| `project_created` | 25 | New project started |
| `project_completed` | 50 | Project finished |
| `export_completed` | 50 | Export/download |
| `ai_generation` | 15 | AI tool used |
| `publish` | 100 | Published to PSStreaming |
| `save` | 25 | Manual save |
| `challenge_participation` | 75 | Joined a challenge |
| `streak_3day` | 50 | 3-day login streak |
| `streak_7day` | 150 | 7-day login streak |
| `streak_30day` | 500 | 30-day login streak |
| `lesson_complete` | 40 | LMS lesson done |
| `assignment_complete` | 60 | LMS assignment done |
| `subscription_started` | 100 | New subscription |
| `first_share` | 50 | First social share |

**Time-based XP:** CoMiXX awards 5 XP per active minute (via heartbeat every 30 seconds). Other apps should do the same and sync the total.

### 2.3 Merge Logic

**Rule: Highest value wins. Never subtract XP.**

```javascript
mergedXp = Math.max(localXp, incomingTotalXp);
mergedMinutes = Math.max(localMinutes, incomingTotalMinutes);
newLevel = calculateLevelFromXp(mergedXp); // Use the threshold table above
```

### 2.4 How XP Flows

```
User earns XP on FX Studio
    → FX Studio sends to CoMiXX (/api/ecosystem/xp-sync)
    → CoMiXX merges (highest wins)
    → CoMiXX rebroadcasts to PSStreaming + PSLMS (excluding FX Studio to avoid loops)
    → All apps now have the same XP
```

**Anti-loop protection:** CoMiXX tags rebroadcasts with `source: "comixx-relay"`. Apps receiving a relay should NOT send it back. CoMiXX also skips the originating app when rebroadcasting.

---

## PART 3: XP SYNC ENDPOINTS

### 3.1 Sending XP TO CoMiXX (all apps call this)

```
POST https://pscomixx.com/api/ecosystem/xp-sync
```

**Authentication** (send whichever headers your platform uses):

| Platform | Header | Value |
|----------|--------|-------|
| FX Studio (Lovable) | `apikey` + `Authorization: Bearer` | FX Studio Supabase anon key |
| PSStreaming (Emergent) | `x-webhook-secret` | `whsec_45923106c2f0da38c1ec0d10e92accd6666bfeb3610c84de0144c56933bc3dc6` |
| PSLMS | `X-API-Key` | Shared PSLMS API key |

**Request body:**
```json
{
  "user_email": "mojocreative1@gmail.com",
  "total_xp": 4660,
  "level": 12,
  "level_title": "Developing",
  "total_minutes": 2551,
  "source": "fxstudio",
  "action": "heartbeat",
  "xp_awarded": 10,
  "timestamp": "2026-03-26T04:00:00.000Z"
}
```

**Response:**
```json
{
  "synced": true,
  "xp": 108825,
  "total_xp": 108825,
  "level": 29,
  "levelTitle": "Legendary",
  "level_title": "Legendary",
  "totalMinutes": 10565,
  "total_minutes": 10565,
  "source": "ecosystem"
}
```

The response returns the **merged** values (which may be higher than what was sent if CoMiXX had more XP). Apps should update their local state from this response.

### 3.2 CoMiXX Sends XP TO PSStreaming (Emergent)

```
POST https://psstreaming.com/api/xp/sync/incoming
x-webhook-secret: whsec_45923106c2f0da38c1ec0d10e92accd6666bfeb3610c84de0144c56933bc3dc6
Content-Type: application/json

{
  "user_id": "97bd0662-d2fb-4124-8cc0-89a410db4165",
  "user_email": "mojocreative1@gmail.com",
  "action": "heartbeat",
  "xp_amount": 10,
  "total_xp": 108825,
  "level": 29,
  "level_title": "Legendary",
  "total_minutes": 10565,
  "source_platform": "pscomixx",
  "timestamp": "2026-03-26T04:00:00.000Z"
}
```

### 3.3 CoMiXX Sends XP TO FX Studio (Lovable)

```
POST https://upivslgwjtvqymonliib.supabase.co/functions/v1/xp-sync
apikey: [FX Studio Supabase anon key]
Authorization: Bearer [FX Studio Supabase anon key]
Content-Type: application/json

{
  "event": "xp.sync",
  "user_email": "mojocreative1@gmail.com",
  "xp_awarded": 10,
  "action": "heartbeat",
  "total_xp": 108825,
  "level": 29,
  "level_title": "Legendary",
  "total_minutes": 10565,
  "source": "comixx",
  "timestamp": "2026-03-26T04:00:00.000Z"
}
```

### 3.4 CoMiXX Sends XP TO PSLMS

```
POST https://pressstart.tech/api/webhooks/xp-sync
X-API-Key: [PSLMS shared API key]
Content-Type: application/json

{
  "event": "xp.sync",
  "user_email": "mojocreative1@gmail.com",
  "xp_awarded": 10,
  "action": "heartbeat",
  "total_xp": 108825,
  "level": 29,
  "level_title": "Legendary",
  "total_minutes": 10565,
  "source": "comixx",
  "timestamp": "2026-03-26T04:00:00.000Z"
}
```

---

## PART 4: CONTENT PUBLISHING (CoMiXX -> PSStreaming)

### 4.1 Publish Content

When a creator hits "Publish" in CoMiXX, the content bundle is sent to PSStreaming:

```
POST https://psstreaming.com/api/replit/sync/content
x-webhook-secret: whsec_45923106c2f0da38c1ec0d10e92accd6666bfeb3610c84de0144c56933bc3dc6
Content-Type: application/json
```

**Comic bundle:**
```json
{
  "content_id": "project-uuid",
  "content_type": "comic",
  "title": "My Comic",
  "description": "A story about...",
  "cover_url": "https://pscomixx.com/uploads/covers/abc.jpg",
  "creator_ps_user_id": "user-uuid",
  "creator_display_name": "MoJo",
  "visibility": "public",
  "tags": ["action", "adventure"],
  "version": "1",
  "reading_direction": "ltr",
  "pages": [
    { "page_number": 1, "image_url": "https://...", "thumbnail_url": "https://..." }
  ]
}
```

**Supported content types:** `comic`, `visual_novel`, `cyoa`, `trading_card`

### 4.2 Series Sync

```
POST https://psstreaming.com/api/replit/sync/series
```

### 4.3 Creator Profile Sync

```
POST https://psstreaming.com/api/replit/sync/creator
```

### 4.4 Creator Analytics (from PSStreaming)

```
GET https://psstreaming.com/api/replit/creator/{user_id}/stats
```

---

## PART 5: ASSET EXCHANGE (CoMiXX <-> FX Studio)

### 5.1 Export Panel to FX Studio

CoMiXX can export comic panels to FX Studio for effects processing:

```
POST https://www.pscomixx.online/api/import-asset
```

### 5.2 Import from FX Studio

FX Studio sends layouts and scripts back to CoMiXX:

```
POST https://pscomixx.com/api/fx-studio/layout-sync

{
  "type": "layout",
  "pages": [...],
  "preview_data_url": "data:image/png;base64,...",
  "target_page": 0
}

Response:
{
  "success": true,
  "redirectUrl": "/comic?fromLayout=ID"
}
```

### 5.3 Script Import

```
POST https://pscomixx.com/api/fx-studio/layout-sync

{
  "type": "comic-script",
  "content": "INT. COFFEE SHOP - DAY\n..."
}

Response:
{
  "success": true,
  "redirectUrl": "/comic?fromScript=ID"
}
```

CoMiXX auto-detects format: Novel, Screenplay, Kids Book, or Comic.

---

## PART 6: AUTHENTICATION REFERENCE

### All Secrets in One Place

| Secret | Used By | Where Stored |
|--------|---------|--------------|
| PSStreaming Webhook Secret | CoMiXX <-> PSStreaming | Replit: `PSSTREAMING_WEBHOOK_SECRET` |
| FX Studio Supabase Anon Key | CoMiXX <-> FX Studio | Replit: `FX_STUDIO_API_KEY`, Supabase: project settings |
| PSLMS API Key | CoMiXX <-> PSLMS | Replit: `PSLMS_API_KEY` |
| Ecosystem JWT Secret | SSO tokens | Replit: `ECOSYSTEM_JWT_SECRET` |

### Important URLs

| App | Domain | Team |
|-----|--------|------|
| PSCoMiXX | `https://pscomixx.com` | Replit |
| FX Studio | `https://www.pscomixx.online` | Lovable |
| FX Studio Supabase | `https://upivslgwjtvqymonliib.supabase.co` | Lovable |
| PSStreaming | `https://psstreaming.com` | Emergent |
| PSStreaming Preview | `https://talent-vote.preview.emergentagent.com` | Emergent |
| Press Start LMS | `https://pressstart.tech` | Replit |
| Mad Mixed Media | `https://madmixedmedia.com` | Emergent |

**IMPORTANT:** Always use `pscomixx.com` (no www). The `www` subdomain does not have its own TLS certificate. A server-side 301 redirect handles `www` -> non-www for browsers, but API calls should always target the bare domain.

---

## PART 7: WHAT EACH TEAM NEEDS TO DO

### Lovable (FX Studio) - Current Status

| Task | Status |
|------|--------|
| XP sync edge function deployed | DONE |
| Calls CoMiXX at `pscomixx.com` (no www) | DONE |
| Sends all 3 auth headers | DONE |
| Reads `total_xp` from CoMiXX response | DONE |
| Uses unified level thresholds | VERIFY |
| SSO token verification | TODO |
| Match users by email (not username) | VERIFY |
| Display unified XP/level from merged data | TODO |

**Action items for Lovable:**
1. Verify your level thresholds match the table in Section 2.1 exactly
2. When receiving XP from CoMiXX, use the `total_xp` field and apply `Math.max(localXp, total_xp)` merge
3. Implement SSO: add a `/sso?token=...` route that calls `POST https://pscomixx.com/api/auth/sso/verify`
4. Use `user_email` as the primary user matching field, not display name (CoMiXX = "MoJo", FX Studio = "DaMoJo" for the same user)

### Emergent (PSStreaming / Mad Mixed Media) - Current Status

| Task | Status |
|------|--------|
| Content ingest endpoint | DONE |
| XP sync incoming endpoint | DONE |
| Creator profile sync | DONE |
| Creator stats API | DONE |
| Uses `x-webhook-secret` auth | DONE |
| Uses unified level thresholds | VERIFY |
| SSO token verification | TODO |
| Send XP back to CoMiXX | TODO |

**Action items for Emergent:**
1. When users earn XP on PSStreaming (watching content, engaging, etc.), send it back to CoMiXX:
   ```
   POST https://pscomixx.com/api/ecosystem/xp-sync
   x-webhook-secret: [webhook secret]
   
   { "user_email": "...", "total_xp": ..., "source": "psstreaming", ... }
   ```
2. Verify level thresholds match Section 2.1
3. Implement SSO: verify tokens via `POST https://pscomixx.com/api/auth/sso/verify`
4. When receiving XP from CoMiXX, update local user and use `Math.max()` merge

### Replit (CoMiXX / PSLMS) - Current Status

| Task | Status |
|------|--------|
| XP broadcast to all 3 endpoints | DONE |
| Per-endpoint auth headers | DONE |
| Per-endpoint payload formats | DONE |
| Incoming XP merge (highest wins) | DONE |
| Rebroadcast with loop prevention | DONE |
| Force-sync button with toast feedback | DONE |
| SSO token issue/verify | DONE |
| Content publish to PSStreaming | TODO |
| Series sync to PSStreaming | TODO |
| Creator profile sync to PSStreaming | TODO |
| PSLMS XP webhook endpoint | TODO |

---

## PART 8: FUTURE IMPROVEMENTS

### 8.1 Unified Sync Heartbeat

Instead of each app independently syncing, implement a **pull-based reconciliation**:

```
GET https://pscomixx.com/api/ecosystem/xp-status?email=user@example.com
x-webhook-secret: [secret]

Response:
{
  "total_xp": 108825,
  "level": 29,
  "level_title": "Legendary",
  "total_minutes": 10565,
  "last_updated": "2026-03-26T04:00:00.000Z"
}
```

Any app can call this on user login to ensure they have the latest XP, without waiting for a push.

### 8.2 Unified Achievement System

Achievements earned on any platform should be visible everywhere:

```json
{
  "event": "achievement.unlocked",
  "user_email": "user@example.com",
  "achievement_key": "first_publish",
  "achievement_title": "First Publication",
  "source": "comixx",
  "timestamp": "2026-03-26T..."
}
```

### 8.3 Cross-Platform Notifications

When a user earns XP or levels up on one platform, show a toast on the next platform they visit:

```json
{
  "event": "xp.level_up",
  "user_email": "user@example.com",
  "new_level": 30,
  "new_title": "Legendary",
  "source": "fxstudio",
  "message": "You reached Legendary on FX Studio!"
}
```

### 8.4 Content Engagement Sync

PSStreaming should send engagement events back to CoMiXX so creators see their stats:

```json
{
  "event": "content.engagement",
  "content_id": "project-uuid",
  "creator_email": "creator@example.com",
  "views": 1500,
  "likes": 89,
  "comments": 12,
  "timestamp": "2026-03-26T..."
}
```

### 8.5 Subscription Tier Sync

When a user upgrades their subscription on CoMiXX, all apps should know:

```json
{
  "event": "subscription.changed",
  "user_email": "user@example.com",
  "tier": "pro",
  "source": "comixx"
}
```

### 8.6 Unified Activity Feed

A shared activity log that all apps contribute to, so users see a holistic view of their ecosystem activity on any platform.

### 8.7 Error Recovery

If a sync call fails, the sending app should:
1. Log the failure
2. Queue for retry (exponential backoff: 30s, 1m, 5m, 15m, 1h)
3. On next successful sync, send the full state (not just the delta)

CoMiXX already handles this by always sending `total_xp` (not incremental), so any missed sync self-corrects on the next successful call.

---

## PART 9: TESTING & DEBUGGING

### Test User
- Email: `mojocreative1@gmail.com`
- CoMiXX name: MoJo
- FX Studio name: DaMoJo
- Current XP: ~108,825 (Level 29, Legendary)

### Manual Sync Test

From CoMiXX sidebar, click the SYNC button. You'll see a toast showing per-endpoint results:
- "Synced to FXStudio, PSStreaming. PSLMS: 404 failed." = Working (PSLMS not set up yet)
- "Synced to FXStudio, PSStreaming, PSLMS" = All endpoints connected

### Health Check

```
GET https://psstreaming.com/api/replit/sync/status
x-webhook-secret: [secret]
```

### CoMiXX Health

```
GET https://pscomixx.com/api/health

Response:
{ "status": "healthy", "db": "connected", ... }
```

---

## QUICK REFERENCE CARD

| Direction | URL | Auth Header | Payload Style |
|-----------|-----|-------------|---------------|
| Any -> CoMiXX | `POST /api/ecosystem/xp-sync` | See per-app table | `user_email`, `total_xp`, `source` |
| CoMiXX -> PSStreaming | `POST /api/xp/sync/incoming` | `x-webhook-secret` | `user_id`, `xp_amount`, `source_platform` |
| CoMiXX -> FX Studio | `POST /functions/v1/xp-sync` | `apikey` + `Bearer` | `event`, `user_email`, `source` |
| CoMiXX -> PSLMS | `POST /api/webhooks/xp-sync` | `X-API-Key` | `event`, `user_email`, `source` |
| CoMiXX -> PSStreaming (content) | `POST /api/replit/sync/content` | `x-webhook-secret` | PSContentBundle v1 |
| FX Studio -> CoMiXX (layouts) | `POST /api/fx-studio/layout-sync` | CORS (cross-origin) | `type`, `pages`/`content` |

---

*Last updated: March 26, 2026*
*Maintained by: PSCoMiXX (Replit) — the central ecosystem hub*
