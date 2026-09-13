ALTER TABLE "mortgage_cases" ADD COLUMN "legacy_import_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "mortgage_cases_legacy_import_key_uidx" ON "mortgage_cases" USING btree ("legacy_import_key");--> statement-breakpoint
CREATE TABLE "excel_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer NOT NULL,
	"new_count" integer NOT NULL,
	"updated_count" integer NOT NULL,
	"unchanged_count" integer NOT NULL,
	"error_count" integer NOT NULL
);
