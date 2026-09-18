CREATE TABLE `balance_accounts` (
	`household` text PRIMARY KEY NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`spent` integer DEFAULT 0 NOT NULL,
	`refunded` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`household`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "nonnegative_money" CHECK("balance_accounts"."available" >= 0 AND "balance_accounts"."reserved" >= 0 AND "balance_accounts"."spent" >= 0 AND "balance_accounts"."refunded" >= 0)
);
