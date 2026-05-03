import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

// Critical: pg/neon Pool emits 'error' for idle-client / WebSocket failures.
// Without a listener, Node treats them as unhandled and crashes the process.
// We log and let the pool replace the client; routes will retry naturally.
pool.on('error', (err: unknown) => {
  try {
    const e = err as { message?: string; code?: string; stack?: string };
    console.error('[database] Pool error (recovered):', e?.code || '', e?.message || String(err));
  } catch {
    console.error('[database] Pool error (recovered, unloggable)');
  }
});

// Last-resort guard: ONLY the exact known neon-serverless driver bug should
// be swallowed at this level. The bug is: when the WebSocket fails during
// connect, the driver tries to mutate `error.message` (a getter-only prop on
// some Error subclasses) inside its OWN error path, throwing inside the
// handler and taking the process down. Pool 'error' listener above already
// handles all other recoverable connection failures cleanly.
const NEON_GETTER_BUG = /Cannot set property message of #<\w+> which has only a getter/i;

process.on('uncaughtException', (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (NEON_GETTER_BUG.test(msg)) {
    console.error('[process] Neon driver getter-bug swallowed:', msg);
    return;
  }
  console.error('[process] FATAL uncaughtException:', err);
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason: unknown) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error('[process] unhandledRejection:', msg);
});

async function wakeDatabase() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('[database] Connection established');
      return;
    } catch (error: any) {
      console.log(`[database] Wake attempt ${attempt + 1}/3 failed:`, error.message);
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

wakeDatabase();

export const db = drizzle({ client: pool, schema });
