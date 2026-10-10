import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const demoMembers = sqliteTable("demo_members", {
  role: text("role").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  productName: text("product_name").notNull().default(""),
  joinedAt: integer("joined_at").notNull(),
  groupId: text("group_id").notNull().default(""),
});

export const demoGroupMessages = sqliteTable("demo_group_messages", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  deviceId: text("device_id").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  check("demo_group_messages_body_check", sql`length(${table.body}) between 1 and 1000`),
  index("demo_group_messages_group_time_idx").on(table.groupId, table.createdAt, table.id),
]);

export const matchingProfiles = sqliteTable("matching_profiles", {
  userId: text("user_id").primaryKey(),
  role: text("role").notNull(),
  displayName: text("display_name").notNull(),
  skills: text("skills").notNull(),
  interests: text("interests").notNull(),
  businessGoal: text("business_goal").notNull(),
  availabilityHours: integer("availability_hours").notNull(),
  availabilitySlots: text("availability_slots").notNull(),
  matchOptIn: integer("match_opt_in").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  check("matching_profiles_role_check", sql`${table.role} in ('Product Creator', 'Marketing', 'Sales')`),
  check("matching_profiles_hours_check", sql`${table.availabilityHours} between 1 and 80`),
  index("matching_profiles_pool_idx").on(table.role, table.matchOptIn, table.updatedAt),
]);

export const matchingTeams = sqliteTable("matching_teams", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("forming"),
  matchScore: integer("match_score").notNull(),
  scoreBreakdown: text("score_breakdown").notNull(),
  acceptedCount: integer("accepted_count").notNull().default(0),
  acceptedProductCreator: integer("accepted_product_creator").notNull().default(0),
  acceptedMarketing: integer("accepted_marketing").notNull().default(0),
  acceptedSales: integer("accepted_sales").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  activatedAt: integer("activated_at"),
}, (table) => [
  check("matching_teams_status_check", sql`${table.status} in ('forming', 'active', 'cancelled')`),
  check("matching_teams_score_check", sql`${table.matchScore} between 0 and 100`),
  check("matching_teams_accepted_count_check", sql`${table.acceptedCount} between 0 and 3`),
  check("matching_teams_accepted_flags_check", sql`${table.acceptedProductCreator} in (0, 1) and ${table.acceptedMarketing} in (0, 1) and ${table.acceptedSales} in (0, 1)`),
  check("matching_teams_active_guard_check", sql`${table.status} != 'active' or (${table.acceptedCount} = 3 and ${table.acceptedProductCreator} = 1 and ${table.acceptedMarketing} = 1 and ${table.acceptedSales} = 1)`),
  index("matching_teams_status_idx").on(table.status, table.updatedAt),
]);

export const matchingTeamMembers = sqliteTable("matching_team_members", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => matchingTeams.id),
  userId: text("user_id").notNull().references(() => matchingProfiles.userId),
  role: text("role").notNull(),
  status: text("status").notNull().default("invited"),
  invitedAt: integer("invited_at").notNull(),
  respondedAt: integer("responded_at"),
}, (table) => [
  check("matching_team_members_role_check", sql`${table.role} in ('Product Creator', 'Marketing', 'Sales')`),
  check("matching_team_members_status_check", sql`${table.status} in ('invited', 'accepted', 'rejected', 'cancelled')`),
  uniqueIndex("matching_team_members_team_user_unique").on(table.teamId, table.userId),
  uniqueIndex("matching_team_members_reserved_user_unique").on(table.userId).where(sql`${table.status} in ('invited', 'accepted')`),
  uniqueIndex("matching_team_members_reserved_role_unique").on(table.teamId, table.role).where(sql`${table.status} in ('invited', 'accepted')`),
  index("matching_team_members_team_status_idx").on(table.teamId, table.status),
]);

export const matchingTasks = sqliteTable("matching_tasks", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => matchingTeams.id),
  userId: text("user_id").notNull().references(() => matchingProfiles.userId),
  role: text("role").notNull(),
  taskKey: text("task_key").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  completed: integer("completed").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  check("matching_tasks_completed_check", sql`${table.completed} in (0, 1)`),
  uniqueIndex("matching_tasks_team_user_key_unique").on(table.teamId, table.userId, table.taskKey),
  index("matching_tasks_team_idx").on(table.teamId, table.completed),
]);

