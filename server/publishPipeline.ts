import { storage } from "./storage";
import { psContentBundleSchema, type PSContentBundle, type Project, type User } from "@shared/schema";

// PSStreaming is the live streaming platform at psstreaming.com.
// Both env names are accepted for backward compatibility with older deploys
// that still use the legacy EMERGENT_* names — new deploys should set
// PSSTREAMING_API_URL / PSSTREAMING_WEBHOOK_SECRET.
const PSSTREAMING_API_URL =
  process.env.PSSTREAMING_API_URL ||
  process.env.EMERGENT_API_URL ||
  "https://psstreaming.com";
const PSSTREAMING_WEBHOOK_SECRET =
  process.env.PSSTREAMING_WEBHOOK_SECRET ||
  process.env.EMERGENT_WEBHOOK_SECRET ||
  "";

export function buildPSContentBundle(
  project: Project,
  user: User,
  assets: { id: string; url: string; type: string }[] = [],
  options: { visibility?: "private" | "unlisted" | "public"; tags?: string[]; ageRating?: string } = {}
): PSContentBundle {
  const projectData = project.data as any;

  const bundle: PSContentBundle = {
    contract_version: "v1",
    content_id: project.id,
    content_type: mapProjectType(project.type),
    title: project.title,
    description: projectData?.description || "",
    cover_asset_url: project.thumbnail || undefined,
    creator: {
      ps_user_id: user.id,
      display_name: user.name || user.email,
      avatar_url: user.avatar || undefined,
    },
    visibility: options.visibility || "private",
    age_rating: options.ageRating,
    tags: options.tags || projectData?.tags || [],
    payload: projectData,
    assets: assets.map(a => ({
      asset_id: a.id,
      url: a.url,
      type: a.type,
      thumbnail_url: undefined,
    })),
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return bundle;
}

function mapProjectType(type: string): PSContentBundle["content_type"] {
  const map: Record<string, PSContentBundle["content_type"]> = {
    comic: "comic",
    card: "trading_card",
    vn: "visual_novel",
    cyoa: "cyoa",
    cover: "cover",
    motion: "motion",
    hop: "hop",
  };
  return map[type] || "comic";
}

export function validateBundle(bundle: PSContentBundle): { valid: boolean; errors: string[] } {
  const result = psContentBundleSchema.safeParse(bundle);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`),
  };
}

export async function runPublishPipeline(
  projectId: string,
  userId: string,
  options: { visibility?: "private" | "unlisted" | "public"; tags?: string[]; ageRating?: string } = {}
): Promise<{ jobId: string; success: boolean; error?: string }> {
  const project = await storage.getProject(projectId);
  if (!project) {
    console.error(`[publish-pipeline] project not found: id="${projectId}" userId="${userId}"`);
    return { jobId: "", success: false, error: "Project not found" };
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return { jobId: "", success: false, error: "User not found" };
  }

  // Status policy:
  //   - "approved" / "published"   → proceed
  //   - "draft" / null / unset     → auto-approve (this is the common student case
  //     that was previously blocked, causing "nothing shows up in community library")
  //   - "review"                   → still gated; awaiting moderator action
  //   - "rejected"                 → blocked; moderator must explicitly re-approve
  //   - anything else              → blocked with explicit message (no silent promote)
  const status = (project.status || "draft").toLowerCase();
  const autoApprovable = status === "draft" || status === "" || project.status == null;

  if (status !== "approved" && status !== "published") {
    if (status === "review") {
      return { jobId: "", success: false, error: "This project is awaiting teacher review." };
    }
    if (status === "rejected") {
      return { jobId: "", success: false, error: "This project was rejected. Ask your teacher to re-approve it." };
    }
    if (!autoApprovable) {
      return { jobId: "", success: false, error: `Project cannot be published from status "${project.status}".` };
    }
    console.log(`[publish-pipeline] auto-approving draft project ${project.id} for ${user.email}`);
    await storage.updateProject(project.id, { status: "approved" } as any);
    project.status = "approved";
  }

  const latestVersion = await storage.getLatestProjectVersion(projectId);
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const version = await storage.createProjectVersion({
    projectId,
    versionNumber: nextVersionNumber,
    createdBy: userId,
    dataSnapshot: project.data as Record<string, unknown>,
    changelog: `Version ${nextVersionNumber} published`,
  });

  const job = await storage.createPublishJob({
    projectId,
    versionId: version.id,
    status: "queued",
    step: "validate",
  });

  (async () => {
    try {
      await storage.updatePublishJob(job.id, { status: "building", step: "validate" });

      const projectAssets = await storage.getProjectAssets(projectId);
      const bundle = buildPSContentBundle(project, user, projectAssets, options);

      const validation = validateBundle(bundle);
      if (!validation.valid) {
        await storage.updatePublishJob(job.id, {
          status: "failed",
          step: "validate",
          error: validation.errors.join("; "),
        });
        return;
      }

      await storage.updatePublishJob(job.id, { step: "bundle", bundleJson: bundle as Record<string, unknown> });

      await storage.updatePublishJob(job.id, { step: "save" });

      await storage.updateProject(projectId, { status: "published" } as any);

      await storage.updatePublishJob(job.id, { step: "sync" });

      const syncResult = await syncToPSStreaming(bundle);

      if (syncResult.skipped) {
        await storage.updatePublishJob(job.id, {
          status: "complete",
          step: "sync",
          streamingSyncId: null,
          error: "PSStreaming sync skipped - no webhook secret configured",
          completedAt: new Date(),
        });
        console.log(`[Publish] Content "${bundle.title}" published locally (PSStreaming sync skipped)`);
      } else if (syncResult.success) {
        await storage.updatePublishJob(job.id, {
          status: "complete",
          step: "sync",
          streamingSyncId: syncResult.syncId || null,
          completedAt: new Date(),
        });
        console.log(`[Publish] Content "${bundle.title}" synced to PSStreaming (ID: ${syncResult.syncId})`);
      } else {
        await storage.updatePublishJob(job.id, {
          status: "failed",
          step: "sync",
          error: "Sync to PSStreaming failed",
        });
      }
    } catch (err: any) {
      await storage.updatePublishJob(job.id, {
        status: "failed",
        error: err.message || "Unknown pipeline error",
      });
    }
  })();

  return { jobId: job.id, success: true };
}

function findFirstImageInPanels(panels: any[]): string | null {
  for (const panel of panels) {
    for (const content of (panel.contents || [])) {
      if (content.data?.url) return content.data.url;
      if (content.data?.drawingData) return content.data.drawingData;
    }
  }
  return null;
}

function buildPSStreamingPayload(bundle: PSContentBundle): Record<string, any> {
  const payload: Record<string, any> = {
    contract_version: "v1",
    content_id: bundle.content_id,
    content_type: bundle.content_type,
    title: bundle.title,
    description: bundle.description || "",
    cover_url: bundle.cover_asset_url || "",
    creator_ps_user_id: bundle.creator.ps_user_id,
    creator_display_name: bundle.creator.display_name,
    visibility: bundle.visibility || "public",
    tags: bundle.tags || [],
  };

  const projectData = bundle.payload as any;

  switch (bundle.content_type) {
    case "comic":
    case "comic_issue": {
      const pages: { page_number: number; image_url: string }[] = [];
      if (projectData?.spreads) {
        let pageNum = 1;
        for (const spread of projectData.spreads) {
          const leftPanels = spread.leftPage || [];
          if (leftPanels.length > 0) {
            const firstImage = findFirstImageInPanels(leftPanels);
            if (firstImage) {
              pages.push({ page_number: pageNum++, image_url: firstImage });
            }
          }
          const rightPanels = spread.rightPage || [];
          if (rightPanels.length > 0) {
            const firstImage = findFirstImageInPanels(rightPanels);
            if (firstImage) {
              pages.push({ page_number: pageNum++, image_url: firstImage });
            }
          }
        }
      }
      if (pages.length === 0 && bundle.assets?.length) {
        for (const asset of bundle.assets) {
          pages.push({
            page_number: pages.length + 1,
            image_url: asset.url,
          });
        }
      }
      payload.pages = pages;
      break;
    }

    case "visual_novel": {
      if (projectData?.scenes) {
        payload.scenes = projectData.scenes;
        payload.start_scene = projectData.startScene || projectData.start_scene || "scene_1";
      }
      break;
    }

    case "cyoa": {
      if (projectData?.nodes) {
        payload.nodes = projectData.nodes;
        payload.start_node = projectData.startNode || projectData.start_node || "node_1";
      }
      break;
    }

    case "trading_card": {
      payload.card_image_url = bundle.cover_asset_url || "";
      if (projectData?.stats) payload.stats = projectData.stats;
      if (projectData?.rarity) payload.rarity = projectData.rarity;
      break;
    }

    case "hop": {
      if (projectData?.scenes) {
        payload.scenes = projectData.scenes;
        payload.loop_mode = projectData.loopMode || "single_loop";
        payload.clip_length_mode = projectData.clipLengthMode || "30s";
        payload.total_duration = projectData.totalDuration || 0;
        payload.hop_type = projectData.type || "single";
        if (projectData.audioTrack) {
          payload.audio_track = projectData.audioTrack;
        }
        if (projectData.seriesId) {
          payload.series_id = projectData.seriesId;
          payload.series_title = projectData.seriesTitle;
          payload.episode_number = projectData.episodeNumber;
        }
        payload.preview_settings = projectData.previewSettings || { autoplay: true, mutedByDefault: false, showCaptions: true };
      }
      break;
    }

    default: {
      if (bundle.assets?.length) {
        payload.pages = bundle.assets.map((a, i) => ({
          page_number: i + 1,
          image_url: a.url,
        }));
      }
      break;
    }
  }

  return payload;
}

export async function syncToPSStreaming(bundle: PSContentBundle): Promise<{ syncId: string | null; success: boolean; skipped?: boolean }> {
  if (!PSSTREAMING_WEBHOOK_SECRET) {
    console.warn(`[PSStreaming Sync] No webhook secret configured, skipping sync for "${bundle.title}"`);
    return { syncId: null, success: false, skipped: true };
  }

  const streamingPayload = buildPSStreamingPayload(bundle);

  console.log(`[PSStreaming Sync] Syncing "${bundle.title}" (${bundle.content_id}) to ${PSSTREAMING_API_URL}`);

  try {
    const response = await fetch(`${PSSTREAMING_API_URL}/api/replit/sync/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": PSSTREAMING_WEBHOOK_SECRET,
      },
      body: JSON.stringify(streamingPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PSStreaming Sync] HTTP ${response.status}: ${errorText}`);
      return { syncId: null, success: false };
    }

    const result = await response.json() as { success: boolean; content_id?: string; action?: string };
    console.log(`[PSStreaming Sync] Success: ${result.action || "synced"} content_id=${result.content_id}`);
    return { syncId: result.content_id || bundle.content_id, success: result.success };
  } catch (err: any) {
    console.error(`[PSStreaming Sync] Failed:`, err.message);
    return { syncId: null, success: false };
  }
}

export async function syncCreatorProfile(user: User): Promise<{ success: boolean }> {
  if (!PSSTREAMING_WEBHOOK_SECRET) return { success: true };

  try {
    const response = await fetch(`${PSSTREAMING_API_URL}/api/replit/sync/creator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": PSSTREAMING_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        ps_user_id: user.id,
        display_name: user.name || user.email,
        avatar_url: user.avatar || "",
        bio: (user as any).bio || "",
        email: user.email,
      }),
    });

    if (!response.ok) {
      console.error(`[PSStreaming Sync] Creator profile sync failed: HTTP ${response.status}`);
      return { success: false };
    }

    console.log(`[PSStreaming Sync] Creator profile synced for ${user.name || user.email}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[PSStreaming Sync] Creator sync error:`, err.message);
    return { success: false };
  }
}

