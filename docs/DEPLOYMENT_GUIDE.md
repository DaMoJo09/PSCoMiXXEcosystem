# PSCoMiXX Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (Neon serverless recommended)
- Stripe account (for payments)

## Deployment Steps

### 1. Environment Setup

Set the following environment variables:

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-64-char-string>
ADMIN_PASSWORD=<strong-admin-password>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NODE_ENV=production
PORT=5000
```

### 2. Build & Deploy

```bash
npm ci
npm run check   # TypeScript validation
npm run build   # Production build

# Or use the CI script:
bash scripts/ci.sh
```

### 3. Database Setup

The application automatically:
- Runs Drizzle ORM migrations via `db:push`
- Creates session table (`user_sessions`)
- Seeds feature flags
- Ensures database indexes
- Seeds progression data

### 4. Stripe Configuration

After deployment:
1. Configure webhook endpoint: `https://your-domain.com/api/stripe/webhook`
2. Seed subscription products: `POST /api/admin/seed-stripe-products` (admin auth required)
3. The platform auto-discovers managed webhooks via `REPLIT_DOMAINS`

### 5. Health Verification

```bash
curl https://your-domain.com/health
# Expected: {"status":"healthy","database":"connected",...}

curl https://your-domain.com/api/status
# Expected: {"status":"operational","services":{...}}
```

## School/District Deployment

### Role-Based Access

| Role | Capabilities |
|------|-------------|
| Student (age 6-17) | Create projects, earn XP, view assignments |
| Creator (age 18+) | Full platform access, marketplace, monetization |
| Teacher | Student roster management, assignments, submissions review |
| Admin | Full platform administration, analytics, content moderation |

### Student Safety

- Content moderation on all uploads (SHA-256 + perceptual hashing)
- Student accounts cannot access monetization features
- Safe content filtering on community library
- COPPA/FERPA compliance hooks
- Rate limiting prevents abuse

### Chromebook Compatibility

- Touch-friendly 44px minimum hit targets
- `touch-manipulation` on interactive elements
- Drawing canvas supports both mouse and touch events
- Tested at 1366x768 resolution
- All features work on ChromeOS/Chrome browser

### Performance on Low-Spec Devices

- Initial page load: ~209KB gzipped JavaScript
- Route-level lazy loading: heavy pages load on demand
- Creator tools (Comic Creator, Motion Studio) loaded only when accessed
- PDF/chart libraries loaded only when needed

## Backup & Recovery

### Database

Neon serverless provides:
- Point-in-time recovery
- Automatic backups
- Branch-based development environments

### File Storage

- Uploaded files stored in `uploads/` directory
- Tracked in `exported_files` database table
- Recommend periodic backup of `uploads/` to object storage

## Monitoring

### Endpoints

- `GET /health` — Database connectivity and uptime
- `GET /api/status` — Service-level status (DB, AI, Stripe)

### Logs

- API request logs: stdout with timing
- Error logs: `logs/errors.log` with stack traces
- Audit logs: `audit_logs` database table
- Payment events: `audit_logs` with `payment.*` actions
- Platform events: `platform_events` database table
