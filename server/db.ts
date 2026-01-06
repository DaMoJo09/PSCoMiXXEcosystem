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
