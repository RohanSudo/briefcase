import { db } from "./index";
import {
  users,
  conversations,
  messages,
  activityLog,
  connections,
} from "./schema";
import { eq, desc, and } from "drizzle-orm";

// --- Users ---
export async function getOrCreateUser(
  auth0Id: string,
  email: string,
  displayName: string
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.auth0Id, auth0Id),
  });
  if (existing) return existing;
  const [newUser] = await db
    .insert(users)
    .values({ auth0Id, email, displayName })
    .returning();
  return newUser;
}

// --- Conversations ---
export async function getActiveConversation(userId: string) {
  return db.query.conversations.findFirst({
    where: eq(conversations.userId, userId),
    orderBy: desc(conversations.createdAt),
  });
}

export async function createConversation(userId: string, title?: string) {
  const [conv] = await db
    .insert(conversations)
    .values({ userId, title })
    .returning();
  return conv;
}

// --- Messages ---
export async function getConversationMessages(
  conversationId: string,
  limit = 20
) {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: desc(messages.createdAt),
    limit,
  });
}

export async function saveMessage(
  conversationId: string,
  role: string,
  content: string,
  approvalStatus?: string,
  approvalAction?: unknown
) {
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      role: role as "user" | "assistant" | "system" | "tool",
      content,
      approvalStatus:
        (approvalStatus as "none" | "pending" | "approved" | "denied") ||
        "none",
      approvalAction: approvalAction || null,
    })
    .returning();
  return msg;
}

export async function updateMessageApproval(
  messageId: string,
  status: "approved" | "denied"
) {
  await db
    .update(messages)
    .set({ approvalStatus: status })
    .where(eq(messages.id, messageId));
}

export async function getMessageById(messageId: string) {
  return db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });
}

// --- Activity Log ---
export async function logActivity(
  userId: string,
  conversationId: string,
  toolName: string,
  service: string,
  actionType: string,
  status: string,
  details?: unknown
) {
  await db.insert(activityLog).values({
    userId,
    conversationId,
    toolName,
    service: service as "gmail" | "calendar" | "slack",
    actionType: actionType as "read" | "write",
    status: status as "auto" | "approved" | "denied" | "error",
    details: details || null,
  });
}

export async function getActivityLog(userId: string, limit = 50) {
  return db.query.activityLog.findMany({
    where: eq(activityLog.userId, userId),
    orderBy: desc(activityLog.createdAt),
    limit,
  });
}

// --- Connections ---
export async function getConnections(userId: string) {
  return db.query.connections.findMany({
    where: eq(connections.userId, userId),
  });
}

export async function upsertConnection(
  userId: string,
  provider: string,
  status: string,
  scopes?: string[]
) {
  const existing = await db.query.connections.findFirst({
    where: and(
      eq(connections.userId, userId),
      eq(connections.provider, provider as "google" | "slack")
    ),
  });
  if (existing) {
    await db
      .update(connections)
      .set({
        status: status as "connected" | "disconnected" | "expiring",
        scopes: scopes || existing.scopes,
        updatedAt: new Date(),
        connectedAt:
          status === "connected" ? new Date() : existing.connectedAt,
      })
      .where(eq(connections.id, existing.id));
  } else {
    await db.insert(connections).values({
      userId,
      provider: provider as "google" | "slack",
      status: status as "connected" | "disconnected" | "expiring",
      scopes,
      connectedAt: status === "connected" ? new Date() : null,
    });
  }
}

export async function getUserPreferences(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return { hitlEnabled: user?.hitlEnabled ?? true };
}

export async function updateHitlPreference(
  userId: string,
  enabled: boolean
) {
  await db
    .update(users)
    .set({ hitlEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
