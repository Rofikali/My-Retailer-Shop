DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reverses_entry_id_ledger_entries_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_customer_date_idx" ON "ledger_entries" USING btree ("customer_id","entry_date","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_supplier_date_idx" ON "ledger_entries" USING btree ("supplier_id","entry_date","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_reverses_entry_idx" ON "ledger_entries" USING btree ("reverses_entry_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_ledger_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Posted ledger entries are immutable; create a reversing entry instead.'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ledger_entries_prevent_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entry_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_entries_prevent_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entry_mutation();
