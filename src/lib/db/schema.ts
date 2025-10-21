import {
	boolean,
	foreignKey,
	index,
	integer,
	json,
	numeric,
	pgTable,
	serial,
	text,
	timestamp,
	varchar
} from 'drizzle-orm/pg-core';

export const functionLogs = pgTable(
	'function_logs',
	{
		id: serial().primaryKey().notNull(),
		rowDate: timestamp('row_date', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		funcId: integer('func_id').notNull(),
		type: varchar({ length: 10 }).notNull(),
		message: text().notNull(),
		traceBack: text('trace_back')
	},
	(table) => [
		foreignKey({
			columns: [table.funcId],
			foreignColumns: [functionProgress.funcId],
			name: 'fk_function_logs_func_id_function_progress'
		}),
		index('idx_function_logs_type').on(table.type),
		index('idx_function_logs_message').on(table.message),
		index('idx_function_logs_func_id_row_date').on(table.funcId, table.rowDate)
	]
);

export const functionProgress = pgTable(
	'function_progress',
	{
		funcId: serial('func_id').primaryKey().notNull(),
		parentId: integer('parent_id'),
		slug: varchar('slug', { length: 200 }),
		startDate: timestamp('start_date', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		endDate: timestamp('end_date', { withTimezone: true, mode: 'string' }),
		finished: boolean().notNull(),
		success: boolean().notNull(),
		source: varchar({ length: 20 }).notNull().default(''),
		args: json(),
		funcHeaderId: integer('func_header_id').notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.funcId],
			name: 'fk_function_progress_parent_id_function_progress'
		}),
		foreignKey({
			columns: [table.funcHeaderId],
			foreignColumns: [functionHeaders.id],
			name: 'function_progress_function_headers_fk'
		}),
		index('idx_function_progress_source').on(table.source),
		index('idx_function_progress_start_date_finished_success').on(
			table.startDate,
			table.finished,
			table.success
		)
	]
);

export const functionHeaders = pgTable('function_headers', {
	id: serial().primaryKey().notNull(),
	funcName: varchar('func_name', { length: 200 }).notNull(),
	funcSlug: text('func_slug').notNull()
});

export const functionProgressTracking = pgTable(
	'function_progress_tracking',
	{
		id: serial().primaryKey().notNull(),
		funcId: integer('func_id').notNull(),
		progId: varchar('prog_id', { length: 100 }).notNull(),
		title: varchar('title', { length: 200 }).notNull(),
		description: text().notNull(),
		currentValue: numeric('current_value').notNull(),
		maxValue: numeric('max_value'),
		duration: numeric('duration'),
		lastUpdated: timestamp('last_updated', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		completed: boolean('completed').notNull().default(false)
	},
	(table) => [
		foreignKey({
			columns: [table.funcId],
			foreignColumns: [functionProgress.funcId],
			name: 'fk_function_progress_tracking_func_id_function_progress'
		})
	]
);

export const savedSearches = pgTable('saved_searches', {
	id: serial().primaryKey().notNull(),
	name: varchar('name', { length: 200 }).notNull(),
	filters: json().notNull(),
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'string'
	})
		.notNull()
		.defaultNow()
});
