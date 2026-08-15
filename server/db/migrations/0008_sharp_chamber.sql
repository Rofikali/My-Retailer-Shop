CREATE TABLE IF NOT EXISTS "party_ledger_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_date" date NOT NULL,
	"voucher_no" text NOT NULL,
	"invoice_no" text,
	"purchase_no" text,
	"customer_id" uuid,
	"supplier_id" uuid,
	"particulars" text NOT NULL,
	"debit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_mode" "payment_mode",
	"reference_type" "reference_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"reference_no" text,
	"due_date" date,
	"status" text DEFAULT 'posted' NOT NULL,
	"salesperson_id" uuid,
	"remarks" text,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"reverses_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_ledger_events_one_party" CHECK ((("party_ledger_events"."customer_id" IS NOT NULL)::int + ("party_ledger_events"."supplier_id" IS NOT NULL)::int) = 1),
	CONSTRAINT "party_ledger_events_amount_present" CHECK ("party_ledger_events"."debit" >= 0 AND "party_ledger_events"."credit" >= 0 AND ("party_ledger_events"."debit" > 0 OR "party_ledger_events"."credit" > 0))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_events" ADD CONSTRAINT "party_ledger_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_events" ADD CONSTRAINT "party_ledger_events_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_events" ADD CONSTRAINT "party_ledger_events_salesperson_id_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_events" ADD CONSTRAINT "party_ledger_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_events" ADD CONSTRAINT "party_ledger_events_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_ledger_events" ADD CONSTRAINT "party_ledger_events_reverses_entry_id_party_ledger_events_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."party_ledger_events"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_ledger_events_customer_date_idx" ON "party_ledger_events" USING btree ("customer_id","entry_date","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_ledger_events_supplier_date_idx" ON "party_ledger_events" USING btree ("supplier_id","entry_date","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_ledger_events_reverses_entry_idx" ON "party_ledger_events" USING btree ("reverses_entry_id");
--> statement-breakpoint
INSERT INTO party_ledger_events (
  entry_date, voucher_no, invoice_no, customer_id, particulars, debit, credit,
  payment_mode, reference_type, reference_id, reference_no, status, salesperson_id,
  remarks, created_by, approved_by
)
SELECT s.sale_date, 'SLS-' || s.invoice_no, s.invoice_no, s.customer_id,
  'Sale ' || s.invoice_no, COALESCE(SUM(si.quantity * si.selling_price - si.discount), 0),
  CASE WHEN s.payment_mode = 'credit' THEN 0 ELSE COALESCE(SUM(si.quantity * si.selling_price - si.discount), 0) END,
  s.payment_mode, 'sale', s.id, s.reference_no, s.status::text, s.created_by, s.remarks, s.created_by, s.created_by
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
WHERE s.customer_id IS NOT NULL
GROUP BY s.id;
--> statement-breakpoint
INSERT INTO party_ledger_events (
  entry_date, voucher_no, purchase_no, supplier_id, particulars, debit, credit,
  payment_mode, reference_type, reference_id, reference_no, status, salesperson_id,
  remarks, created_by, approved_by
)
SELECT p.purchase_date, 'PUR-' || p.purchase_no, p.purchase_no, p.supplier_id,
  'Purchase ' || p.purchase_no,
  CASE WHEN p.payment_mode = 'credit' THEN 0 ELSE COALESCE(SUM(pi.quantity * pi.unit_cost - pi.discount), 0) END,
  COALESCE(SUM(pi.quantity * pi.unit_cost - pi.discount), 0),
  p.payment_mode, 'purchase', p.id, p.reference_no, p.status::text, p.created_by, p.remarks, p.created_by, p.created_by
FROM purchases p
JOIN purchase_items pi ON pi.purchase_id = p.id
GROUP BY p.id;
--> statement-breakpoint
INSERT INTO party_ledger_events (
  entry_date, voucher_no, customer_id, particulars, debit, credit, reference_type,
  reference_id, status, created_by, approved_by
)
SELECT le.entry_date, 'OPEN-' || c.code, le.customer_id, le.description,
  le.debit, le.credit, le.reference_type, le.reference_id, 'posted', le.created_by, le.created_by
FROM ledger_entries le
JOIN customers c ON c.id = le.customer_id
WHERE le.reference_type = 'opening_balance';
--> statement-breakpoint
INSERT INTO party_ledger_events (
  entry_date, voucher_no, supplier_id, particulars, debit, credit, reference_type,
  reference_id, status, created_by, approved_by
)
SELECT le.entry_date, 'OPEN-' || s.code, le.supplier_id, le.description,
  le.debit, le.credit, le.reference_type, le.reference_id, 'posted', le.created_by, le.created_by
FROM ledger_entries le
JOIN suppliers s ON s.id = le.supplier_id
WHERE le.reference_type = 'opening_balance';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_party_ledger_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Posted party ledger events are immutable; create a reversing entry instead.'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER party_ledger_events_prevent_update
BEFORE UPDATE ON party_ledger_events
FOR EACH ROW EXECUTE FUNCTION prevent_party_ledger_event_mutation();
--> statement-breakpoint
CREATE TRIGGER party_ledger_events_prevent_delete
BEFORE DELETE ON party_ledger_events
FOR EACH ROW EXECUTE FUNCTION prevent_party_ledger_event_mutation();
