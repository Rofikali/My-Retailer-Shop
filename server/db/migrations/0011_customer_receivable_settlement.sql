ALTER TYPE "sale_status" ADD VALUE IF NOT EXISTS 'partial';
--> statement-breakpoint
ALTER TYPE "sale_status" ADD VALUE IF NOT EXISTS 'overdue';
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "due_date" date;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_receipt_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "receipt_event_id" uuid NOT NULL,
  "sale_id" uuid NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customer_receipt_allocations_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "customer_receipt_allocations_receipt_sale_unique" UNIQUE("receipt_event_id", "sale_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_receipt_allocations" ADD CONSTRAINT "customer_receipt_allocations_receipt_event_id_party_ledger_events_id_fk" FOREIGN KEY ("receipt_event_id") REFERENCES "public"."party_ledger_events"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_receipt_allocations" ADD CONSTRAINT "customer_receipt_allocations_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_receipt_allocations" ADD CONSTRAINT "customer_receipt_allocations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_receipt_allocations_sale_idx" ON "customer_receipt_allocations" USING btree ("sale_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_receipt_allocations_receipt_idx" ON "customer_receipt_allocations" USING btree ("receipt_event_id");
