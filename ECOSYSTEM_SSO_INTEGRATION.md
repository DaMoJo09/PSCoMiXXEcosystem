# Press Start Ecosystem - Universal Login Integration Guide

## Overview

CoMiXX (pscomixx.com) is the **identity provider** for the entire Press Start ecosystem. When a user signs up on CoMiXX, their account, stats, and certifications carry over to every other platform via JWT-based SSO. This works for both **Student** and **Creator** accounts.

## Platform Domains

| App | Domain | Notes |
|-----|--------|-------|
| CoMiXX (Creation) | pscomixx.com | Identity provider, issues tokens |
| FX Studio (Writing) | www.pscomixx.online | Lovable-hosted |
| PS Streaming (Distribution) | psstreaming.com | Emergent-hosted |
| Press Start LMS (Learning) | pressstart.tech | Certification tracking |

## How It Works

```
User signs up on CoMiXX
         |
    CoMiXX issues JWT token with all user data
         |
    +---------+---------+---------+
    |         |         |         |
FX Studio  Streaming    LMS    (future)
    |         |         |
 Verify token → create/update local user → stats sync
```

## What's in the SSO Token

Every JWT token issued by CoMiXX contains:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "Display Name",
  "username": "username",
  "role": "creator",
  "accountType": "creator",
  "avatar": "https://...",
  "xp": 5000,
  "level": 15,
  "levelTitle": "Expert",
  "totalMinutes": 1200,
  "subscriptionTier": "pro",
  "iss": "pscomixx",
  "iat": 1711468800,
  "exp": 1711472400
}
```

**accountType** is either `"student"` (ages 6-17) or `"creator"` (18+). Partner platforms should respect this for content filtering and feature gating.

**subscriptionTier** values: `free`, `creator`, `pro`, `studio`, `lifetime`, `school`

---

## Integration Flow for Each Platform

### Flow A: User clicks "Go to FX Studio" from CoMiXX sidebar

1. CoMiXX frontend calls `GET /api/auth/sso/redirect?target=fxstudio`
2. CoMiXX returns: `{ "redirectUrl": "https://www.pscomixx.online/sso/callback?token=JWT_HERE&source=pscomixx" }`
3. User's browser opens FX Studio with the token in the URL
4. **FX Studio reads the token, verifies it, creates/updates local user**

### Flow B: User arrives at FX Studio without being logged in ("Login with CoMiXX")

1. FX Studio redirects the user to:
   ```
   https://pscomixx.com/api/auth/sso/authorize?redirect_uri=https://www.pscomixx.online/sso/callback&app=fxstudio
   ```
2. If user is logged into CoMiXX → CoMiXX generates token and redirects back to FX Studio
3. If user is NOT logged in → CoMiXX shows login page, then redirects back with token
4. FX Studio receives: `https://www.pscomixx.online/sso/callback?token=JWT_HERE&source=pscomixx`

### Flow C: User arrives at CoMiXX from another platform

1. Partner platform redirects to:
   ```
   https://pscomixx.com/sso/callback?token=PARTNER_JWT&source=fxstudio
   ```
2. CoMiXX verifies the token via `POST /api/auth/sso/ecosystem-login`
3. If valid, establishes session and redirects to dashboard

---

## API Endpoints on CoMiXX (pscomixx.com)

### 1. Issue Token (for logged-in CoMiXX users)
```
POST https://pscomixx.com/api/auth/sso/token
Auth: Session cookie (CoMiXX login required)

Response:
{
  "token": "eyJhbGc...",
  "expiresIn": 3600
}
```

### 2. Verify Token (partner platforms call this)
```
POST https://pscomixx.com/api/auth/sso/verify
Body: { "token": "eyJhbGc..." }

Response:
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Display Name",
    "username": "username",
    "role": "creator",
    "accountType": "creator",
    "avatar": "https://...",
    "xp": 5000,
    "level": 15,
    "levelTitle": "Expert",
    "totalMinutes": 1200,
    "subscriptionTier": "pro",
    "certifications": ["ps-creator-comics", "ps-card-designer"]
  }
}
```

### 3. Get SSO Redirect URL
```
GET https://pscomixx.com/api/auth/sso/redirect?target=fxstudio
Auth: Session cookie

Response:
{ "redirectUrl": "https://www.pscomixx.online/sso/callback?token=JWT&source=pscomixx" }
```
Targets: `fxstudio`, `streaming`, `lms`

### 4. Authorize (OAuth-style redirect)
```
GET https://pscomixx.com/api/auth/sso/authorize?redirect_uri=CALLBACK_URL&app=fxstudio
```
- If user is logged in: redirects immediately to `CALLBACK_URL?token=JWT&source=pscomixx`
- If user is NOT logged in: redirects to CoMiXX login page, then back to callback
- `redirect_uri` must be on an allowed ecosystem domain

### 5. Ecosystem Login (establish session from token)
```
POST https://pscomixx.com/api/auth/sso/ecosystem-login
Body: { "token": "eyJhbGc...", "source": "fxstudio" }

Response:
{
  "success": true,
  "user": { "id": "...", "email": "...", "name": "...", ... }
}
```
Sets a session cookie — user is now logged into CoMiXX.

