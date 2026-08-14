ALTER TABLE "inventory_movements" ADD COLUMN "warehouse" text DEFAULT 'Main' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "remarks" text;