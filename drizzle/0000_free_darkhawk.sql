CREATE TABLE `cloud_mutations` (
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `request_id`)
);
--> statement-breakpoint
CREATE TABLE `cloud_records` (
	`user_id` text NOT NULL,
	`collection` text NOT NULL,
	`record_id` text NOT NULL,
	`value` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `collection`, `record_id`)
);
