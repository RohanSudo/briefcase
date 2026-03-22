import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);
export const approvalStatusEnum = pgEnum("approval_status", [
  "none",
  "pending",
  "approved",
  "denied",
]);
export const serviceEnum = pgEnum("service", ["gmail", "calendar", "slack"]);
export const actionTypeEnum = pgEnum("action_type", ["read", "write"]);
export const activityStatusEnum = pgEnum("activity_status", [
  "auto",
  "approved",
  "denied",
  "error",
]);
export const providerEnum = pgEnum("provider", ["google", "slack"]);
export const connectionStatusEnum = pgEnum("connection_status", [
  "connected",
  "disconnected",
  "expiring",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  auth0Id: text("auth0_id").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  hitlEnabled: boolean("hitl_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  approvalStatus: approvalStatusEnum("approval_status").default("none"),
  approvalAction: jsonb("approval_action"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  toolName: text("tool_name").notNull(),
  service: serviceEnum("service").notNull(),
  actionType: actionTypeEnum("action_type").notNull(),
  status: activityStatusEnum("status").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  provider: providerEnum("provider").notNull(),
  status: connectionStatusEnum("status").default("disconnected").notNull(),
  scopes: text("scopes").array(),
  connectedAt: timestamp("connected_at"),
  expiresAt: timestamp("expires_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
