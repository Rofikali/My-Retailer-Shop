ALTER TABLE "suppliers" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "pin_code" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "credit_limit" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "supplier_type" text DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "rating" numeric(3, 1);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "remarks" text;