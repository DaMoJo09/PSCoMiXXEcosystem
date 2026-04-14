import { createHmac, randomBytes, randomUUID } from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const ECOSYSTEM_JWT_SECRET = process.env.ECOSYSTEM_JWT_SECRET || process.env.SESSION_SECRET;
if (!ECOSYSTEM_JWT_SECRET) {
  console.warn("[sso] WARNING: ECOSYSTEM_JWT_SECRET not set — SSO endpoints will reject all requests");
}
const TOKEN_EXPIRY_SECONDS = 3600;
const TOKEN_ISSUER = "pscomixx";
const TOKEN_AUDIENCE = "madmixedmedia-ecosystem";

export interface EcosystemTokenPayload {
  sub: string;
  email: string;
  name: string;
  username: string;
  role: string;
  accountType: string;
  avatar: string | null;
  xp: number;
  level: number;
  levelTitle: string;
  totalMinutes: number;
  subscriptionTier: string;
  iss: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  nbf: number;
}

export type SSOErrorCode =
  | "TOKEN_MISSING"
  | "TOKEN_MALFORMED"
  | "TOKEN_SIGNATURE_INVALID"
  | "TOKEN_EXPIRED"
  | "TOKEN_NOT_YET_VALID"
  | "TOKEN_ISSUER_INVALID"
  | "TOKEN_AUDIENCE_INVALID"
  | "USER_NOT_FOUND"
  | "SESSION_ERROR"
  | "INTERNAL_ERROR"
  | "TARGET_INVALID"
  | "ACCESS_DENIED";

export interface SSOError {
  error: SSOErrorCode;
  detail: string;
  request_id: string;
  elapsed_ms?: number;
}

export function makeSSOError(code: SSOErrorCode, detail: string, requestId?: string, startTime?: number): SSOError {
  return {
    error: code,
    detail,
    request_id: requestId || randomUUID(),
    elapsed_ms: startTime ? Date.now() - startTime : undefined,
  };
}

export function generateRequestId(): string {
  return `sso_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf-8");
}

function sign(header: string, payload: string): string {
  return createHmac("sha256", ECOSYSTEM_JWT_SECRET!)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function issueEcosystemToken(user: User, subscriptionTier: string = "free", levelTitle: string = "Novice"): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: EcosystemTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    username: (user as any).username || "",
    role: user.role,
    accountType: user.accountType,
    avatar: (user as any).avatar || null,
    xp: (user as any).xp || 0,
    level: (user as any).level || 1,
    levelTitle,
    totalMinutes: (user as any).totalMinutes || 0,
    subscriptionTier,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    jti: randomUUID(),
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
    nbf: now,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(header, encodedPayload);
  return `${header}.${encodedPayload}.${signature}`;
}

export interface TokenVerifyResult {
  valid: boolean;
  payload?: EcosystemTokenPayload;
  errorCode?: SSOErrorCode;
  errorDetail?: string;
}

export function verifyEcosystemToken(token: string): EcosystemTokenPayload | null {
  const result = verifyEcosystemTokenDetailed(token);
  return result.valid ? result.payload! : null;
}

export function verifyEcosystemTokenDetailed(token: string): TokenVerifyResult {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, errorCode: "TOKEN_MISSING", errorDetail: "No token provided" };
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, errorCode: "TOKEN_MALFORMED", errorDetail: "Token must have 3 parts (header.payload.signature)" };
    }

    const [header, payload, signature] = parts;
    const expectedSig = sign(header, payload);
    if (signature !== expectedSig) {
      return { valid: false, errorCode: "TOKEN_SIGNATURE_INVALID", errorDetail: "Token signature does not match" };
    }

    const decoded: EcosystemTokenPayload = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);

    if (!decoded.iss || decoded.iss !== TOKEN_ISSUER) {
      return { valid: false, errorCode: "TOKEN_ISSUER_INVALID", errorDetail: `Expected issuer '${TOKEN_ISSUER}', got '${decoded.iss || "missing"}'` };
    }

    if (!decoded.aud || decoded.aud !== TOKEN_AUDIENCE) {
      return { valid: false, errorCode: "TOKEN_AUDIENCE_INVALID", errorDetail: `Expected audience '${TOKEN_AUDIENCE}', got '${decoded.aud || "missing"}'` };
    }

    if (decoded.nbf && decoded.nbf > now + 30) {
      return { valid: false, errorCode: "TOKEN_NOT_YET_VALID", errorDetail: `Token not valid until ${new Date(decoded.nbf * 1000).toISOString()}` };
    }

    if (decoded.exp < now) {
      return { valid: false, errorCode: "TOKEN_EXPIRED", errorDetail: `Token expired at ${new Date(decoded.exp * 1000).toISOString()}` };
    }

    return { valid: true, payload: decoded };
  } catch (err: any) {
    return { valid: false, errorCode: "TOKEN_MALFORMED", errorDetail: `Failed to parse token: ${err.message}` };
  }
}

const ECOSYSTEM_DOMAINS: Record<string, string> = {
  comixx: process.env.COMIXX_URL || "https://pscomixx.com",
  fxstudio: process.env.FXSTUDIO_URL || "https://www.pscomixx.online",
  streaming: process.env.STREAMING_URL || "https://psstreaming.com",
  lms: process.env.LMS_URL || "https://pressstart.tech",
};

const ALLOWED_HOSTS = Object.values(ECOSYSTEM_DOMAINS).map(d => {
  try { return new URL(d).host; } catch { return ""; }
}).filter(Boolean);

export function isAllowedOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).host;
    return ALLOWED_HOSTS.includes(host);
  } catch {
    return false;
  }
}

export function getRedirectUrl(target: string, token: string): string | null {
  const baseUrl = ECOSYSTEM_DOMAINS[target];
  if (!baseUrl) return null;
  return `${baseUrl}/sso/callback?token=${encodeURIComponent(token)}&source=pscomixx`;
}

export function getEcosystemDomains() {
  return { ...ECOSYSTEM_DOMAINS };
}

export async function findOrCreateUserFromToken(payload: EcosystemTokenPayload): Promise<User | undefined> {
  let user = await storage.getUserByEmail(payload.email);
  if (user) return user;
  return undefined;
}

export { TOKEN_ISSUER, TOKEN_AUDIENCE };
