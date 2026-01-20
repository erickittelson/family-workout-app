import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function createTable() {
  const sql = neon(process.env.DATABASE_URL!);

  await sql`
    CREATE TABLE IF NOT EXISTS onboarding_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL UNIQUE,
      current_phase TEXT NOT NULL DEFAULT 'welcome',
      phase_index INTEGER NOT NULL DEFAULT 0,
      extracted_data JSONB NOT NULL DEFAULT '{}',
      conversation_history JSONB NOT NULL DEFAULT '[]',
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS onboarding_progress_user_idx ON onboarding_progress (user_id)
  `;

  console.log("Created onboarding_progress table");
}

createTable().catch(console.error);
