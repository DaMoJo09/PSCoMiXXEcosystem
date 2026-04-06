# 📋 Replit Sync Note: Send Comics & Assets to HOPs

**From:** Press Start FX Studio Team  
**To:** CoMiXX / Replit Team  
**Date:** 2026-04-06  
**Priority:** High  
**Status:** Ready for Implementation

---

## 🎯 Goal

Enable CoMiXX users to send **comic panels, pages, characters, covers, and any creative asset** directly into the **HOP Builder** as scenes or layers — creating a seamless pipeline from static comics to looping short-form video content.

---

## 🔄 The Flow

```
CoMiXX (pscomixx.com)                    FX Studio HOP Builder (pscomixx.online/hops)
┌──────────────────────┐                 ┌──────────────────────────────────┐
│ Comic Project        │                 │ HOP Builder                      │
│  • Pages / Panels    │── SEND TO ────→ │  • Auto-creates scene per asset  │
│  • Characters        │   HOP          │  • Layers with FreeTransform     │
│  • Covers            │                 │  • Text overlays preserved       │
│  • Card Art          │                 │  • Both Standard & Moving modes  │
│  • Any asset         │                 │  • Seamless panoramic stitching  │
│                      │                 │                                  │
│                      │←── RETURN ──────│  • Published HOP returned with   │
│                      │   tagged asset  │    source_panel_id for placement │
└──────────────────────┘                 └──────────────────────────────────┘
```

---

## 📡 API Contract: Sending Assets to HOP Builder

### Method 1: URL Parameter Launch (Recommended for UI "Send to HOP" buttons)

Open FX Studio HOP Builder with asset data via URL:

```
https://pscomixx.online/hops?import={effectId}&returnProject={comixProjectId}
```

**Parameters:**
| Param | Required | Description |
|---|---|---|
| `import` | Yes | Effect/asset ID from the `effects` table (synced via `get-effects` API) |
| `returnProject` | No | CoMiXX project ID for round-trip return tagging |
| `returnPanel` | No | Source panel ID for auto-replacement on return |

**Example:**
```
https://pscomixx.online/hops?import=abc-123&returnProject=proj-456&returnPanel=panel-789
```

The HOP Builder will:
1. Fetch the asset from `get-effects` edge function
2. Create a new scene with the asset as background
3. Auto-create a "Background" media layer
4. Show a "Return to CoMiXX" button if `returnProject` is set

---

### Method 2: Direct API Push (Server-to-Server)

Push assets to the FX Studio effects table for HOP consumption:

```
POST https://upivslgwjtvqymonliib.supabase.co/functions/v1/get-effects
Headers: {
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaXZzbGd3anR2cXltb25saWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDQ0OTcsImV4cCI6MjA4NzM4MDQ5N30.5gt6Os01a2QCmKiYf2qNdvDue-NPwjUN3V638oe4Awk",
  "Content-Type": "application/json"
}
Body: {
  "name": "Comic Panel - Issue 3 Page 5",
  "type": "hop-asset",
  "asset_tag": "hop-scene",
  "project_id": "comixx-project-uuid",
  "source_panel_id": "panel-uuid",
  "preview_data_url": "<base64 PNG — max 900KB>",
  "layers": [],
  "mode_hints": {
    "hop": {
      "suggestedDuration": 5,
      "assetType": "image",
      "transition": "fade"
    }
  }
}
```

**Asset Tag Values for HOP Integration:**

| `asset_tag` | Use Case |
|---|---|
| `hop-scene` | Asset intended as a HOP scene background |
| `hop-overlay` | Asset intended as a HOP overlay layer |
| `hop-loop` | Full HOP project (contains complete project data) |
| `cover` | Cover art — auto-suggested as first scene |
| `interior-page` | Comic page — each page becomes a scene |
| `splash-page` | Splash art — suggested as hero/opening scene |
| `character-sheet` | Character art — added as a layer, not a scene |

---

### Method 3: Batch Send (Multiple Pages → Multi-Scene HOP)

To convert an entire comic chapter into a HOP slideshow:

```
POST https://upivslgwjtvqymonliib.supabase.co/functions/v1/get-effects
```

Send **one request per page/panel**, each tagged with:

```json
{
  "name": "Page 1",
  "type": "hop-asset",
  "asset_tag": "hop-scene",
  "project_id": "comixx-project-uuid",
  "mode_hints": {
    "hop": {
      "sceneOrder": 0,
      "suggestedDuration": 5,
      "assetType": "image",
      "transition": "fade",
      "caption": "Chapter 1 - The Beginning"
    }
  }
}
```

The HOP Builder's Asset Browser automatically filters `asset_tag = "hop-scene"` and displays them for drag-and-drop scene assembly. The `sceneOrder` hint allows CoMiXX to suggest the intended sequence.

---

## 🔙 Return Flow: HOP → CoMiXX

When a user finishes editing in HOP Builder and clicks "Return to CoMiXX":

1. FX Studio saves the asset with `source_panel_id` and `project_id` metadata
2. Sends a `postMessage` to `window.opener` (if launched as a tab):

