ALTER TABLE "mortgage_cases" ADD COLUMN "guarantee_date" date;--> statement-breakpoint
ALTER TABLE "mortgage_cases" ADD COLUMN "mortgage_confirmation_date" date;--> statement-breakpoint
CREATE TABLE "mortgage_case_advisors" (
	"mortgage_case_id" uuid NOT NULL,
	"advisor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mortgage_case_advisors_pk" PRIMARY KEY("mortgage_case_id","advisor_id")
);
--> statement-breakpoint
INSERT INTO "mortgage_case_advisors" ("mortgage_case_id", "advisor_id")
SELECT "id", "advisor_id"
FROM "mortgage_cases"
WHERE "advisor_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "mortgage_cases" DROP CONSTRAINT "mortgage_cases_advisor_id_advisors_id_fk";--> statement-breakpoint
DROP INDEX "mortgage_cases_advisor_id_idx";--> statement-breakpoint
ALTER TABLE "mortgage_cases" DROP COLUMN "advisor_id";--> statement-breakpoint
ALTER TABLE "mortgage_cases" DROP COLUMN "mortgage_confirmation";--> statement-breakpoint
ALTER TABLE "mortgage_case_advisors" ADD CONSTRAINT "mortgage_case_advisors_mortgage_case_id_mortgage_cases_id_fk" FOREIGN KEY ("mortgage_case_id") REFERENCES "public"."mortgage_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mortgage_case_advisors" ADD CONSTRAINT "mortgage_case_advisors_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mortgage_case_advisors_advisor_id_idx" ON "mortgage_case_advisors" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "mortgage_cases_guarantee_date_idx" ON "mortgage_cases" USING btree ("guarantee_date");--> statement-breakpoint
CREATE INDEX "mortgage_cases_mortgage_confirmation_date_idx" ON "mortgage_cases" USING btree ("mortgage_confirmation_date");