export async function checkPSStreamingHealth(): Promise<{
  healthy: boolean;
  degraded?: boolean;
  message: string;
}> {
  if (!PSSTREAMING_WEBHOOK_SECRET) {
    return { healthy: false, message: "No webhook secret configured" };
  }

  // PSStreaming exposes a public JSON content endpoint that the live app
  // serves directly. We only declare "healthy" when:
  //   1. /api/content returns 2xx, AND
  //   2. the response body parses as JSON.
  // This rules out CDN edge / static error pages that happen to return 200.
  // The legacy /api/replit/sync/status path no longer exists on the new
  // psstreaming.com host, so we don't ping it.
  // The actual write path (/api/replit/sync/content) is POST-only and
  // verified separately by an end-to-end roundtrip during publish, not by
  // a health check.
  const primary = await probeJson(`${PSSTREAMING_API_URL}/api/content`, 8000);
  if (primary.ok) {
    return { healthy: true, message: "Connected to PSStreaming" };
  }

  // If /api/content is down but the host is still reachable, surface that
  // as DEGRADED (not healthy) so the dashboard can flag it without the
  // sync engine treating it as fully operational.
  const root = await probeReachable(PSSTREAMING_API_URL, 5000);
  if (root.ok) {
    return {
      healthy: false,
      degraded: true,
      message: `Host reachable but /api/content returned ${primary.status ?? "non-JSON"}`,
    };
  }

  return {
    healthy: false,
    message: primary.error || root.error || `HTTP ${primary.status ?? "unknown"}`,
  };
}

async function probeJson(url: string, timeoutMs: number): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    if (!response.ok) return { ok: false, status: response.status };
    const text = await response.text();
    try {
      JSON.parse(text);
      return { ok: true, status: response.status };
    } catch {
      return { ok: false, status: response.status, error: "Non-JSON response" };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error" };
  } finally {
    clearTimeout(timer);
  }
}

async function probeReachable(url: string, timeoutMs: number): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error" };
  } finally {
    clearTimeout(timer);
  }
}
