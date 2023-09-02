import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  json,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  full_name: text('full_name').notNull(),
  user_name: text('user_name').notNull().unique(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  pronouns: text('pronouns').notNull(),
  password_hash: text('password_hash').notNull(),
  role: text('role').default('USER').notNull(),
  confirm_hash: text('confirm_hash'),
});

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  image_src: text('image_src'),
  owner_id: integer('owner_id')
    .references(() => users.id)
    .notNull(),
  holder_id: integer('holder_id')
    .references(() => users.id)
    .notNull(),
  offered: boolean('offered').default(true).notNull()
});

export const borrow_requests = pgTable('borrow_requests', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id').references(() => items.id).notNull(),
  lender_id: integer('lender_id').references(() => users.id).notNull(),
  borrower_id: integer('borrower_id').references(() => users.id).notNull(),
  status: text('status').default('PENDING'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const borrow_requestsRelations = relations(borrow_requests, ({ many }) => ({
	request_actions: many(request_actions),
}));

export const request_actions = pgTable('request_actions', {
  id: serial('id').primaryKey(),
  borrow_request_id: integer('borrow_request_id').notNull(),
  user_id:            integer('user_id'           ).references(() => users.id           ).notNull(),
  type: text('type').notNull(),
  message: text('message'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const request_actionsRelations = relations(request_actions, ({ one }) => ({
	borrow_request: one(borrow_requests, {
		fields: [request_actions.borrow_request_id],
		references: [borrow_requests.id],
	}),
}));

export const community = pgTable('community', {
  id: serial('id').primaryKey(),
  name: text('name'),
  description: text('description'),
});

export const item_visibility = pgTable('item_visibility', {
  item_id: integer('item_id').references(() => items.id),
  community_id: integer('community_id').references(() => community.id),
});

export const notifications = pgTable('notifications',{
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id).notNull(),
  text: text('text'),
  url: text('url'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  read: boolean('read').default(false).notNull(),
});
