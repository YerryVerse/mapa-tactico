import {sqliteTable,integer,text} from 'drizzle-orm/sqlite-core';
// Singleton budget. No visitor identifier, IP, cookie or query is persisted.
export const searchBudget=sqliteTable('search_budget',{
 id:text('id').primaryKey(),window:integer('window').notNull(),hits:integer('hits').notNull()
});
