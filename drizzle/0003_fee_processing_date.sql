ALTER TABLE "mortgage_cases" ADD COLUMN "fee_processing_date" date;--> statement-breakpoint
CREATE INDEX "mortgage_cases_fee_processing_date_idx" ON "mortgage_cases" USING btree ("fee_processing_date");
