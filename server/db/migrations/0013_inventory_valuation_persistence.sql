CREATE TABLE IF NOT EXISTS "inventory_valuation_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inventory_movement_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "warehouse" text NOT NULL,
  "event_type" "movement_type" NOT NULL,
  "quantity_delta" numeric(10, 2) NOT NULL,
  "value_delta" numeric(20, 2) NOT NULL,
  "quantity_after" numeric(20, 2) NOT NULL,
  "carrying_value_after" numeric(20, 2) NOT NULL,
  "costing_method_version" text DEFAULT 'mwac-v1' NOT NULL,
  "reference_type" text,
  "reference_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_valuation_events_snapshot_non_negative"
    CHECK ("quantity_after" >= 0 AND "carrying_value_after" >= 0),
  CONSTRAINT "inventory_valuation_events_movement_unique" UNIQUE ("inventory_movement_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_valuation_events"
    ADD CONSTRAINT "inventory_valuation_events_inventory_movement_id_inventory_movements_id_fk"
    FOREIGN KEY ("inventory_movement_id") REFERENCES "public"."inventory_movements"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_valuation_events"
    ADD CONSTRAINT "inventory_valuation_events_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_valuation_events"
    ADD CONSTRAINT "inventory_valuation_events_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_valuation_events_product_warehouse_created_idx"
  ON "inventory_valuation_events" USING btree ("product_id", "warehouse", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_valuation_events_reference_idx"
  ON "inventory_valuation_events" USING btree ("reference_type", "reference_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_valuation_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "warehouse" text NOT NULL,
  "quantity" numeric(20, 2) DEFAULT '0' NOT NULL,
  "carrying_value" numeric(20, 2) DEFAULT '0' NOT NULL,
  "valuation_status" text DEFAULT 'uninitialized' NOT NULL,
  "last_event_id" uuid,
  "version" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_valuation_balances_product_warehouse_unique"
    UNIQUE ("product_id", "warehouse"),
  CONSTRAINT "inventory_valuation_balances_valid_state" CHECK (
    (
      "valuation_status" = 'uninitialized'
      AND "carrying_value" = 0
      AND "last_event_id" IS NULL
    ) OR (
      "valuation_status" = 'active'
      AND "quantity" >= 0
      AND "carrying_value" >= 0
      AND ("quantity" <> 0 OR "carrying_value" = 0)
    )
  ),
  CONSTRAINT "inventory_valuation_balances_version_non_negative" CHECK ("version" >= 0)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_valuation_balances"
    ADD CONSTRAINT "inventory_valuation_balances_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_valuation_balances"
    ADD CONSTRAINT "inventory_valuation_balances_last_event_id_inventory_valuation_events_id_fk"
    FOREIGN KEY ("last_event_id") REFERENCES "public"."inventory_valuation_events"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_valuation_balances_status_idx"
  ON "inventory_valuation_balances" USING btree ("valuation_status");
--> statement-breakpoint
-- Preserve legacy quantities exactly, but never invent a carrying value.
-- Negative legacy stock is retained as uninitialized for owner reconciliation.
INSERT INTO "inventory_valuation_balances" (
  "product_id", "warehouse", "quantity", "carrying_value", "valuation_status", "version"
)
SELECT
  "product_id", "warehouse", SUM("quantity"), 0, 'uninitialized', 0
FROM "inventory_movements"
GROUP BY "product_id", "warehouse"
ON CONFLICT ("product_id", "warehouse") DO NOTHING;
--> statement-breakpoint
-- Products with no movement history may safely begin at active zero in the
-- configured default warehouse; this is not a historical opening valuation.
INSERT INTO "inventory_valuation_balances" (
  "product_id", "warehouse", "quantity", "carrying_value", "valuation_status", "version"
)
SELECT
  p."id",
  COALESCE(NULLIF((SELECT bp."default_warehouse" FROM "business_profile" bp LIMIT 1), ''), 'Main'),
  0, 0, 'active', 0
FROM "products" p
WHERE NOT EXISTS (
  SELECT 1 FROM "inventory_movements" im WHERE im."product_id" = p."id"
)
ON CONFLICT ("product_id", "warehouse") DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_inventory_valuation_event_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  source_movement "inventory_movements"%ROWTYPE;
BEGIN
  SELECT * INTO source_movement
  FROM "inventory_movements"
  WHERE "id" = NEW."inventory_movement_id"
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory valuation event requires an existing stock movement.'
      USING ERRCODE = '23503';
  END IF;

  IF NEW."product_id" IS DISTINCT FROM source_movement."product_id"
    OR NEW."warehouse" IS DISTINCT FROM source_movement."warehouse"
    OR NEW."event_type" IS DISTINCT FROM source_movement."type"
    OR NEW."quantity_delta" IS DISTINCT FROM source_movement."quantity"
    OR NEW."reference_type" IS DISTINCT FROM source_movement."reference_type"
    OR NEW."reference_id" IS DISTINCT FROM source_movement."reference_id"
  THEN
    RAISE EXCEPTION 'Inventory valuation event source fields must match its inventory movement.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS inventory_valuation_events_validate_source ON "inventory_valuation_events";
--> statement-breakpoint
CREATE TRIGGER inventory_valuation_events_validate_source
BEFORE INSERT ON "inventory_valuation_events"
FOR EACH ROW EXECUTE FUNCTION validate_inventory_valuation_event_source();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_inventory_valuation_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Inventory valuation events are immutable; create a compensating event instead.'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS inventory_valuation_events_prevent_update ON "inventory_valuation_events";
--> statement-breakpoint
CREATE TRIGGER inventory_valuation_events_prevent_update
BEFORE UPDATE ON "inventory_valuation_events"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_valuation_event_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS inventory_valuation_events_prevent_delete ON "inventory_valuation_events";
--> statement-breakpoint
CREATE TRIGGER inventory_valuation_events_prevent_delete
BEFORE DELETE ON "inventory_valuation_events"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_valuation_event_mutation();

--> statement-breakpoint
-- Once a movement has a valuation event, preserve the source fact as well.
-- Legacy movements without valuation events retain their existing behavior.
CREATE OR REPLACE FUNCTION prevent_valued_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "inventory_valuation_events"
    WHERE "inventory_movement_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION 'An inventory movement linked to a valuation event is immutable.'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS inventory_movements_prevent_valued_update ON "inventory_movements";
--> statement-breakpoint
CREATE TRIGGER inventory_movements_prevent_valued_update
BEFORE UPDATE ON "inventory_movements"
FOR EACH ROW EXECUTE FUNCTION prevent_valued_inventory_movement_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS inventory_movements_prevent_valued_delete ON "inventory_movements";
--> statement-breakpoint
CREATE TRIGGER inventory_movements_prevent_valued_delete
BEFORE DELETE ON "inventory_movements"
FOR EACH ROW EXECUTE FUNCTION prevent_valued_inventory_movement_mutation();

--> statement-breakpoint
-- Keep the balance projection anchored to the event it claims is its latest fact.
CREATE OR REPLACE FUNCTION validate_inventory_valuation_balance_last_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  last_event "inventory_valuation_events"%ROWTYPE;
BEGIN
  IF NEW."last_event_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO last_event
  FROM "inventory_valuation_events"
  WHERE "id" = NEW."last_event_id"
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory valuation balance references a missing valuation event.'
      USING ERRCODE = '23503';
  END IF;

  IF last_event."product_id" IS DISTINCT FROM NEW."product_id"
    OR last_event."warehouse" IS DISTINCT FROM NEW."warehouse"
    OR last_event."quantity_after" IS DISTINCT FROM NEW."quantity"
    OR last_event."carrying_value_after" IS DISTINCT FROM NEW."carrying_value"
  THEN
    RAISE EXCEPTION 'Inventory valuation balance must match its latest valuation event.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS inventory_valuation_balances_validate_last_event ON "inventory_valuation_balances";
--> statement-breakpoint
CREATE TRIGGER inventory_valuation_balances_validate_last_event
BEFORE INSERT OR UPDATE ON "inventory_valuation_balances"
FOR EACH ROW EXECUTE FUNCTION validate_inventory_valuation_balance_last_event();
