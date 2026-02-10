import { storage } from "./storage";
import { psContentBundleSchema, type PSContentBundle, type Project, type User } from "@shared/schema";

const EMERGENT_API_URL = process.env.EMERGENT_API_URL || "https://gamexclub.preview.emergentagent.com";
const EMERGENT_WEBHOOK_SECRET = process.env.EMERGENT_WEBHOOK_SECRET || "";

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
    return { jobId: "", success: false, error: "Project not found" };
  }

  if (project.status !== "approved") {
    return { jobId: "", success: false, error: `Project must be approved before publishing. Current status: "${project.status}"` };
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return { jobId: "", success: false, error: "User not found" };
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

      const syncResult = await syncToEmergent(bundle);

      if (syncResult.skipped) {
        await storage.updatePublishJob(job.id, {
          status: "complete",
          step: "sync",
          emergentSyncId: null,
          error: "Streaming sync skipped - no webhook secret configured",
          completedAt: new Date(),
        });
        console.log(`[Publish] Content "${bundle.title}" published locally (streaming sync skipped)`);
      } else if (syncResult.success) {
        await storage.updatePublishJob(job.id, {
          status: "complete",
          step: "sync",
          emergentSyncId: syncResult.syncId || null,
          completedAt: new Date(),
        });
        console.log(`[Publish] Content "${bundle.title}" synced to streaming platform (ID: ${syncResult.syncId})`);
      } else {
        await storage.updatePublishJob(job.id, {
          status: "failed",
          step: "sync",
          error: "Sync to streaming platform failed",
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

function buildEmergentPayload(bundle: PSContentBundle): Record<string, any> {
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

export async function syncToEmergent(bundle: PSContentBundle): Promise<{ syncId: string | null; success: boolean; skipped?: boolean }> {
  if (!EMERGENT_WEBHOOK_SECRET) {
    console.warn(`[Emergent Sync] No webhook secret configured, skipping sync for "${bundle.title}"`);
    return { syncId: null, success: false, skipped: true };
  }

  const emergentPayload = buildEmergentPayload(bundle);

  console.log(`[Emergent Sync] Syncing "${bundle.title}" (${bundle.content_id}) to ${EMERGENT_API_URL}`);

  try {
    const response = await fetch(`${EMERGENT_API_URL}/api/replit/sync/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": EMERGENT_WEBHOOK_SECRET,
      },
      body: JSON.stringify(emergentPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Emergent Sync] HTTP ${response.status}: ${errorText}`);
      return { syncId: null, success: false };
    }

    const result = await response.json() as { success: boolean; content_id?: string; action?: string };
    console.log(`[Emergent Sync] Success: ${result.action || "synced"} content_id=${result.content_id}`);
    return { syncId: result.content_id || bundle.content_id, success: result.success };
  } catch (err: any) {
    console.error(`[Emergent Sync] Failed:`, err.message);
    return { syncId: null, success: false };
  }
}

export async function syncCreatorProfile(user: User): Promise<{ success: boolean }> {
  if (!EMERGENT_WEBHOOK_SECRET) return { success: true };

  try {
    const response = await fetch(`${EMERGENT_API_URL}/api/replit/sync/creator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": EMERGENT_WEBHOOK_SECRET,
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
      console.error(`[Emergent Sync] Creator profile sync failed: HTTP ${response.status}`);
      return { success: false };
    }

    console.log(`[Emergent Sync] Creator profile synced for ${user.name || user.email}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Emergent Sync] Creator sync error:`, err.message);
    return { success: false };
  }
}

export async function checkEmergentHealth(): Promise<{ healthy: boolean; message: string }> {
  if (!EMERGENT_WEBHOOK_SECRET) {
    return { healthy: false, message: "No webhook secret configured" };
  }

  try {
    const response = await fetch(`${EMERGENT_API_URL}/api/replit/sync/status`, {
      method: "GET",
      headers: {
        "x-webhook-secret": EMERGENT_WEBHOOK_SECRET,
      },
    });

    if (response.ok) {
      return { healthy: true, message: "Connected to streaming platform" };
    }
    return { healthy: false, message: `HTTP ${response.status}` };
  } catch (err: any) {
    return { healthy: false, message: err.message };
  }
}
