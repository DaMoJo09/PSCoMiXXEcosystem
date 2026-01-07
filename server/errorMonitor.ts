import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR || "./logs";
const LOG_FILE = path.join(LOG_DIR, "errors.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface ErrorLog {
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

function formatLog(log: ErrorLog): string {
  const { timestamp, level, message, stack, context } = log;
  let line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (context) {
    line += ` | Context: ${JSON.stringify(context)}`;
  }
  if (stack) {
    line += `\n${stack}`;
  }
  return line;
}

export function logError(message: string, error?: Error, context?: Record<string, any>) {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    stack: error?.stack,
    context,
  };
  
  const formattedLog = formatLog(log);
  console.error(formattedLog);
  
  try {
    fs.appendFileSync(LOG_FILE, formattedLog + "\n\n");
  } catch (e) {
    console.error("Failed to write to error log file:", e);
  }
}

export function logWarn(message: string, context?: Record<string, any>) {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: "warn",
    message,
    context,
  };
  
  const formattedLog = formatLog(log);
  console.warn(formattedLog);
  
  try {
    fs.appendFileSync(LOG_FILE, formattedLog + "\n");
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
}

export function logInfo(message: string, context?: Record<string, any>) {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: "info",
    message,
    context,
  };
  
  const formattedLog = formatLog(log);
  console.log(formattedLog);
  
  try {
    fs.appendFileSync(LOG_FILE, formattedLog + "\n");
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
}

export function getRecentErrors(limit = 50): string[] {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    const lines = content.split("\n\n").filter(Boolean);
    return lines.slice(-limit);
  } catch (e) {
    return [];
  }
}

function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const sensitiveKeys = ["password", "token", "apiKey", "secret", "authorization", "cookie"];
  const result: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      result[key] = "[REDACTED]";
    } else if (typeof obj[key] === "object") {
      result[key] = redactSensitive(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

export function errorHandler(err: Error, req: any, res: any, next: any) {
  const context = {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    body: redactSensitive(req.body),
    query: redactSensitive(req.query),
  };
  
  logError(`API Error: ${err.message}`, err, context);
  
  const status = (err as any).status || (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === "production" 
    ? "Internal Server Error" 
    : err.message;
  
  res.status(status).json({ message, error: process.env.NODE_ENV !== "production" ? err.stack : undefined });
}