### 6. List Platforms
```
GET https://pscomixx.com/api/auth/sso/platforms

Response:
{
  "platforms": [
    { "key": "comixx", "name": "PSCoMiXX", "domain": "https://pscomixx.com", "forStudents": true, "forCreators": true },
    { "key": "fxstudio", "name": "FX Studio", "domain": "https://www.pscomixx.online", "forStudents": true, "forCreators": true },
    { "key": "streaming", "name": "PS Streaming", "domain": "https://psstreaming.com", "forStudents": false, "forCreators": true },
    { "key": "lms", "name": "Press Start LMS", "domain": "https://pressstart.tech", "forStudents": true, "forCreators": false }
  ]
}
```

---

## What Each Platform Needs to Build

### FX Studio (Lovable - www.pscomixx.online)

1. **SSO Callback Page** at `/sso/callback`
   - Reads `token` and `source` from URL params
   - Calls `POST https://pscomixx.com/api/auth/sso/verify` with the token
   - If valid: create or update local user with returned data (email, name, xp, level, accountType, subscriptionTier, certifications)
   - Set local session/auth state
   - Redirect to dashboard

2. **"Login with CoMiXX" Button** on login page
   - Redirects to: `https://pscomixx.com/api/auth/sso/authorize?redirect_uri=https://www.pscomixx.online/sso/callback&app=fxstudio`

3. **Student/Creator Handling**
   - Check `accountType` from token: `"student"` or `"creator"`
   - Students: filter mature content, restrict certain features
   - Both: display XP, level, levelTitle in the UI

4. **Stats Sync**
   - On login via SSO, update local user record with latest XP, level, subscriptionTier
   - When user earns XP on FX Studio, sync to Streaming: `POST https://psstreaming.com/api/xp/sync/incoming`
   - CoMiXX already syncs XP bidirectionally, so FX Studio XP will reach CoMiXX via Streaming relay

### PS Streaming (Emergent - psstreaming.com)

1. **SSO Callback Page** at `/sso/callback`
   - Same flow as FX Studio above
   - Reads token, verifies via CoMiXX, creates/updates local user

2. **"Login with CoMiXX" Button**
   - Redirects to: `https://pscomixx.com/api/auth/sso/authorize?redirect_uri=https://psstreaming.com/sso/callback&app=streaming`

3. **Student Filtering**
   - Students (`accountType: "student"`) should NOT see Streaming (it's creator-only)
   - If a student token arrives, show a friendly "This platform is for creators 18+" message

4. **Stats Display**
   - Show creator's XP, level, certifications on their Streaming profile
   - Token includes all of this data

### Press Start LMS (pressstart.tech)

1. **SSO Callback Page** at `/sso/callback`
   - Same flow as above
   - Focus on `accountType: "student"` users primarily

2. **"Login with CoMiXX" Button**
   - Redirects to: `https://pscomixx.com/api/auth/sso/authorize?redirect_uri=https://pressstart.tech/sso/callback&app=lms`

3. **Student Focus**
   - LMS is primarily for students — show course progress, assignments, certifications
   - Creators (`accountType: "creator"`) can access teacher/admin features if `role: "teacher"` or `role: "admin"`

4. **Certification Validation**
   - To check if a user qualifies for a cert: `GET https://pscomixx.com/api/certifications/validate/:email` (requires x-webhook-secret header)
   - Returns XP, level, project counts, published counts, and already-earned certs

---

## Shared JWT Secret

All platforms must use the same signing secret to verify tokens locally (faster than calling the verify endpoint):

**Secret**: Use the `ECOSYSTEM_JWT_SECRET` environment variable. CoMiXX falls back to `SESSION_SECRET` if not set.

**OR** call the verify endpoint on CoMiXX — no shared secret needed, just POST the token to `/api/auth/sso/verify`.

---

## Security Notes

- Tokens expire after 1 hour (3600 seconds)
- `redirect_uri` in the authorize flow is validated against allowed ecosystem domains only
- Webhook secret (`x-webhook-secret` header) is required for cert validation and sync endpoints
- User matching across platforms uses **email** as the primary key
- XP sync uses "highest value wins" — never subtracts XP
- Student accounts (ages 6-17) must have appropriate content filtering on every platform

---

## Account Type Matrix

| Feature | Student (6-17) | Creator (18+) |
|---------|---------------|---------------|
| CoMiXX - Create content | Yes | Yes |
| FX Studio - Write scripts | Yes | Yes |
| PS Streaming - Publish | No | Yes |
| Press Start LMS - Courses | Yes | Teacher role only |
| Marketplace - Buy | Yes (filtered) | Yes |
| Marketplace - Sell | No | Yes |
| XP & Leveling | Yes | Yes |
| Certifications | Yes | Yes |

---

## Quick Test

To verify SSO is working on your platform:

1. Sign up on pscomixx.com with a test account
2. Open: `https://pscomixx.com/api/auth/sso/authorize?redirect_uri=YOUR_CALLBACK_URL&app=YOUR_APP_KEY`
3. You should be redirected back with `?token=...&source=pscomixx`
4. Decode the JWT (base64) to see the full user payload
5. Call `POST https://pscomixx.com/api/auth/sso/verify` with the token to get full data + certifications
