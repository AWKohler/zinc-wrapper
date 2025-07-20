import { pgTable, serial, varchar, jsonb, timestamp, text, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const orderStatusEnum = pgEnum('order_status', [
  'processing',
  'placed',
  'delivered',
  'failed',
  'aborted',
  'attempting_to_cancel',
  'cancelled'
]);

export const eventTypeEnum = pgEnum('event_type', [
  'request_succeeded',
  'request_failed',
  'tracking_updated',
  'status_updated',
  'case_updated'
]);

// Tables
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 255 }).notNull().unique(),
  asinList: varchar('asin_list', { length: 255 }).array(),
  userId: varchar('user_id', { length: 255 }),
  status: orderStatusEnum('status').notNull().default('processing'),
  zincPayload: jsonb('zinc_payload'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  requestIdIdx: index('idx_orders_request_id').on(table.requestId),
  userIdIdx: index('idx_orders_user_id').on(table.userId),
  statusIdx: index('idx_orders_status').on(table.status),
}));

export const zincEvents = pgTable('zinc_events', {
  id: serial('id').primaryKey(),
  orderId: serial('order_id').references(() => orders.id),
  eventType: eventTypeEnum('event_type').notNull(),
  rawBody: jsonb('raw_body').notNull(),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('idx_zinc_events_order_id').on(table.orderId),
  eventTypeIdx: index('idx_zinc_events_event_type').on(table.eventType),
}));

export const cancellations = pgTable('cancellations', {
  id: serial('id').primaryKey(),
  orderId: serial('order_id').references(() => orders.id),
  requestId: varchar('request_id', { length: 255 }).notNull().unique(),
  merchantOrderId: varchar('merchant_order_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  zincPayload: jsonb('zinc_payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('idx_cancellations_order_id').on(table.orderId),
  requestIdIdx: index('idx_cancellations_request_id').on(table.requestId),
}));

export const returns = pgTable('returns', {
  id: serial('id').primaryKey(),
  orderId: serial('order_id').references(() => orders.id),
  requestId: varchar('request_id', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  zincPayload: jsonb('zinc_payload'),
  labelUrls: text('label_urls').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('idx_returns_order_id').on(table.orderId),
  requestIdIdx: index('idx_returns_request_id').on(table.requestId),
}));

export const cases = pgTable('cases', {
  id: serial('id').primaryKey(),
  orderId: serial('order_id').references(() => orders.id),
  caseId: varchar('case_id', { length: 255 }).unique(),
  status: varchar('status', { length: 50 }).notNull().default('open'),
  zincPayload: jsonb('zinc_payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('idx_cases_order_id').on(table.orderId),
  caseIdIdx: index('idx_cases_case_id').on(table.caseId),
}));

// Relations
export const ordersRelations = relations(orders, ({ many }) => ({
  events: many(zincEvents),
  cancellations: many(cancellations),
  returns: many(returns),
  cases: many(cases),
}));

export const zincEventsRelations = relations(zincEvents, ({ one }) => ({
  order: one(orders, {
    fields: [zincEvents.orderId],
    references: [orders.id],
  }),
}));

export const cancellationsRelations = relations(cancellations, ({ one }) => ({
  order: one(orders, {
    fields: [cancellations.orderId],
    references: [orders.id],
  }),
}));

export const returnsRelations = relations(returns, ({ one }) => ({
  order: one(orders, {
    fields: [returns.orderId],
    references: [orders.id],
  }),
}));

export const casesRelations = relations(cases, ({ one }) => ({
  order: one(orders, {
    fields: [cases.orderId],
    references: [orders.id],
  }),
}));

// Type exports
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type ZincEvent = typeof zincEvents.$inferSelect;
export type NewZincEvent = typeof zincEvents.$inferInsert;
export type Cancellation = typeof cancellations.$inferSelect;
export type NewCancellation = typeof cancellations.$inferInsert;
export type Return = typeof returns.$inferSelect;
export type NewReturn = typeof returns.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;