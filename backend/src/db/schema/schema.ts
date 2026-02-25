import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});
