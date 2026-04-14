# MADMIXEDMEDIA Creative Workforce Ecosystem — Integration Guide

## Overview

The MADMIXEDMEDIA ecosystem connects three platforms into a unified creative education + publishing + workforce pipeline:

| Platform | Domain | Role |
|----------|--------|------|
| **PSCoMiXX** (this app) | pscomixx.com | Creator studio, XP engine, Skill Passport, project publishing |
| **Press Start LMS** | pressstart.tech | Learning pathways, lessons, certifications, assignments |
| **Press Start Streaming** | psstreaming.com | Content distribution, creator channels, school stations |

## Cross-Platform Authentication

CoMiXX is the **identity provider**. SSO uses JWT tokens for cross-platform auth.

- SSO target links are in the sidebar (PS Streaming, Press Start LMS)
- User identity flows from CoMiXX → LMS / Streaming via JWT

## Cross-Platform XP Ingest API

Both LMS and Streaming can send XP events and passport entries to CoMiXX.

### POST /api/ecosystem/ingest/xp

Send XP events from external platforms.

**Headers:**
```
Authorization: Bearer {ECOSYSTEM_JWT_SECRET}
Content-Type: application/json
```

**Body:**
```json
{
  "userId": 123,
  "action": "lesson_complete",
  "xpAmount": 20,
  "source": "lms",
  "tool": "press_start_lms",
  "metadata": {
    "lessonId": "abc-123",
    "pathwayId": "def-456",
    "lessonTitle": "Introduction to Character Design"
  }
}
```

**Actions (source: lms):**
- `lesson_complete` — 20 XP
- `pathway_complete` — 100 XP
- `assignment_submit` — 15 XP
- `peer_review` — 10 XP
- `certification_earned` — 50 XP

**Actions (source: streaming):**
- `stream_watch` — 5 XP (per 15-minute segment)
- `stream_interact` — 3 XP
- `channel_follow` — 2 XP
- `content_publish` — 25 XP

### POST /api/ecosystem/ingest/passport-entry

Add entries to a user's Skill Passport from external platforms.

**Headers:**
```
Authorization: Bearer {ECOSYSTEM_JWT_SECRET}
Content-Type: application/json
```

**Body:**
```json
{
  "userId": 123,
  "entryType": "certification",
  "title": "Character Design Fundamentals",
  "description": "Completed 8-week character design pathway with 95% score",
  "source": "lms",
  "verifiedBy": "system",
  "metadata": {
    "pathwayId": "def-456",
    "completionDate": "2026-04-10",
    "score": 95
  }
}
```

**Entry Types:**
- `certification` — completed pathway/certification
- `badge` — achievement badge
- `project` — published project
- `skill` — verified skill competency
- `production_credit` — MADMIXEDMEDIA production role credit
- `external_tool` — approved external tool submission

## Ecosystem Role Ladder

Users progress through roles based on XP, competencies, and completed projects:

1. **Learner** — Default starting role
2. **Creator** — Has published projects
3. **Mentor** — Can review work, assigned by admin
4. **Apprentice** — Accepted into apprenticeship track
5. **Paid Apprentice** — Apprentice receiving compensation
6. **Contributor** — Active MADMIXEDMEDIA contributor
7. **Specialist** — Domain expert
8. **Lead** — Team/project lead

Role eligibility is configured via admin rules (`/api/ecosystem/roles/rules`).

## XP Sources & Tools

| Source | Description | Tools |
|--------|-------------|-------|
| `comixx` | PSCoMiXX creator actions | `comic_creator`, `hop_creator`, `vn_creator`, `cyoa_builder`, `card_creator`, `motion_studio` |
| `lms` | Press Start LMS learning | `press_start_lms` |
| `streaming` | PS Streaming engagement | `ps_streaming` |
| `unreal` | Unreal Engine work | `unreal_engine` |
| `reallusion` | Reallusion iClone/CC work | `character_creator`, `iclone` |
| `blender` | Blender 3D work | `blender` |
| `adobe` | Adobe Creative Suite | `photoshop`, `illustrator`, `premiere`, `after_effects` |
| `other` | Other external tools | Per-tool registration |

## External Tool Submissions

Users can submit work done in external tools (Unreal, Blender, Adobe, etc.) for mentor review and XP credit.

**Flow:**
1. User submits work via `/api/ecosystem/external-submissions`
2. Submission enters `pending` status
3. Admin/mentor reviews via `/api/ecosystem/external-submissions/:id/review`
4. If approved: XP awarded, passport entry created
5. If rejected: feedback provided to user

## Apprenticeship Pipeline

**Flow:**
1. Admin creates apprenticeship tracks via `/api/ecosystem/apprenticeships/tracks`
2. Users check eligibility via `/api/ecosystem/roles/eligibility`
3. Users apply via `/api/ecosystem/apprenticeships/apply`
4. Admin reviews applications via `/api/ecosystem/apprenticeships/applications/:id/review`
5. Status: `pending` → `accepted` / `waitlisted` / `rejected`

## Bug Reporting

Global bug reporting available on all pages via floating button.

**Categories:** `bug`, `ux_issue`, `feature_request`, `partner_tool_issue`

**Status flow:** `submitted` → `reviewing` → `in_progress` → `resolved` / `closed`

Auto-captures: current page URL, user role, browser info.

## Admin Ecosystem Console

Available at `/admin/ecosystem` for admin users. Provides:
- Bug report triage
- Apprenticeship candidate management + track creation
- External submission review (approve/reject with XP award)
- XP action values reference
- Level threshold reference
- Role eligibility rule management

## CoMiXX XP Hooks

The HopCreator automatically fires XP events for:
- `project_create` — New HOP project created (10 XP)
- `project_save` — HOP project saved (2 XP, with cooldown)
- `project_export` — HOP exported as PNG/GIF (15 XP)
- `project_publish` — HOP set to public visibility (25 XP)

All events include `source: "comixx"`, `tool: "hop_creator"`, and project metadata.

## Implementation Notes for LMS Chat

When building the LMS integration:
1. Use the XP ingest API to send lesson/pathway completion events
2. Include `pathwayId` and `lessonId` in metadata for tracking
3. Send passport entries for completed certifications
4. The ECOSYSTEM_JWT_SECRET must match between platforms
5. XP events have built-in deduplication — safe to retry on failure

## Implementation Notes for Streaming Chat

When building the Streaming integration:
1. Use the XP ingest API to send watch time and engagement events
2. Send `stream_watch` events in 15-minute intervals with segment metadata
3. Creator channels and school stations are tracked in CoMiXX database
4. Published content from CoMiXX can be syndicated to streaming via the export pipeline
