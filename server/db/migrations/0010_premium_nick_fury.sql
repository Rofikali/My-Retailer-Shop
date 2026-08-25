CREATE TABLE IF NOT EXISTS "party_ledger_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_ledger_event_id" uuid NOT NULL,
	"particulars" text,
	"payment_mode" "payment_mode",
	"reference_no" text,
	"due_date" date,
	"remarks" text,
	"reason" text NOT NULL,
	"amended_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_amendments" ADD CONSTRAINT "party_ledger_amendments_party_ledger_event_id_party_ledger_events_id_fk" FOREIGN KEY ("party_ledger_event_id") REFERENCES "public"."party_ledger_events"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_amendments" ADD CONSTRAINT "party_ledger_amendments_amended_by_users_id_fk" FOREIGN KEY ("amended_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_ledger_amendments_event_created_idx" ON "party_ledger_amendments" USING btree ("party_ledger_event_id","created_at");
