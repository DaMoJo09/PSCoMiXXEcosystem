# PSCoMiXX Partner Integration API

## Authentication

All integration endpoints require API key authentication via one of:

- Header: `X-API-Key: <your-api-key>`
- Header: `Authorization: Bearer <your-api-key>`

Valid keys: `FX_STUDIO_API_KEY`, `PSLMS_API_KEY`, or `PARTNER_API_KEY` (configured as environment variables).

## Base URL

```
https://your-domain.com/api/v1/integration
```

## Endpoints

### Health Check

```
GET /api/v1/integration/health
```

**Response:**
```json
{
  "status": "operational",
  "version": "1.0.0",
  "timestamp": "2026-04-09T12:00:00.000Z"
}
```

### Get Project

```
GET /api/v1/integration/projects/:id
```

**Access Control:** Only projects with status `published` or `review` are accessible. Draft projects return `403 Forbidden`.

**Response:**
```json
{
  "id": "uuid",
  "title": "My Comic",
  "type": "comic",
  "status": "published",
  "createdAt": "2026-04-09T12:00:00.000Z",
  "updatedAt": "2026-04-09T12:00:00.000Z",
  "data": { ... }
}
```

### Export Project

```
GET /api/v1/integration/projects/:id/export?format=scene-json
```

**Query Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `format` | `scene-json` | Export format |

**Response:**
```json
{
  "project": { "id": "uuid", "title": "My Comic", "type": "comic" },
  "bundle": { ... },
  "exportedAt": "2026-04-09T12:00:00.000Z"
}
```

### Import Asset

```
POST /api/v1/integration/assets/import
```

**Request Body:**
```json
{
  "filename": "character_sprite.png",
  "type": "image",
  "url": "https://partner-cdn.com/assets/character_sprite.png",
  "userId": "user-uuid",
  "metadata": {
    "width": 512,
    "height": 512,
    "source": "reallusion"
  }
}
```

**Response:** `201 Created` with the created asset object.

### Test Webhook

```
POST /api/v1/integration/webhook/test
```

**URL Restriction:** `targetUrl` must be in the allowed domain list (ecosystem domains only). Arbitrary external URLs are rejected to prevent SSRF.

**Request Body:**
```json
{
  "targetUrl": "https://pscomixx.com/webhook",
  "event": "project.published",
  "payload": {
    "projectId": "uuid",
    "title": "My Comic"
  }
}
```

### Render Pipeline Handoff

For Reallusion/Unreal Engine integration. Initiates an async render job.

```
POST /api/v1/integration/render-handoff
```

**URL Restriction:** `callbackUrl` must be in the allowed domain list.

**Request Body:**
```json
{
  "projectId": "uuid",
  "renderEngine": "reallusion-cartoon-animator",
  "outputFormat": "png",
  "callbackUrl": "https://pressstart.tech/render-complete"
}
```

**Response:**
```json
{
  "handoffId": "uuid",
  "status": "queued",
  "projectId": "uuid",
  "renderEngine": "reallusion-cartoon-animator"
}
```

**Callback Webhook Payload (sent to `callbackUrl`):**
```json
{
  "handoffId": "uuid",
  "projectId": "uuid",
  "renderEngine": "reallusion-cartoon-animator",
  "outputFormat": "png",
  "projectData": { ... }
}
```

## Webhook System

### Supported Events

| Event | Trigger |
|-------|---------|
| `project.published` | Project published to platform |
| `project.updated` | Project data changed |
| `asset.imported` | Asset imported via API |
| `render.handoff` | Render job dispatched |
| `export.completed` | Export job finished |
| `user.created` | New user registered |

### Webhook Signature Verification

Incoming webhooks include:
- `X-Webhook-Signature`: HMAC-SHA256 of `{timestamp}.{body}`
- `X-Webhook-Timestamp`: Unix timestamp (ms)

**Verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, timestamp, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Retry Policy

Failed webhook deliveries are retried:
- Up to 3 attempts
- Exponential backoff
- Delivery logs stored in database

## Existing Ecosystem Integrations

### FX Studio (Supabase)

- Asset browser: `GET /api/fx/effects`
- Effect categories: `GET /api/fx/categories`
- Bidirectional `postMessage` communication via `/fx-studio` route
- Uses `FX_STUDIO_API_KEY` for authentication

### Press Start LMS

- Student submission sync
- Assignment notification webhooks
- Uses `PSLMS_API_KEY` for authentication

### Emergent Streaming Platform

- Content sync: `POST /api/publish/sync-emergent`
- Creator profile sync
- Health check: `GET /api/publish/emergent-health`
- Uses `EMERGENT_WEBHOOK_SECRET` for webhook verification

## Integration Flow Example: Reallusion Pipeline

```
1. Partner calls GET /api/v1/integration/projects/:id
   → Gets project metadata and structure

2. Partner calls GET /api/v1/integration/projects/:id/export?format=scene-json
   → Gets full project data for rendering

3. Partner processes render with Cartoon Animator / iClone

4. Partner calls POST /api/v1/integration/assets/import
   → Imports rendered assets back into PSCoMiXX

5. PSCoMiXX dispatches webhook to partner callback URL
   → Confirms asset import, triggers UI update
```
