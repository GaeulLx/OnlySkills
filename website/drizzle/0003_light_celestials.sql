CREATE TABLE `matching_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `matching_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `matching_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matching_messages_body_check" CHECK(length("matching_messages"."body") between 1 and 1000)
);
--> statement-breakpoint
CREATE INDEX `matching_messages_team_time_idx` ON `matching_messages` (`team_id`,`created_at`,`id`);