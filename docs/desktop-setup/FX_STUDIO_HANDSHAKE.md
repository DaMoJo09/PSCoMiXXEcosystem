# FX Studio ↔ PSCoMiXX Handshake (paste into the FX Studio Replit chat)

The FX button in PSCoMiXX opens `https://www.pscomixx.online` in a popup
window and then waits for FX Studio to identify itself with a `postMessage`
handshake. **If that handshake code is missing on the FX Studio side, the
connection bar in PSCoMiXX never turns green and asset return is dropped.**

This is the missing piece. Add the snippet below to FX Studio (e.g. in
`src/main.tsx`, `src/App.tsx`, or any module that runs on every page load)
and redeploy `pscomixx.online`. Nothing else needs to change.

```ts
// FX Studio ↔ PSCoMiXX handshake.
// PSCoMiXX opens us in a popup. We must:
//   1. Announce we're alive ("fx-studio-ready")
//   2. Reply to its keep-alive pings ("comixx-ping" → "fx-studio-pong")
//   3. Tell it we're closing ("fx-studio-closed") on unload
//   4. Send "panel-fx-return" / "asset-export" payloads back when the user
//      finishes an effect.
const COMIXX_ORIGINS = [
  "https://pscomixx.com",
  "https://www.pscomixx.com",
  // Replit dev preview hosts — keep these for testing
  /^https:\/\/[a-z0-9-]+\.replit\.dev$/,
  /^https:\/\/[a-z0-9-]+\.riker\.replit\.dev$/,
];

function isComixxOrigin(origin: string): boolean {
  return COMIXX_ORIGINS.some(o =>
    typeof o === "string" ? o === origin : o.test(origin)
  );
}

function postToOpener(message: unknown) {
  if (!window.opener || window.opener.closed) return;
  // We don't know the exact opener origin (could be www. or apex), so post
  // with "*" — PSCoMiXX validates the source window itself.
  try {
    window.opener.postMessage(message, "*");
  } catch {
    // Cross-origin error — opener was navigated away. Safe to ignore.
  }
}

if (window.opener) {
  // 1. Initial handshake — fire on every load + a couple of retries because
  //    the listener on the PSCoMiXX side may not yet be registered.
  const announce = () => postToOpener({ type: "fx-studio-ready" });
  announce();
  setTimeout(announce, 200);
  setTimeout(announce, 600);
  setTimeout(announce, 1500);

  // 2. Keep-alive — when we get a ping, reply with a pong.
  window.addEventListener("message", (event: MessageEvent) => {
    if (!isComixxOrigin(event.origin)) return;
    if (event.data?.type === "comixx-ping") {
      postToOpener({ type: "fx-studio-pong" });
    }
    // Optional: handle inbound panel data
    if (event.data?.type === "comixx-panel-data") {
      // event.data.payload contains the panel image / target info
      console.log("[FX] received panel data", event.data.payload);
    }
  });

  // 3. Tell PSCoMiXX when we're closing so its connection bar resets.
  window.addEventListener("beforeunload", () => {
    postToOpener({ type: "fx-studio-closed" });
  });
}

// 4. When the user finishes an FX, send the result back. Call this from
//    your "Send to comic" / "Apply" button.
export function sendAssetToComixx(payload: {
  effectId: string;
  projectId: string;
  panelId: string | null;
  previewUrl: string | null;
  assetTag: string;
  name: string;
  type: string;
  mode_hints?: Record<string, unknown> | null;
}) {
  postToOpener({ type: "panel-fx-return", payload });
}
```

## How to verify it's working

1. Deploy FX Studio with the snippet above.
2. In PSCoMiXX, open Comic Builder and click the FX button.
3. The status bar at the bottom of the comic editor should change from
   yellow ("Tab Open — Handshaking…") to green ("Tab Connected") within
   ~2 seconds.
4. The PSCoMiXX browser console should NOT show the warning
   `[FX] Dropped panel-fx-return — no established FX session`.

## URL reference

- FX Studio app:        https://www.pscomixx.online
- PSCoMiXX main app:    https://www.pscomixx.com
- Allowed origins on the PSCoMiXX side (already wired):
  pscomixx.online, www.pscomixx.online, pscomixx.com, www.pscomixx.com,
  panel-play-forge.lovable.app
