# CoMiXX ↔ FX Studio — COMPLETE Sync & Asset Library Integration Spec

> **Document for**: CoMiXX (Replit) development team  
> **From**: FX Studio (PressPlays / Lovable)  
> **Date**: 2026-03-28  
> **Version**: 2.0 — FULL COVERAGE UPDATE  
> **Priority**: 🔴 CRITICAL — This connection MUST always work

---

## ⚠️ CRITICAL RELIABILITY REQUIREMENT

**This sync pipeline is the backbone of the PressStart ecosystem.** Every creative mode in FX Studio pushes assets to CoMiXX. If the `get-effects` endpoint goes down or changes its contract, the entire production workflow breaks for all users across both platforms.

### Non-Negotiable Requirements:
1. **The `get-effects` endpoint must remain backward-compatible** — never remove or rename fields
2. **The endpoint must accept `type: "library-asset"` alongside existing types** (`static-asset`, `script-package`)
3. **Response must always be valid JSON** with `Content-Type: application/json`
4. **The endpoint must handle payloads up to 1MB** (preview images are capped at 500KB, metadata is small)
5. **If CoMiXX adds authentication requirements**, coordinate with FX Studio first — the anon key flow must continue working for unauthenticated saves
6. **No rate limiting below 60 requests/minute per user** — bulk sync scenarios can fire rapidly

---

## 1. Complete Mode Coverage — ALL 12 Modes Sync to CoMiXX

Every creative mode in FX Studio now has a **CoMiXX export button**. Here's the complete map:

| # | Mode | `type` | `asset_tag` | What's Sent |
|---|------|--------|-------------|-------------|
| 1 | **FX Studio** | `static-asset` | `fx-overlay` | Multi-layer FX compositions |
| 2 | **Character Creator** | `character` | `character-art` | Character builds + poses |
| 3 | **Portrait Mode** | `character` | `character-art` | Portrait compositions |
| 4 | **Graffiti / Drawing** | `graffiti` | `fx-overlay` | Hand-drawn art + animations |
| 5 | **BG FX Mode** | `background-fx` | `background` | Procedural backgrounds |
| 6 | **Filter Editor** | `filtered-image` | `fx-overlay` | Filtered/processed images |
| 7 | **Cover Maker** | `cover` | `cover-front` / `cover-back` | Book/comic covers |
| 8 | **Panel Layout** | `layout-spread` | `page-layout` | Comic page layouts |
| 9 | **Overlay Studio** | `overlay` | `fx-overlay` | Animated overlay effects |
| 10 | **Price Tag Maker** | `price-tag` | `prop` | Stylized price tags |
| 11 | **Title Maker** | `title` | `title-card` | Comic titles + text art |
| 12 | **Bubble Editor** | `bubble` | `speech-bubble` | Speech bubbles + dialogue |
| 13 | **Script Mode** | `script-package` | `script` | Full scripts with `script_data` |
| 14 | **Asset Library** (☁️) | `library-asset` | *(varies by category)* | Any saved asset |

### Asset Library Cloud Sync Tag Mapping

When users click the ☁️ cloud icon in the Asset Library, the category maps to:

| Library Category | `asset_tag` |
|---|---|
| `character` | `character-art` |
| `background` | `background` |
| `effect` | `fx-overlay` |
| `overlay` | `fx-overlay` |
| `bubble` | `speech-bubble` |
| `cover` | `cover` |
| `title` | `title-card` |
| `preset` | `prop` |
| `other` | `prop` |

---

## 2. Payload Format (Universal)

**Endpoint:**
```
POST https://upivslgwjtvqymonliib.supabase.co/functions/v1/get-effects
```

**Headers:**
```
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaXZzbGd3anR2cXltb25saWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDQ0OTcsImV4cCI6MjA4NzM4MDQ5N30.5gt6Os01a2QCmKiYf2qNdvDue-NPwjUN3V638oe4Awk
```

**Body:**
```json
{
  "name": "ASSET NAME",
  "layers": [],
  "canvas_background": "transparent",
  "preview_data_url": "<base64 JPEG, max 500KB, 320×480>",
  "total_frames": 1,
  "fps": 1,
  "type": "library-asset | static-asset | character | graffiti | ...",
  "description": "ASSET NAME",
  "layer_count": 0,
  "asset_tag": "character-art | fx-overlay | background | ...",
  "project_id": null,
  "target_page": null,
  "source_panel_id": null,
  "mode_hints": { "comic": {}, "vn": {}, "cyoa": {} },
  "script_data": null
}
```

### Retry Protocol

FX Studio implements an automatic retry:
1. First attempt sends the full payload with `preview_data_url`
2. If the response is non-JSON or status >= 500, it retries **without** the preview image
3. 30-second timeout per attempt
4. Toast feedback to the user on success/failure

**CoMiXX should handle this gracefully** — assets without `preview_data_url` are valid.

---

## 3. Full-Resolution Image Access

Thumbnails in `preview_data_url` are low-res. Full-res PNGs are in Supabase Storage:

**Bucket:** `asset-library` (public)  
**URL pattern:**
```
https://upivslgwjtvqymonliib.supabase.co/storage/v1/object/public/asset-library/{category}/{asset-id}.png
```

### CoMiXX Implementation:
- Use `preview_data_url` for sidebar thumbnails (fast, small)
- Fetch full-res from storage URL on drag-to-canvas (lazy load)
- Cache locally after first fetch

---

