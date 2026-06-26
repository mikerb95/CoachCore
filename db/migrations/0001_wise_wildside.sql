ALTER TABLE "clients" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "seq" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coach_code" text;--> statement-breakpoint
CREATE INDEX "clients_code_idx" ON "clients" USING btree ("code");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_coach_code_unique" UNIQUE("coach_code");