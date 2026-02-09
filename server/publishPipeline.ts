import { storage } from "./storage";
import { psContentBundleSchema, type PSContentBundle, type Project, type User } from "@shared/schema";

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

      await storage.updatePublishJob(job.id, {
        status: "complete",
        step: "sync",
        emergentSyncId: syncResult.syncId || null,
        completedAt: new Date(),
      });
    } catch (err: any) {
      await storage.updatePublishJob(job.id, {
        status: "failed",
        error: err.message || "Unknown pipeline error",
      });
    }
  })();

  return { jobId: job.id, success: true };
}

export async function syncToEmergent(bundle: PSContentBundle): Promise<{ syncId: string | null; success: boolean }> {
  console.log(`[Emergent Sync] Stub: Would sync content "${bundle.title}" (${bundle.content_id}) to Emergent platform`);
  return { syncId: `emergent-stub-${Date.now()}`, success: true };
}