```javascript
window.opener.postMessage({
  type: "panel-fx-return",
  projectId: "comixx-project-uuid",
  panelId: "panel-uuid",
  assetUrl: "<exported PNG data URL>",
  assetType: "hop-export",
  metadata: {
    sceneCount: 5,
    totalDuration: 25,
    hasAudio: true,
    hopProjectId: "hop-uuid"
  }
}, "https://pscomixx.com");
```

3. CoMiXX receives the message and can:
   - Replace the source panel with the HOP thumbnail
   - Link the panel to the live HOP for playback
   - Display a "▶ Play HOP" overlay on the panel

---

## 🎬 What CoMiXX Should Build

### 1. "Send to HOP" Button (on panels, pages, covers)

```tsx
// Add to panel context menu / toolbar
<button onClick={() => {
  // 1. Upload asset to FX Studio effects table with asset_tag: "hop-scene"
  // 2. Open HOP Builder: window.open(`https://pscomixx.online/hops?import=${assetId}&returnProject=${projectId}`)
}}>
  🎬 Send to HOP
</button>
```

### 2. "Convert to HOP" Button (on comic projects)

Batch-send all pages as scenes:

```tsx
<button onClick={() => {
  // For each page in project:
  //   POST to get-effects with asset_tag: "hop-scene", mode_hints.hop.sceneOrder = pageIndex
  // Then open: window.open(`https://pscomixx.online/hops`)
  // User sees all pages in HOP Asset Browser, ready to assemble
}}>
  📖 Convert Comic to HOP
</button>
```

### 3. Listen for Return Messages

```tsx
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.origin !== "https://pscomixx.online") return;
    if (event.data?.type === "panel-fx-return") {
      const { projectId, panelId, assetUrl, metadata } = event.data;
      // Update panel with HOP thumbnail/link
      // Show "HOP linked" indicator on panel
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, []);
```

---

## 🎵 Audio Handling

When sending assets to HOPs, CoMiXX can also suggest audio:

```json
{
  "mode_hints": {
    "hop": {
      "suggestedAudioUrl": "https://..../track.mp3",
      "suggestedBpm": 120,
      "audioLicense": "cc-by-sa"
    }
  }
}
```

The HOP Builder will auto-attach the audio if provided.

---

## 🆕 New HOP Features Available

The HOP Builder now supports:

| Feature | Description |
|---|---|
| **Standard Mode** | Scene-cycling playback with cut/fade/zoom/glitch transitions |
| **Moving Mode** | Roku-style panoramic horizontal scroll (screensaver effect) |
| **Seamless Stitching** | Removes scene borders for continuous panoramic look |
| **Free Transform** | All layers in both modes support drag/resize/rotate handles |
| **Multi-Layer System** | Media, text, effect layers per scene with full z-ordering |
| **Beat React** | Layers pulse/bounce/shake to BPM |
| **Vibe Modes** | One-tap color grading (Lo-fi, Cyberpunk, Noir, etc.) |
| **Zone Out** | Fullscreen immersive playback mode |
| **Gapless Audio** | Web Audio API seamless loop (no gap on repeat) |
| **Export** | PNG, GIF, WebM/MP4 with social media presets |

---

## 📊 XP Events to Fire

When CoMiXX sends content to HOPs, trigger these XP events:

| Action | Event | XP |
|---|---|---|
| User sends panel to HOP | `hop.asset.sent` | 10 |
| User converts comic to HOP | `hop.comic.converted` | 25 |
| HOP created from CoMiXX asset | `hop.created` | 10 |
| HOP published with CoMiXX content | `hop.published` | 100 |

Fire via: `POST psstreaming.com/api/xp/sync/incoming`

---

## ⚡ Quick Start Checklist for Replit Team

- [ ] Add "Send to HOP" button on comic panels/pages
- [ ] POST assets to `get-effects` with `asset_tag: "hop-scene"` and `type: "hop-asset"`
- [ ] Open HOP Builder via `window.open()` with `?import=` parameter
- [ ] Add "Convert Comic to HOP" for batch page→scene conversion
- [ ] Listen for `postMessage` return events from `pscomixx.online`
- [ ] Display HOP link/thumbnail on source panels after return
- [ ] Fire XP events for HOP-related actions
- [ ] Support `mode_hints.hop.sceneOrder` for suggested sequencing
- [ ] (Optional) Include audio suggestions in `mode_hints`

---

## 🔑 Credentials Reference

| Key | Value |
|---|---|
| FX Studio API URL | `https://upivslgwjtvqymonliib.supabase.co/functions/v1` |
| FX Studio Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaXZzbGd3anR2cXltb25saWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDQ0OTcsImV4cCI6MjA4NzM4MDQ5N30.5gt6Os01a2QCmKiYf2qNdvDue-NPwjUN3V638oe4Awk` |
| HOP Builder URL | `https://pscomixx.online/hops` |
| Webhook Secret | `whsec_45923106c2f0da38c1ec0d10e92accd6666bfeb3610c84de0144c56933bc3dc6` |

---

*Questions? Reference `CoMiXX-HOPs-Integration-Spec.md` and `CoMiXX-Round-Trip-Integration-Spec.md` for full API details.*
