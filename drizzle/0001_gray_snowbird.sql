ALTER TABLE "mortgage_cases" ADD COLUMN "offer_expiry_date" date;--> statement-breakpoint
CREATE INDEX "mortgage_cases_offer_expiry_date_idx" ON "mortgage_cases" USING btree ("offer_expiry_date");