// Ownership is inherited from the parent task rather than copied into every
// step. State and mutations join through that parent and the active membership.
export const matchingTaskSteps = sqliteTable("matching_task_steps", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => matchingTasks.id),
  stepKey: text("step_key").notNull(),
  sortOrder: integer("sort_order").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  completionOutput: text("completion_output").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  completed: integer("completed").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  check("matching_task_steps_completed_check", sql`${table.completed} in (0, 1)`),
  check("matching_task_steps_order_check", sql`${table.sortOrder} between 1 and 100`),
  check("matching_task_steps_minutes_check", sql`${table.estimatedMinutes} between 1 and 240`),
  uniqueIndex("matching_task_steps_task_key_unique").on(table.taskId, table.stepKey),
  index("matching_task_steps_task_order_idx").on(table.taskId, table.sortOrder),
]);

export const matchingMessages = sqliteTable("matching_messages", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => matchingTeams.id),
  userId: text("user_id").notNull().references(() => matchingProfiles.userId),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  check("matching_messages_body_check", sql`length(${table.body}) between 1 and 1000`),
  index("matching_messages_team_time_idx").on(table.teamId, table.createdAt, table.id),
]);

export const bookkeepingAccounts = sqliteTable("bookkeeping_accounts", {
  deviceId: text("device_id").primaryKey(),
  capabilityHash: text("capability_hash").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  check("bookkeeping_accounts_hash_check", sql`length(${table.capabilityHash}) = 64`),
]);

export const bookkeepingEntries = sqliteTable("bookkeeping_entries", {
  id: text("id").primaryKey(),
  scopeKey: text("scope_key").notNull(),
  ownerDevice: text("owner_device").notNull().references(() => bookkeepingAccounts.deviceId),
  kind: text("kind").notNull(),
  entryDate: text("entry_date").notNull(),
  merchant: text("merchant").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  category: text("category").notNull(),
  note: text("note").notNull().default(""),
  ocrText: text("ocr_text").notNull().default(""),
  payloadHash: text("payload_hash").notNull(),
  receiptKey: text("receipt_key"),
  receiptName: text("receipt_name"),
  receiptType: text("receipt_type"),
  receiptSize: integer("receipt_size"),
  status: text("status").notNull().default("posted"),
  createdAt: integer("created_at").notNull(),
  voidedAt: integer("voided_at"),
}, (table) => [
  check("bookkeeping_entries_kind_check", sql`${table.kind} in ('income', 'expense')`),
  check("bookkeeping_entries_amount_check", sql`${table.amountMinor} between 1 and 9999999999`),
  check("bookkeeping_entries_currency_check", sql`${table.currency} in ('MYR', 'SGD', 'USD', 'EUR', 'GBP')`),
  check("bookkeeping_entries_category_check", sql`${table.category} in ('Materials', 'Packaging', 'Marketing', 'Transport', 'Sales', 'Other')`),
  check("bookkeeping_entries_status_check", sql`${table.status} in ('posted', 'void')`),
  check("bookkeeping_entries_void_check", sql`(${table.status} = 'posted' and ${table.voidedAt} is null) or (${table.status} = 'void' and ${table.voidedAt} is not null)`),
  check("bookkeeping_entries_merchant_check", sql`length(${table.merchant}) between 1 and 120`),
  check("bookkeeping_entries_note_check", sql`length(${table.note}) <= 500`),
  check("bookkeeping_entries_ocr_check", sql`length(${table.ocrText}) <= 20000`),
  check("bookkeeping_entries_payload_check", sql`length(${table.payloadHash}) = 64`),
  check("bookkeeping_entries_receipt_check", sql`(${table.receiptKey} is null and ${table.receiptName} is null and ${table.receiptType} is null and ${table.receiptSize} is null) or (${table.receiptKey} is not null and ${table.receiptName} is not null and ${table.receiptType} in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') and ${table.receiptSize} between 1 and 8388608)`),
  index("bookkeeping_entries_scope_date_idx").on(table.scopeKey, table.entryDate, table.createdAt, table.id),
  index("bookkeeping_entries_scope_status_currency_idx").on(table.scopeKey, table.status, table.currency),
  index("bookkeeping_entries_owner_idx").on(table.ownerDevice, table.createdAt),
]);
