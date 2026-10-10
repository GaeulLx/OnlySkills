CREATE TABLE `matching_task_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`step_key` text NOT NULL,
	`sort_order` integer NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`completion_output` text NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `matching_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matching_task_steps_completed_check" CHECK("matching_task_steps"."completed" in (0, 1)),
	CONSTRAINT "matching_task_steps_order_check" CHECK("matching_task_steps"."sort_order" between 1 and 100),
	CONSTRAINT "matching_task_steps_minutes_check" CHECK("matching_task_steps"."estimated_minutes" between 1 and 240)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matching_task_steps_task_key_unique` ON `matching_task_steps` (`task_id`,`step_key`);--> statement-breakpoint
CREATE INDEX `matching_task_steps_task_order_idx` ON `matching_task_steps` (`task_id`,`sort_order`);