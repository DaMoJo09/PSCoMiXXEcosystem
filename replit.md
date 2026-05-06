# PSCoMiXX Creator
An AI-assisted web application for generating comics, trading cards, visual novels, and motion comics with integrated drawing tools and project management.

## Run & Operate
- **Run:** `npm start`
- **Build:** `npm run build`
- **Typecheck:** `npm run check`
- **Required Env Vars:** `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `ADMIN_PASSWORD`, `ECOSYSTEM_JWT_SECRET`

## Stack
- **Frontend:** React, TypeScript, Vite, Wouter, TailwindCSS v4, Radix UI, shadcn/ui
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL (Neon serverless), Drizzle ORM, Drizzle Kit for migrations
- **Authentication:** Passport.js (local strategy, scrypt hashing), JWT-based SSO
- **AI:** Pollinations.ai (image and text generation)
- **Deployment:** Tauri 2 (Desktop App), Capacitor v8 (Mobile App)

## Where things live
- `/client`: Frontend source code
- `/server`: Backend source code
- `/desktop`: Tauri desktop application source code
- `/shared`: Shared types and utilities
- `/docs`: Project documentation
- `server/shared/schema.ts`: Database schema definition
- `server/routes.ts`: API routes and endpoints
- `client/src/lib/portfolioTheme.ts`: Portfolio theme contracts and helpers
- `client/public/marketplace/`: Seeded marketplace asset images

## Architecture decisions
- **3-Tier Durable Storage:** Replit App Object Storage for primary files, per-user quotas, and Tauri local save for offline access and `.pscomixx` project files (zip format).
- **Production Stability Hardening:** Implemented pagination for large asset lists, chunk-loading retry mechanism for stale deployments, `sessionStorage` quota handling with `safeStorage`, and robust error handling for the Neon DB driver.
- **Desktop as Thin Tauri Shell:** The desktop app is a lightweight Tauri 2 wrapper loading the web app URL, allowing for instant web content updates without desktop re-releases. Native features are limited to window management and file system access.
- **Dynamic Feature Management:** Database-driven feature flags and subscription tiers enable flexible feature gating and monetization.
- **Ecosystem Integration:** JWT-based SSO and a queue-based sync engine facilitate seamless integration with Press Start LMS and PS Streaming platforms, forming a connected creative ecosystem.

## Product
- **Content Creation Studios:** Dedicated workspaces for Comics, Visual Novels, CYOA, Cards, Motion, and HOPs (Hot One-Page Stories) with specialized tools.
- **AI Assistance:** AI-powered image and text generation within creation workflows.
- **Customizable Portfolios:** Users can personalize their public profile pages with themes, layouts, and content.
- **Gamified Learning & Progression:** XP system, certifications, and structured curricula motivate users and track skill development.
- **Creator Marketplace:** Platform for browsing, selling, and acquiring projects and asset packs.
- **Cross-Platform Availability:** Web, Desktop (Mac/Windows/Linux), and Mobile (iOS/Android) access.

## User preferences
Preferred communication style: Simple, everyday language.

## Gotchas
- **Tauri Signing Keys:** Losing the private key for Tauri auto-updates will permanently break auto-update functionality for existing installs. Back it up securely.
- **Local Backup Corruption:** Older project backups (pre-May 2026 fix) might have `__omitted_for_local_backup__` sentinels in image URLs due to a `safeWriteLocalBackup` bug; these will self-clean on next user save.
- **Stale Chunk Crashes:** If deploying, remember to explicitly bump the production heap size for the deployment via the publish flow.
- **Promo Page Image Allowlist:** Promo page images are restricted to a vetted host allowlist to prevent tracking pixels.

## Pointers
- **Skills:** `docs/PRODUCTION_READINESS.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/API_INTEGRATION.md`, `docs/PAYMENT_FLOW.md`, `ECOSYSTEM_INTEGRATION.md`
- **External Docs:**
    - Tauri Documentation: https://tauri.app/v2/guides/
    - Capacitor Documentation: https://capacitorjs.com/docs/
    - Drizzle ORM: https://orm.drizzle.team/
    - TailwindCSS: https://tailwindcss.com/
    - Radix UI: https://www.radix-ui.com/
    - Neon Serverless Postgres: https://neon.tech/
    - Stripe: https://stripe.com/
    - Resend: https://resend.com/