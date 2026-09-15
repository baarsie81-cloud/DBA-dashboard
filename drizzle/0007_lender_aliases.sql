CREATE TABLE "lender_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias_name" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"lender_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lender_aliases_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lender_aliases_normalized_alias_uidx" ON "lender_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE INDEX "lender_aliases_lender_id_idx" ON "lender_aliases" USING btree ("lender_id");
