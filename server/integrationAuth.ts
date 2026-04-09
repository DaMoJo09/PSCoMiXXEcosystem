import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

function safeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

const ALLOWED_WEBHOOK_DOMAINS = new Set([
  "pscomixx.com",
  "www.pscomixx.com",
  "comixx.website",
  "www.pscomixx.online",
  "pscomixx.online",
  "psstreaming.online",
  "pressstart.tech",
  "madmixedmedia.com",
  "localhost",
]);

export function isAllowedWebhookUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.protocol === "http:" && url.hostname !== "localhost") return false;
    return ALLOWED_WEBHOOK_DOMAINS.has(url.hostname);
  } catch {
    return false;
  }
}

export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string | undefined;
  const authBearer = (req.headers["authorization"] || "").toString().replace(/^Bearer\s+/i, "").trim();
  const key = apiKey || authBearer;

  if (!key) {
    return res.status(401).json({ error: "Missing API key. Provide via X-API-Key header or Bearer token." });
  }

  const validKeys: string[] = [
    process.env.FX_STUDIO_API_KEY,
    process.env.PSLMS_API_KEY,
    process.env.PARTNER_API_KEY,
  ].filter(Boolean) as string[];

  if (validKeys.length === 0) {
    return res.status(503).json({ error: "No integration keys configured on server." });
  }

  const isValid = validKeys.some((vk) => safeCompare(key, vk));

  if (!isValid) {
    return res.status(403).json({ error: "Invalid API key." });
  }

  next();
}

export function validateWebhookSignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["x-webhook-signature"] as string | undefined;
    const timestamp = req.headers["x-webhook-timestamp"] as string | undefined;

    if (!signature || !timestamp) {
      return res.status(401).json({ error: "Missing webhook signature or timestamp." });
    }

    const age = Date.now() - parseInt(timestamp, 10);
    if (isNaN(age) || age > 300_000 || age < -30_000) {
      return res.status(401).json({ error: "Webhook timestamp expired or invalid." });
    }

    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

    if (!safeCompare(signature, expected)) {
      return res.status(403).json({ error: "Invalid webhook signature." });
    }

    next();
  };
}
