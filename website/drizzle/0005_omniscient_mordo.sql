CREATE TABLE `bookkeeping_accounts` (
	`device_id` text PRIMARY KEY NOT NULL,
	`capability_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "bookkeeping_accounts_hash_check" CHECK(length("bookkeeping_accounts"."capability_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE `bookkeeping_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_key` text NOT NULL,
	`owner_device` text NOT NULL,
	`kind` text NOT NULL,
	`entry_date` text NOT NULL,
	`merchant` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`category` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`ocr_text` text DEFAULT '' NOT NULL,
	`payload_hash` text NOT NULL,
	`receipt_key` text,
	`receipt_name` text,
	`receipt_type` text,
	`receipt_size` integer,
	`status` text DEFAULT 'posted' NOT NULL,
	`created_at` integer NOT NULL,
	`voided_at` integer,
	FOREIGN KEY (`owner_device`) REFERENCES `bookkeeping_accounts`(`device_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bookkeeping_entries_kind_check" CHECK("bookkeeping_entries"."kind" in ('income', 'expense')),
	CONSTRAINT "bookkeeping_entries_amount_check" CHECK("bookkeeping_entries"."amount_minor" between 1 and 9999999999),
	CONSTRAINT "bookkeeping_entries_currency_check" CHECK("bookkeeping_entries"."currency" in ('MYR', 'SGD', 'USD', 'EUR', 'GBP')),
	CONSTRAINT "bookkeeping_entries_category_check" CHECK("bookkeeping_entries"."category" in ('Materials', 'Packaging', 'Marketing', 'Transport', 'Sales', 'Other')),
	CONSTRAINT "bookkeeping_entries_status_check" CHECK("bookkeeping_entries"."status" in ('posted', 'void')),
	CONSTRAINT "bookkeeping_entries_void_check" CHECK(("bookkeeping_entries"."status" = 'posted' and "bookkeeping_entries"."voided_at" is null) or ("bookkeeping_entries"."status" = 'void' and "bookkeeping_entries"."voided_at" is not null)),
	CONSTRAINT "bookkeeping_entries_merchant_check" CHECK(length("bookkeeping_entries"."merchant") between 1 and 120),
	CONSTRAINT "bookkeeping_entries_note_check" CHECK(length("bookkeeping_entries"."note") <= 500),
	CONSTRAINT "bookkeeping_entries_ocr_check" CHECK(length("bookkeeping_entries"."ocr_text") <= 20000),
	CONSTRAINT "bookkeeping_entries_payload_check" CHECK(length("bookkeeping_entries"."payload_hash") = 64),
	CONSTRAINT "bookkeeping_entries_receipt_check" CHECK(("bookkeeping_entries"."receipt_key" is null and "bookkeeping_entries"."receipt_name" is null and "bookkeeping_entries"."receipt_type" is null and "bookkeeping_entries"."receipt_size" is null) or ("bookkeeping_entries"."receipt_key" is not null and "bookkeeping_entries"."receipt_name" is not null and "bookkeeping_entries"."receipt_type" in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') and "bookkeeping_entries"."receipt_size" between 1 and 8388608))
);
--> statement-breakpoint
CREATE INDEX `bookkeeping_entries_scope_date_idx` ON `bookkeeping_entries` (`scope_key`,`entry_date`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `bookkeeping_entries_scope_status_currency_idx` ON `bookkeeping_entries` (`scope_key`,`status`,`currency`);--> statement-breakpoint
CREATE INDEX `bookkeeping_entries_owner_idx` ON `bookkeeping_entries` (`owner_device`,`created_at`);