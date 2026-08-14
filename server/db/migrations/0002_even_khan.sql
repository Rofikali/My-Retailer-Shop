ALTER TABLE "purchase_items" ADD COLUMN "discount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "warehouse" text DEFAULT 'Main' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "reference_no" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "remarks" text;