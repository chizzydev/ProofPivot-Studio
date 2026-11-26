CREATE TABLE `internal_pilot_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run` text NOT NULL,
	`decision` text NOT NULL,
	`at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `internal_pilot_slots` (
	`run` text NOT NULL,
	`identity` text NOT NULL,
	`at` integer NOT NULL,
	PRIMARY KEY(`run`, `identity`)
);
