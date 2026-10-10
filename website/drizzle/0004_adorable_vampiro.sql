CREATE TABLE `demo_group_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`device_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "demo_group_messages_body_check" CHECK(length("demo_group_messages"."body") between 1 and 1000)
);
--> statement-breakpoint
CREATE INDEX `demo_group_messages_group_time_idx` ON `demo_group_messages` (`group_id`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `demo_members` ADD `group_id` text DEFAULT '' NOT NULL;