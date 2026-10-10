CREATE TABLE `matching_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`skills` text NOT NULL,
	`interests` text NOT NULL,
	`business_goal` text NOT NULL,
	`availability_hours` integer NOT NULL,
	`availability_slots` text NOT NULL,
	`match_opt_in` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "matching_profiles_role_check" CHECK("matching_profiles"."role" in ('Product Creator', 'Marketing', 'Sales')),
	CONSTRAINT "matching_profiles_hours_check" CHECK("matching_profiles"."availability_hours" between 1 and 80)
);
--> statement-breakpoint
CREATE INDEX `matching_profiles_pool_idx` ON `matching_profiles` (`role`,`match_opt_in`,`updated_at`);--> statement-breakpoint
CREATE TABLE `matching_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`task_key` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `matching_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `matching_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matching_tasks_completed_check" CHECK("matching_tasks"."completed" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matching_tasks_team_user_key_unique` ON `matching_tasks` (`team_id`,`user_id`,`task_key`);--> statement-breakpoint
CREATE INDEX `matching_tasks_team_idx` ON `matching_tasks` (`team_id`,`completed`);--> statement-breakpoint
CREATE TABLE `matching_team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`invited_at` integer NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`team_id`) REFERENCES `matching_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `matching_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matching_team_members_role_check" CHECK("matching_team_members"."role" in ('Product Creator', 'Marketing', 'Sales')),
	CONSTRAINT "matching_team_members_status_check" CHECK("matching_team_members"."status" in ('invited', 'accepted', 'rejected', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matching_team_members_team_user_unique` ON `matching_team_members` (`team_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `matching_team_members_reserved_user_unique` ON `matching_team_members` (`user_id`) WHERE "matching_team_members"."status" in ('invited', 'accepted');--> statement-breakpoint
CREATE UNIQUE INDEX `matching_team_members_reserved_role_unique` ON `matching_team_members` (`team_id`,`role`) WHERE "matching_team_members"."status" in ('invited', 'accepted');--> statement-breakpoint
CREATE INDEX `matching_team_members_team_status_idx` ON `matching_team_members` (`team_id`,`status`);--> statement-breakpoint
CREATE TABLE `matching_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'forming' NOT NULL,
	`match_score` integer NOT NULL,
	`score_breakdown` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`activated_at` integer,
	CONSTRAINT "matching_teams_status_check" CHECK("matching_teams"."status" in ('forming', 'active', 'cancelled')),
	CONSTRAINT "matching_teams_score_check" CHECK("matching_teams"."match_score" between 0 and 100)
);
--> statement-breakpoint
CREATE INDEX `matching_teams_status_idx` ON `matching_teams` (`status`,`updated_at`);
