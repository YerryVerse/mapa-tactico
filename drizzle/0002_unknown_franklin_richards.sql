CREATE TABLE `population_ingest_jobs` (
	`object_key` text PRIMARY KEY NOT NULL,
	`upload_id` text NOT NULL,
	`sha256` text NOT NULL,
	`bytes` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `population_ingest_parts` (
	`object_key` text NOT NULL,
	`part_number` integer NOT NULL,
	`etag` text NOT NULL,
	`sha256` text NOT NULL,
	`bytes` integer NOT NULL,
	PRIMARY KEY(`object_key`, `part_number`)
);
--> statement-breakpoint
CREATE TABLE `population_ingest_ready` (
	`country_code` text PRIMARY KEY NOT NULL,
	`dataset_id` text NOT NULL,
	`source_sha256` text NOT NULL,
	`manifest_key` text NOT NULL,
	`manifest_sha256` text NOT NULL,
	`updated_at` integer NOT NULL
);
