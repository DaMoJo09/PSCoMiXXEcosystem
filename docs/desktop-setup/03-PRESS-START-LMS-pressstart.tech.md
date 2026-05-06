# Desktop App Setup — Press Start LMS (pressstart.tech)

Copy this entire file into the Press Start LMS Replit chat. The agent will follow these steps exactly to ship a Mac/Windows/Linux desktop installer.

This is the **proven recipe** that worked for PSCoMiXX v0.1.5 (built green on first run after these fixes were applied). Do not deviate.

---

## App identity (use these exact values)

- **App name:** Press Start LMS
- **Bundle identifier:** `com.pressstart.lms`
- **Live URL the desktop app loads:** `https://pressstart.tech`
- **GitHub repo (assumed):** `DaMoJo09/PressStartLMS` — confirm with user, change if different
- **Initial release tag:** `desktop-v0.1.0`
- **Tauri category:** `Education`

---

## Step 1 — Create the desktop folder structure

In the project root, create:

```
desktop/
├── dist/
│   └── index.html          # splash page shown before web URL loads
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/              # generate with `npx @tauri-apps/cli icon path/to/logo.png`
│   └── src/
│       └── main.rs
└── package.json
```

### `desktop/dist/index.html`

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Press Start LMS</title>
<style>body{margin:0;background:#0a0a0a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh}</style>
</head><body><div>Loading Press Start LMS…</div>
<script>window.location.href = "https://pressstart.tech";</script>
</body></html>
```

### `desktop/src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Press Start LMS",
  "version": "0.1.0",
  "identifier": "com.pressstart.lms",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Press Start LMS",
        "width": 1400,
        "height": 900,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "category": "Education",
    "createUpdaterArtifacts": false,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "active": false
    }
  }
}
```

### `desktop/src-tauri/Cargo.toml`

```toml
[package]
name = "press-start-lms"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

### `desktop/src-tauri/build.rs`

```rust
fn main() {
    tauri_build::build()
}
```

### `desktop/src-tauri/src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Press Start LMS");
}
```

### `desktop/package.json`

```json
{
  "name": "press-start-lms-desktop",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "tauri": "tauri",
    "build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

---

## Step 2 — Update `.gitignore`

Add this exception so the splash `dist/` folder is committed:

```
desktop/src-tauri/target/
!desktop/dist/
```

---

## Step 3 — GitHub Actions workflow

Create `.github/workflows/desktop-release.yml`:

```yaml
name: Desktop Release

on:
  push:
    tags:
      - "desktop-v*"

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: "--target universal-apple-darwin"
          - platform: ubuntu-22.04
            args: ""
          - platform: windows-latest
            args: ""

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust (universal mac)
        if: matrix.platform == 'macos-latest'
        run: |
          rustup target add aarch64-apple-darwin
          rustup target add x86_64-apple-darwin

      - name: Install Rust
        if: matrix.platform != 'macos-latest'
        uses: dtolnay/rust-toolchain@stable

      - name: Linux deps
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev

      - name: Install desktop deps
        working-directory: desktop
        run: npm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: desktop
          tagName: ${{ github.ref_name }}
          releaseName: "Press Start LMS ${{ github.ref_name }}"
          releaseDraft: false
          prerelease: false
          args: ${{ matrix.args }}
```

**DO NOT** add `APPLE_CERTIFICATE`, `APPLE_SIGNING_IDENTITY`, `WINDOWS_CERTIFICATE`, or `TAURI_SIGNING_PRIVATE_KEY` env vars. Codesigning is intentionally off.

---

## Step 4 — Generate app icons

```bash
cd desktop
npx @tauri-apps/cli icon /path/to/lms-logo-1024.png
```

This populates `desktop/src-tauri/icons/` with all required sizes.

---

## Step 5 — If the web app has a `desktopBridge.ts` or imports `@tauri-apps/*` packages

In root `vite.config.ts`, inside `build.rollupOptions`, add:

```ts
external: [/^@tauri-apps\//],
```

This prevents Rollup from failing on Tauri-only packages during the web build. Skip this step if Press Start LMS doesn't use any Tauri imports in its web code.

---

## Step 6 — GitHub Personal Access Token

The user's GitHub PAT must have these scopes:
- `repo`
- **`workflow`** ← this one is commonly missing and causes "refusing to allow a Personal Access Token to create or update workflow" errors

Update at: https://github.com/settings/tokens

---

## Step 7 — Ship it

```bash
git add -A
git commit -m "Add Tauri 2 desktop shell"
git tag desktop-v0.1.0
git push origin main --tags
```

GitHub Actions will build all 3 platforms in ~10 minutes. Installers appear at:
`https://github.com/DaMoJo09/PressStartLMS/releases/tag/desktop-v0.1.0`

Outputs:
- macOS: `Press Start LMS_0.1.0_universal.dmg`
- Windows: `Press Start LMS_0.1.0_x64-setup.exe` and `Press Start LMS_0.1.0_x64_en-US.msi`
- Linux: `press-start-lms_0.1.0_amd64.deb` and `press-start-lms_0.1.0_amd64.AppImage`

---

## Known issues + fixes (apply preemptively)

1. **"frontendDist not found"** → ensure `desktop/dist/index.html` is committed and `.gitignore` has `!desktop/dist/`
2. **"category invalid"** → must be exact string from Tauri schema; for Press Start LMS use `"Education"`
3. **macOS "app is damaged"** → user runs `xattr -cr /Applications/Press\ Start\ LMS.app` (no codesign cert)
4. **Windows SmartScreen** → click "More info" → "Run anyway" (no codesign cert)
5. **Updater errors on build** → `createUpdaterArtifacts: false` AND `plugins.updater.active: false` must both be set
6. **SSO/JWT login flows** — if the LMS uses cookies/SSO with the wider ecosystem (PSCoMiXX, FX Studio, PS Streaming), confirm cookies work in the Tauri WebView. Tauri 2 uses system WebView2/WebKit which handles cookies normally for the loaded URL, but cross-domain cookies may behave differently than a regular browser.

---

## When done

Update the project's `replit.md` "Architecture decisions" section with a line:
> **Desktop:** Tauri 2 thin shell loading https://pressstart.tech. Workflow: `.github/workflows/desktop-release.yml`. Tag `desktop-v*` to release.
