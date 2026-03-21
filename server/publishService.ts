import { storage } from "./storage";
import { db } from "./db";
import { exportJobs, type ExportJob } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { buildPSContentBundle, runPublishPipeline } from "./publishPipeline";
import { dispatchWebhook } from "./webhookService";

const PSLMS_API_KEY = process.env.PSLMS_API_KEY || "";
const PSLMS_API_URL = process.env.PSLMS_API_URL || "https://pressstart.tech";
const PSLMS_WEBHOOK_SECRET = process.env.PSLMS_WEBHOOK_SECRET || "";
const STREAMING_URL = process.env.STREAMING_WEBHOOK_URL || "https://psstreaming.com/api/webhooks/time-spent";

interface ExportOptions {
  format: string;
  destinations?: string[];
  publishToStreaming?: boolean;
  sendToLms?: boolean;
  metadata?: Record<string, any>;
}

export async function createExportJob(
  projectId: string,
  userId: string,
  options: ExportOptions
): Promise<ExportJob> {
  const destinations = (options.destinations || []).map((d) => ({
    target: d,
    status: "pending",
  }));

  if (options.publishToStreaming) {
    destinations.push({ target: "streaming", status: "pending" });
  }
  if (options.sendToLms) {
    destinations.push({ target: "lms", status: "pending" });
  }

  const [job] = await db
    .insert(exportJobs)
    .values({
      projectId,
      userId,
      format: options.format,
      status: "queued",
      metadata: options.metadata || {},
      destinations,
    })
    .returning();

  processExportJob(job.id).catch((e) =>
    console.error("[publish-service] export job error:", e)
  );

  return job;
}

async function processExportJob(jobId: string): Promise<void> {
  await db
    .update(exportJobs)
    .set({ status: "processing" })
    .where(eq(exportJobs.id, jobId));

  try {
    const [job] = await db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.id, jobId));

    if (!job) throw new Error("Job not found");

    const project = await storage.getProject(job.projectId);
    if (!project) throw new Error("Project not found");

    const user = await storage.getUser(job.userId);
    if (!user) throw new Error("User not found");

    const destinations = (job.destinations as any[]) || [];

    for (const dest of destinations) {
      try {
        if (dest.target === "streaming") {
          await syncToStreaming(project, user);
          dest.status = "sent";
        } else if (dest.target === "lms") {
          await syncToLms(project, user);
          dest.status = "sent";
        }
      } catch (e: any) {
        dest.status = "failed";
        dest.error = e.message;
      }
    }

    await dispatchWebhook(
      "export.complete",
      STREAMING_URL,
      {
        user_id: user.id,
        user_email: user.email,
        project_id: project.id,
        project_title: project.title,
        format: job.format,
        export_id: jobId,
      },
      PSLMS_WEBHOOK_SECRET
    ).catch(() => {});

    await db
      .update(exportJobs)
      .set({
        status: "complete",
        destinations,
        completedAt: new Date(),
      })
      .where(eq(exportJobs.id, jobId));
  } catch (error: any) {
    await db
      .update(exportJobs)
      .set({
        status: "failed",
        error: error.message,
        retryCount: sql`COALESCE(${exportJobs.retryCount}, 0) + 1`,
      })
      .where(eq(exportJobs.id, jobId));
  }
}

async function syncToStreaming(project: any, user: any): Promise<void> {
  const bundle = buildPSContentBundle(project, user, [], { visibility: "public" });
  await runPublishPipeline(project, user, { visibility: "public" });
}

async function syncToLms(project: any, user: any): Promise<void> {
  if (!PSLMS_API_URL || !PSLMS_WEBHOOK_SECRET) return;

  const payload = {
    event: "comic.submitted",
    user_id: user.id,
    user_email: user.email,
    user_name: user.name,
    title: project.title,
    project_type: project.type,
    image_url: project.thumbnail || "",
    xp: 50,
    project_id: project.id,
    submitted_at: new Date().toISOString(),
  };

  const signature = require("crypto")
    .createHmac("sha256", PSLMS_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${PSLMS_API_URL}/api/webhooks/comixx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CoMiXX-Signature": signature,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`LMS sync failed: ${res.status}`);
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

export async function getExportJob(jobId: string): Promise<ExportJob | undefined> {
  const [job] = await db
    .select()
    .from(exportJobs)
    .where(eq(exportJobs.id, jobId));
  return job;
}

export async function getProjectExports(
  projectId: string,
  limit = 20
): Promise<ExportJob[]> {
  return db
    .select()
    .from(exportJobs)
    .where(eq(exportJobs.projectId, projectId))
    .orderBy(desc(exportJobs.createdAt))
    .limit(limit);
}
