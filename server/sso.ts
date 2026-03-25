import { createHmac, randomBytes } from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const ECOSYSTEM_JWT_SECRET = process.env.ECOSYSTEM_JWT_SECRET || process.env.SESSION_SECRET;
if (!ECOSYSTEM_JWT_SECRET) {
  console.warn("[sso] WARNING: ECOSYSTEM_JWT_SECRET not set — SSO endpoints will reject all requests");
}
const TOKEN_EXPIRY_SECONDS = 3600;

interface EcosystemTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  accountType: string;
  iss: string;
  iat: number;
  exp: number;
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
  return createHmac("sha256", ECOSYSTEM_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function issueEcosystemToken(user: User): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: EcosystemTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountType: user.accountType,
    iss: "comixx",
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(header, encodedPayload);
  return `${header}.${encodedPayload}.${signature}`;
}

export function verifyEcosystemToken(token: string): EcosystemTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = sign(header, payload);
    if (signature !== expectedSig) return null;
    const decoded: EcosystemTokenPayload = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;
    return decoded;
  } catch {
    return null;
  }
}

const ECOSYSTEM_DOMAINS: Record<string, string> = {
  comixx: process.env.COMIXX_URL || "https://pscomixx.com",
  fxstudio: process.env.FXSTUDIO_URL || "https://www.pscomixx.online",
  streaming: process.env.STREAMING_URL || "https://psstreaming.com",
  lms: process.env.LMS_URL || "https://pressstart.tech",
};

export function getRedirectUrl(target: string, token: string): string | null {
  const baseUrl = ECOSYSTEM_DOMAINS[target];
  if (!baseUrl) return null;
  return `${baseUrl}/sso?token=${encodeURIComponent(token)}`;
}

export async function findOrCreateUserFromToken(payload: EcosystemTokenPayload): Promise<User | undefined> {
  let user = await storage.getUserByEmail(payload.email);
  if (user) return user;
  return undefined;
}
