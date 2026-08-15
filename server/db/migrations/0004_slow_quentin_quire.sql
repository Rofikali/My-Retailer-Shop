ALTER TABLE "expenses" ADD COLUMN "tax" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "reference_no" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "status" text DEFAULT 'posted' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "remarks" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
