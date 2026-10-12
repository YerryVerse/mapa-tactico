import {sqliteTable,integer,text} from 'drizzle-orm/sqlite-core';
// Singleton budget. No visitor identifier, IP, cookie or query is persisted.
export const searchBudget=sqliteTable('search_budget',{
 id:text('id').primaryKey(),window:integer('window').notNull(),hits:integer('hits').notNull()
});
// One global UTC-day counter for anonymous WorldPop calls; no visitor or query data is persisted.
export const populationBudget=sqliteTable('population_budget',{
 id:text('id').primaryKey(),utcDay:integer('utc_day').notNull(),hits:integer('hits').notNull()
});
