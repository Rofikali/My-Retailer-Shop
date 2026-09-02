ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "due_date" date;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_payment_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_event_id" uuid NOT NULL,
  "purchase_id" uuid NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "supplier_payment_allocations_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "supplier_payment_allocations_payment_purchase_unique" UNIQUE("payment_event_id", "purchase_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_event_fk" FOREIGN KEY ("payment_event_id") REFERENCES "public"."party_ledger_events"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_purchase_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_purchase_idx" ON "supplier_payment_allocations" USING btree ("purchase_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_payment_idx" ON "supplier_payment_allocations" USING btree ("payment_event_id");
