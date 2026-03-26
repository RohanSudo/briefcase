import { getDb } from "./index";

// --- Activity Log ---
export async function logActivity(
  userId: string,
  toolName: string,
  service: string,
  status: string,
  details?: Record<string, unknown>
) {
  const sql = getDb();
  await sql`
    INSERT INTO activity_log (user_id, tool_name, service, status, details)
    VALUES (${userId}, ${toolName}, ${service}, ${status}, ${JSON.stringify(details || {})})
  `;
}

export async function getActivityLog(userId: string, limit = 50) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, tool_name, service, status, details, created_at
    FROM activity_log
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

// --- Chat Messages ---
export async function saveMessage(
  userId: string,
  conversationId: string,
  role: string,
  content: string
) {
  const sql = getDb();
  await sql`
    INSERT INTO chat_messages (user_id, conversation_id, role, content)
    VALUES (${userId}, ${conversationId}, ${role}, ${content})
  `;
}

export async function getMessages(userId: string, conversationId: string, limit = 50) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, role, content, created_at
    FROM chat_messages
    WHERE user_id = ${userId} AND conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  return rows;
}

// --- User Settings ---
export async function getHitlSetting(userId: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT hitl_enabled FROM user_settings WHERE user_id = ${userId}
  `;
  if (rows.length === 0) return true; // default ON
  return rows[0].hitl_enabled;
}

export async function setHitlSetting(userId: string, enabled: boolean) {
  const sql = getDb();
  await sql`
    INSERT INTO user_settings (user_id, hitl_enabled, updated_at)
    VALUES (${userId}, ${enabled}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET hitl_enabled = ${enabled}, updated_at = NOW()
  `;
}
