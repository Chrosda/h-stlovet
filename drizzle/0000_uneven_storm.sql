CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge` text NOT NULL,
	`parent` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`challenge`) REFERENCES `assigned_challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approvals_challenge_unique` ON `approvals` (`challenge`);--> statement-breakpoint
CREATE TABLE `assigned_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`child` text NOT NULL,
	`template` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`household`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child`) REFERENCES `child_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`actor` text NOT NULL,
	`event` text NOT NULL,
	`reference` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `child_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`nickname` text NOT NULL,
	`phone` text NOT NULL,
	`token_hash` text,
	`token_expires` integer,
	`version` integer DEFAULT 0 NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`household`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `completion_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`challenge`) REFERENCES `assigned_challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider_ref` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `reward_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_order_id_unique` ON `coupons` (`order_id`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `households_owner_unique` ON `households` (`owner`);--> statement-breakpoint
CREATE TABLE `ledger_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`spent` integer DEFAULT 0 NOT NULL,
	`refunded` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`household`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`child` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reward_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`challenge` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`scenario` text DEFAULT 'success' NOT NULL,
	`error` text,
	`created` text NOT NULL,
	FOREIGN KEY (`household`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenge`) REFERENCES `assigned_challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_orders_challenge_unique` ON `reward_orders` (`challenge`);--> statement-breakpoint
CREATE TABLE `parent_users` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`household`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`household`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `child_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`child` text NOT NULL,
	`version` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenge_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL
);
