import {
  pgTable, uuid, text, timestamp, boolean, integer, decimal, jsonb, serial, interval, uniqueIndex, index
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ══════════════════════════════════════════════
// INVITE CODES
// ══════════════════════════════════════════════
export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  tenantName: text('tenant_name').notNull(),
  email: text('email'),
  maxUses: integer('max_uses').default(1),
  usedCount: integer('used_count').default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ══════════════════════════════════════════════
// TENANTS
// ══════════════════════════════════════════════
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  logoUrl: text('logo_url'),
  plan: text('plan').default('basic'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ══════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('member'),
  avatarUrl: text('avatar_url'),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueEmail: uniqueIndex('users_tenant_email_idx').on(table.tenantId, table.email),
}))

// ══════════════════════════════════════════════
// AGENT_LEADS (tabela existente do n8n — mínima alteração)
// ══════════════════════════════════════════════
export const agentLeads = pgTable('agent_leads', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  idWp: text('id_wp'),
  number: text('number'),
  info: text('info'),
  crm: integer('crm'),
  ultimamsgIa: timestamp('ultimamsg_ia', { withTimezone: true }),
  ultimamsgLead: timestamp('ultimamsg_lead', { withTimezone: true }),
  ultimamsgAtendente: timestamp('ultimamsg_atendente', { withTimezone: true }),
  ultimamsgFrom: text('ultimamsg_from'),
  followup: integer('followup'),
  tempoRespostaEnviado: boolean('tempo_resposta_enviado').default(false),
  temporesposta: text('temporesposta'),
  syncedContactId: uuid('synced_contact_id'),
}, (table) => ({
  tenantIdx: index('agent_leads_tenant_idx').on(table.tenantId),
  numberIdx: index('agent_leads_number_idx').on(table.tenantId, table.number),
}))

// ══════════════════════════════════════════════
// CONTACTS
// ══════════════════════════════════════════════
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Novo Lead'),
  phone: text('phone'),
  email: text('email'),
  company: text('company'),
  source: text('source').default('whatsapp'),
  tags: text('tags').array().default([]),
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('contacts_tenant_idx').on(table.tenantId),
  phoneIdx: uniqueIndex('contacts_phone_idx').on(table.tenantId, table.phone),
}))

// ══════════════════════════════════════════════
// PIPELINES
// ══════════════════════════════════════════════
export const pipelines = pgTable('pipelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Pipeline Principal'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ══════════════════════════════════════════════
// PIPELINE_STAGES
// ══════════════════════════════════════════════
export const pipelineStages = pgTable('pipeline_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').default('#C9A84C'),
  position: integer('position').notNull(),
  isSystem: boolean('is_system').default(false),
  spinValue: integer('spin_value'),
  stageType: text('stage_type').default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  positionIdx: index('stages_position_idx').on(table.pipelineId, table.position),
}))

// ══════════════════════════════════════════════
// DEALS
// ══════════════════════════════════════════════
export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id),
  stageId: uuid('stage_id').notNull().references(() => pipelineStages.id),
  title: text('title').notNull(),
  value: decimal('value', { precision: 12, scale: 2 }).default('0'),
  status: text('status').default('open'),
  lostReason: text('lost_reason'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('deals_tenant_idx').on(table.tenantId),
  stageIdx: index('deals_stage_idx').on(table.stageId),
  contactIdx: index('deals_contact_idx').on(table.contactId),
}))

// ══════════════════════════════════════════════
// ACTIVITIES
// ══════════════════════════════════════════════
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  content: text('content'),
  metadata: jsonb('metadata').default({}),
  authorType: text('author_type').default('system'),
  authorId: uuid('author_id'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('activities_deal_idx').on(table.dealId),
  contactIdx: index('activities_contact_idx').on(table.contactId),
}))

// ══════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  title: text('title').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  assignedIdx: index('tasks_assigned_idx').on(table.assignedTo, table.completed),
}))

// ══════════════════════════════════════════════
// RELATIONS
// ══════════════════════════════════════════════
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  contacts: many(contacts),
  pipelines: many(pipelines),
  deals: many(deals),
}))

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [contacts.tenantId], references: [tenants.id] }),
  deals: many(deals),
  activities: many(activities),
}))

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  tenant: one(tenants, { fields: [pipelines.tenantId], references: [tenants.id] }),
  stages: many(pipelineStages),
}))

export const pipelineStagesRelations = relations(pipelineStages, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [pipelineStages.pipelineId], references: [pipelines.id] }),
  deals: many(deals),
}))

export const dealsRelations = relations(deals, ({ one, many }) => ({
  tenant: one(tenants, { fields: [deals.tenantId], references: [tenants.id] }),
  contact: one(contacts, { fields: [deals.contactId], references: [contacts.id] }),
  pipeline: one(pipelines, { fields: [deals.pipelineId], references: [pipelines.id] }),
  stage: one(pipelineStages, { fields: [deals.stageId], references: [pipelineStages.id] }),
  assignee: one(users, { fields: [deals.assignedTo], references: [users.id] }),
  activities: many(activities),
}))

export const activitiesRelations = relations(activities, ({ one }) => ({
  deal: one(deals, { fields: [activities.dealId], references: [deals.id] }),
  contact: one(contacts, { fields: [activities.contactId], references: [contacts.id] }),
}))
