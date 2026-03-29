# CoMiXX → FX Studio: Iframe-to-Tab Migration Guide

> **For**: Replit team (pscomixx.com)  
> **From**: FX Studio team (pscomixx.online / Lovable)  
> **Date**: 2026-03-29  
> **Status**: Required change — iframe embedding is blocked by hosting headers

---

## Problem

Lovable's hosting sends `X-Frame-Options` / `Content-Security-Policy` headers that **block cross-origin iframe embedding**. This means `pscomixx.online` cannot be loaded inside an `<iframe>` on `pscomixx.com`. These headers cannot be customized on the Lovable side.

## Solution: New-Tab + postMessage Bridge

Replace all `<iframe>` embeds of FX Studio with `window.open()` calls and use the `postMessage` API for bidirectional communication.

---

## 1. Opening FX Studio (CoMiXX Side)

### Before (broken)
```html
<iframe src="https://pscomixx.online/?import=EFFECT_ID&returnProject=PROJECT_ID" />
```

### After (working)
```javascript
// Open FX Studio in a new tab
function openFxStudio({ effectId, returnProjectId, panelId, mode }) {
  const params = new URLSearchParams();
  if (effectId) params.set('import', effectId);
  if (returnProjectId) params.set('returnProject', returnProjectId);
  if (panelId) params.set('panelId', panelId);
  if (mode) params.set('mode', mode); // e.g. 'studio', 'filters', 'draw'

  const url = `https://pscomixx.online/?${params.toString()}`;
  const studioWindow = window.open(url, 'fx-studio', 'noopener=false');

  // Store reference for optional direct messaging
  window.__fxStudioWindow = studioWindow;
}
```

---

## 2. Receiving Assets Back (CoMiXX Side)

Set up a global `message` listener to receive finished assets from FX Studio:

```javascript
// Add this ONCE at app initialization
window.addEventListener('message', (event) => {
  // SECURITY: Always verify origin
  if (event.origin !== 'https://pscomixx.online' &&
      event.origin !== 'https://panel-play-forge.lovable.app') {
    return;
  }

  const { type, payload } = event.data || {};

  switch (type) {
    case 'fx-studio-ready':
      // FX Studio tab has loaded and is ready to receive data
      console.log('FX Studio connected');
      break;

    case 'panel-fx-return':
      // User clicked "Return to CoMiXX" with a finished asset
      handleReturnedAsset(payload);
      break;

    case 'asset-export':
      // User exported an asset via "Send To → CoMiXX"
      handleExportedAsset(payload);
      break;

    case 'fx-studio-closed':
      // User is done and closing the studio tab
      console.log('FX Studio session ended');
      break;
  }
});

function handleReturnedAsset(payload) {
  // payload shape:
  // {
  //   effectId: string,          // ID of the effect in Supabase
  //   projectId: string,         // The returnProject ID
  //   panelId: string | null,    // source_panel_id if round-trip
  //   previewUrl: string | null, // Data URL or hosted URL of the result
  //   assetTag: string,          // e.g. 'panel-fx-return', 'fx-overlay'
  //   name: string,              // User-given name
  //   type: string,              // 'static-asset', 'animated', etc.
  //   mode_hints: object | null  // Comic/VN/CYOA mode metadata
  // }

  if (payload.panelId) {
    // Round-trip: replace or overlay the original panel
    updatePanelWithFx(payload.projectId, payload.panelId, payload);
  } else {
    // General export: add to project asset library
    addToProjectAssets(payload.projectId, payload);
  }
}
```

---

## 3. Sending Data TO FX Studio (CoMiXX Side)

If you need to push data to FX Studio after it opens (e.g., panel image for editing):

```javascript
// Wait for the 'fx-studio-ready' message, then send
function sendToFxStudio(data) {
  if (window.__fxStudioWindow && !window.__fxStudioWindow.closed) {
    window.__fxStudioWindow.postMessage({
      type: 'comixx-panel-data',
      payload: data
    }, 'https://pscomixx.online');
  }
}

// Example: send a panel image for round-trip editing
sendToFxStudio({
  panelId: 'panel-uuid-123',
  projectId: 'project-uuid-456',
  imageUrl: 'https://your-cdn.com/panels/panel-123.png',
  panelIndex: 3,
  pageIndex: 1
});
```

---

## 4. What FX Studio Will Send (Our Side)

We are implementing the following `postMessage` events from FX Studio:

| Event Type | When | Payload |
|---|---|---|
| `fx-studio-ready` | Tab loads & detects `returnProject` param | `{ returnProject, panelId }` |
| `panel-fx-return` | User clicks "Return to CoMiXX" | Full asset data (see shape above) |
| `asset-export` | User uses "Send To → CoMiXX" menu | Full asset data |
| `fx-studio-closed` | User closes/navigates away | `{ returnProject }` |

---

## 5. UI Recommendations

### Replace iframe containers with buttons:
```jsx
// Instead of an iframe panel:
<button onClick={() => openFxStudio({
  returnProjectId: project.id,
  panelId: panel.id,
  mode: 'studio'
})}>
  ✏️ Edit in FX Studio
</button>

// Show a status indicator while studio is open:
{isStudioOpen && (
  <div className="studio-status">
    🟢 FX Studio is open in another tab — 
    edits will sync back automatically
  </div>
)}
```

### Handle tab closing:
```javascript
// Poll to detect if the user closed the tab
const checkStudioAlive = setInterval(() => {
  if (window.__fxStudioWindow?.closed) {
    clearInterval(checkStudioAlive);
    setIsStudioOpen(false);
  }
}, 2000);
```

---

## 6. Existing API Sync Still Works

The Supabase-based sync via the `get-effects` edge function remains unchanged. The `postMessage` bridge is an **additional** real-time channel for immediate feedback. Assets are still persisted to the shared `effects` table with:
- `project_id` → links to CoMiXX project
- `source_panel_id` → links to specific panel (round-trip)
- `asset_tag` → categorization (`panel-fx-return`, `fx-overlay`, `character`, etc.)
- `mode_hints` → comic/VN/CYOA rendering metadata

CoMiXX can always fall back to polling the effects table if `postMessage` isn't received.

---

## 7. Migration Checklist

- [ ] Remove all `<iframe src="pscomixx.online...">` embeds
- [ ] Add `window.open()` launcher function
- [ ] Add global `message` event listener with origin validation
- [ ] Update "Edit in FX Studio" buttons to use new launcher
- [ ] Add visual indicator showing studio is open in another tab
- [ ] Handle `panel-fx-return` messages to update panels
- [ ] Handle `asset-export` messages to add to project library
- [ ] Test with both `pscomixx.online` and `panel-play-forge.lovable.app` origins
- [ ] Add tab-closed detection polling

---

## Questions?

The FX Studio side will implement the `postMessage` sender once this guide is confirmed. We'll match the exact payload shapes above.
