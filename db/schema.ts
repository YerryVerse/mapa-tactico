import {primaryKey,sqliteTable,integer,text} from 'drizzle-orm/sqlite-core';
// Singleton budget. No visitor identifier, IP, cookie or query is persisted.
export const searchBudget=sqliteTable('search_budget',{
 id:text('id').primaryKey(),window:integer('window').notNull(),hits:integer('hits').notNull()
});
// One global UTC-day counter for anonymous WorldPop calls; no visitor or query data is persisted.
export const populationBudget=sqliteTable('population_budget',{
 id:text('id').primaryKey(),utcDay:integer('utc_day').notNull(),hits:integer('hits').notNull()
});
// Operator-only resumable multipart uploads; these rows contain asset paths and hashes, never visitor data.
export const populationIngestJobs=sqliteTable('population_ingest_jobs',{
 objectKey:text('object_key').primaryKey(),uploadId:text('upload_id').notNull(),sha256:text('sha256').notNull(),bytes:integer('bytes').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
});
export const populationIngestParts=sqliteTable('population_ingest_parts',{
 objectKey:text('object_key').notNull(),partNumber:integer('part_number').notNull(),etag:text('etag').notNull(),sha256:text('sha256').notNull(),bytes:integer('bytes').notNull()
},table=>[primaryKey({columns:[table.objectKey,table.partNumber]})]);
export const populationIngestReady=sqliteTable('population_ingest_ready',{
 countryCode:text('country_code').primaryKey(),datasetId:text('dataset_id').notNull(),sourceSha256:text('source_sha256').notNull(),manifestKey:text('manifest_key').notNull(),manifestSha256:text('manifest_sha256').notNull(),updatedAt:integer('updated_at').notNull()
});
