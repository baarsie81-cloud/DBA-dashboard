ALTER TABLE "mortgage_cases" ADD COLUMN "svn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mortgage_cases" ADD COLUMN "ready_for_passing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mortgage_cases" ADD COLUMN "dossier_year" integer;--> statement-breakpoint
CREATE INDEX "mortgage_cases_dossier_year_idx" ON "mortgage_cases" USING btree ("dossier_year");
