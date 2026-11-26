CREATE TABLE `answers` (
	`run` text NOT NULL,
	`identity` text NOT NULL,
	`option` integer NOT NULL,
	`correct` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	PRIMARY KEY(`run`, `identity`)
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outbox_id` text NOT NULL,
	`at` integer NOT NULL,
	`status` text NOT NULL,
	`detail` text
);
--> statement-breakpoint
CREATE TABLE `operator_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run` text NOT NULL,
	`received_at` integer NOT NULL,
	`payload` text NOT NULL,
	`sha256` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`run` text NOT NULL,
	`identity` text NOT NULL,
	`event` text NOT NULL,
	`value` text,
	`experiment_id` integer NOT NULL,
	`domain_at` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`http_at` integer,
	`detail` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `logical_event_unique` ON `outbox` (`run`,`identity`,`event`);--> statement-breakpoint
CREATE TABLE `participants` (
	`run` text NOT NULL,
	`identity` text NOT NULL,
	`consented_at` integer NOT NULL,
	`variant` text,
	`value` text,
	`experiment_id` integer,
	`assigned_at` integer,
	`rendered_at` integer,
	`exposed_at` integer,
	`quarantined` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`run`, `identity`)
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`environment` text NOT NULL,
	`payload_hash` text NOT NULL,
	`protocol_hash` text NOT NULL
);
