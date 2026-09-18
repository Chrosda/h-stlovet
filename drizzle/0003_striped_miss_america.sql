CREATE TABLE `challenge_details` (
	`challenge` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`instructions` text NOT NULL,
	`reward` text NOT NULL,
	`kind` text DEFAULT 'gift' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`greeting` text DEFAULT 'Bra jobbat! Vi är stolta över dig.' NOT NULL,
	`opened` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`challenge`) REFERENCES `assigned_challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `child_preferences` (
	`child` text PRIMARY KEY NOT NULL,
	`avatar` text DEFAULT 'sun' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`household` text NOT NULL,
	`child` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created` text NOT NULL
);
