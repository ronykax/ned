CREATE TABLE `profile` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`instructions` text NOT NULL,
	`last_run_at` integer NOT NULL,
	`minutes` integer NOT NULL,
	`recurring` integer NOT NULL
);
