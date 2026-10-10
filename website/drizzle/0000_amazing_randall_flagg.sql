CREATE TABLE `demo_members` (
	`role` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`display_name` text NOT NULL,
	`product_name` text DEFAULT '' NOT NULL,
	`joined_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_members_device_id_unique` ON `demo_members` (`device_id`);