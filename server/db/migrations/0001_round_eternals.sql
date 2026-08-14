ALTER TABLE "sale_items" ADD COLUMN "discount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "reference_no" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "remarks" text;