## 4. Building the Asset Library in CoMiXX (Mirror Implementation)

### IndexedDB Schema

```javascript
const DB_NAME = "comixx-asset-library";  // or "pressplays-asset-library" if sharing
const STORE_NAME = "assets";
const DB_VERSION = 1;

// Record schema:
{
  id: "asset-1711654321-ab3f",
  name: "My Character",
  category: "character",  // character | background | effect | bubble | cover | title | overlay | preset | other
  dataUrl: "data:image/png;base64,...",
  thumbnailUrl: "...",
  createdAt: 1711654321000,
  tags: ["character", "hero"],
  metadata: {},
  syncedToCloud: false
}

// Indexes:
store.createIndex("category", "category", { unique: false });
store.createIndex("createdAt", "createdAt", { unique: false });
```

### Required Features:
1. **Save to Library button** in every creation mode
2. **Category sidebar** with counts
3. **Search** across name and tags
4. **Cloud sync button** (☁️) per asset → POST to `get-effects`
5. **Download button** → export as PNG
6. **Delete button** → remove from IndexedDB
7. **Bulk Sync All** → iterate unsynced assets

---

## 5. Bidirectional Sync (CoMiXX → FX Studio)

For CoMiXX to push assets TO FX Studio, use the same endpoint:

```
POST https://upivslgwjtvqymonliib.supabase.co/functions/v1/get-effects
Headers: { "Content-Type": "application/json", "apikey": "<anon_key>" }
Body: { "name": "...", "type": "library-asset", "asset_tag": "...", ... }
```

FX Studio will detect incoming assets by `project_id` and `source_panel_id` for round-trip flows.

---

## 6. Database Queries for CoMiXX

### Fetch all library assets:
```sql
SELECT * FROM effects WHERE type = 'library-asset' ORDER BY created_at DESC;
```

### Fetch by tag for Asset Dock folders:
```sql
SELECT * FROM effects WHERE type = 'library-asset' AND asset_tag = 'character-art' ORDER BY created_at DESC;
```

### Fetch ALL FX Studio assets (any type):
```sql
SELECT * FROM effects ORDER BY created_at DESC LIMIT 100;
```

---

## 7. Authentication & User Matching

| Method | When to Use |
|---|---|
| Anon key in `apikey` header | Unauthenticated saves, service-to-service |
| `Authorization: Bearer <jwt>` | Authenticated user actions |
| `x-webhook-secret` header | Server-to-server ecosystem events |

User matching across platforms uses **email** as the primary key:
- `user_profiles.email` ↔ `user_profiles.comixx_user_id`
- All XP events use `user_email` for cross-platform attribution

---

## 8. Credentials Reference

| Key | Value |
|---|---|
| FX Studio Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaXZzbGd3anR2cXltb25saWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDQ0OTcsImV4cCI6MjA4NzM4MDQ5N30.5gt6Os01a2QCmKiYf2qNdvDue-NPwjUN3V638oe4Awk` |
| Edge Function URL | `https://upivslgwjtvqymonliib.supabase.co/functions/v1` |
| Storage Bucket | `asset-library` (public) |
| Webhook Secret | `whsec_45923106c2f0da38c1ec0d10e92accd6666bfeb3610c84de0144c56933bc3dc6` |

---

## 9. Integration Checklist for CoMiXX (Replit)

### Phase 1: Receive Assets ✅
- [ ] Ensure `get-effects` endpoint accepts `type: "library-asset"` (it already does via INSERT to `effects` table)
- [ ] Query `effects` table for synced assets and display in Asset Dock
- [ ] Group assets by `asset_tag` into folders (Characters, Backgrounds, FX, Bubbles, etc.)
- [ ] Lazy-load full-res images from storage bucket on demand

### Phase 2: Build Local Library 📦
- [ ] Create IndexedDB store (`comixx-asset-library`)
- [ ] Add "Save to Library" button to Panel Editor, Character tools, etc.
- [ ] Implement category sidebar + search + delete
- [ ] Add cloud sync (☁️) button that POSTs to `get-effects`

### Phase 3: Bidirectional Flow 🔄
- [ ] Push CoMiXX assets back to FX Studio via `get-effects`
- [ ] Support round-trip editing with `project_id` + `source_panel_id`
- [ ] Detect returning assets and auto-replace in panels

### Phase 4: Reliability 🛡️
- [ ] Add retry logic (retry without preview on failure)
- [ ] Implement offline queue for sync failures
- [ ] Health check endpoint for monitoring
- [ ] Alert on sync failure rates > 5%

---

## 10. IMPORTANT NOTES FOR REPLIT TEAM

1. **DO NOT change the `effects` table schema** without coordinating with FX Studio. Both platforms depend on the same columns.
2. **DO NOT add authentication requirements** to the `get-effects` endpoint without providing a migration path. The anon key flow is used for unauthenticated saves.
3. **The `preview_data_url` field can be null** — always handle this gracefully (show a placeholder).
4. **Test with large payloads** — some FX compositions have complex layer data in the `layers` JSON field.
5. **The `asset_tag` taxonomy has 21 tags** — see the [Universal Integration Spec](./CoMiXX-Universal-Integration-Spec.md) for the complete list.
6. **All 12+ creative modes in FX Studio now sync to CoMiXX** — expect a variety of `type` values, not just `static-asset`.

---

*This is a living document. Any changes to the sync protocol must be coordinated between both platforms to prevent breaking the production workflow for users.*
