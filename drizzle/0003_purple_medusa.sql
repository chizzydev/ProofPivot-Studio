CREATE TABLE `consents` (
	`run` text NOT NULL,
	`identity` text NOT NULL,
	`protocol_hash` text NOT NULL,
	`adult_english` integer NOT NULL,
	`first_time` integer NOT NULL,
	`at` integer NOT NULL,
	PRIMARY KEY(`run`, `identity`)
);
