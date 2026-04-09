interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  { name: "DATABASE_URL", required: true, description: "PostgreSQL connection string" },
  { name: "SESSION_SECRET", required: false, description: "Session encryption secret (falls back to REPL_ID)" },
  { name: "ADMIN_PASSWORD", required: false, description: "Admin login password" },
  { name: "STRIPE_SECRET_KEY", required: false, description: "Stripe secret key for payments" },
  { name: "STRIPE_PUBLISHABLE_KEY", required: false, description: "Stripe publishable key for frontend" },
  { name: "FX_STUDIO_API_KEY", required: false, description: "FX Studio / Supabase integration key" },
  { name: "EMERGENT_WEBHOOK_SECRET", required: false, description: "Webhook secret for Emergent streaming platform" },
  { name: "PSLMS_API_KEY", required: false, description: "Press Start LMS integration key" },
  { name: "PARTNER_API_KEY", required: false, description: "External partner integration API key" },
  { name: "PSSTREAMING_WEBHOOK_SECRET", required: false, description: "PSStreaming webhook verification secret" },
  { name: "RESEND_API_KEY", required: false, description: "Resend email service API key" },
];

export function validateEnv(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let valid = true;

  for (const v of ENV_VARS) {
    const value = process.env[v.name];
    if (!value || value.trim() === "") {
      if (v.required) {
        console.error(`[env] MISSING REQUIRED: ${v.name} — ${v.description}`);
        valid = false;
      } else {
        warnings.push(`${v.name} not set — ${v.description}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log(`[env] ${warnings.length} optional variable(s) not set:`);
    for (const w of warnings) {
      console.log(`  - ${w}`);
    }
  }

  if (!process.env.SESSION_SECRET && !process.env.REPL_ID) {
    console.warn("[env] WARNING: Neither SESSION_SECRET nor REPL_ID set. Sessions will use a random secret and won't persist across restarts.");
  }

  return { valid, warnings };
}
