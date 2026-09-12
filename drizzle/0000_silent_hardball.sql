CREATE TYPE "public"."mortgage_phase" AS ENUM('prospect', 'in_behandeling', 'geannuleerd', 'afgehandeld');--> statement-breakpoint
CREATE TABLE "advisors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mortgage_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"advisor_id" uuid,
	"mortgage_type" text,
	"application_date" date,
	"lender_id" uuid,
	"principal_amount" numeric(14, 2),
	"last_check_date" date,
	"financing_condition_date" date,
	"bank_guarantee" text,
	"passing_date" date,
	"mortgage_confirmation" text,
	"fee" numeric(12, 2),
	"notes" text,
	"phase" "mortgage_phase" DEFAULT 'prospect' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mortgage_cases" ADD CONSTRAINT "mortgage_cases_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mortgage_cases" ADD CONSTRAINT "mortgage_cases_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mortgage_cases_phase_idx" ON "mortgage_cases" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "mortgage_cases_advisor_id_idx" ON "mortgage_cases" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "mortgage_cases_lender_id_idx" ON "mortgage_cases" USING btree ("lender_id");--> statement-breakpoint
CREATE INDEX "mortgage_cases_passing_date_idx" ON "mortgage_cases" USING btree ("passing_date");--> statement-breakpoint
CREATE INDEX "mortgage_cases_financing_condition_date_idx" ON "mortgage_cases" USING btree ("financing_condition_date");--> statement-breakpoint
CREATE INDEX "mortgage_cases_application_date_idx" ON "mortgage_cases" USING btree ("application_date");