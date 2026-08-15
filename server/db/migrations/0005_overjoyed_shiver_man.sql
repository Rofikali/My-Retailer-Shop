ALTER TABLE "customers" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "pin_code" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
