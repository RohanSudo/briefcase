import { neon } from "@neondatabase/serverless";

export function getDb() {
  return neon(process.env.DATABASE_URL!);
}

// Run once to create tables
export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      service TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'auto',
      details JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      hitl_enabled BOOLEAN DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_conv ON chat_messages(user_id, conversation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)`;
}
