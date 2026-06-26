CREATE TYPE "public"."client_status" AS ENUM('Activo', 'Descanso');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('Hipertrofia', 'Pérdida de grasa', 'Fuerza', 'Rehabilitación');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('entrenador', 'cliente');--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weight_kg" real,
	"sleep_hours" real,
	"energy" integer,
	"soreness" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"goal" "goal" DEFAULT 'Hipertrofia' NOT NULL,
	"level" text DEFAULT 'Principiante' NOT NULL,
	"age" integer,
	"status" "client_status" DEFAULT 'Activo' NOT NULL,
	"injuries" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" real NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_coach" boolean DEFAULT false NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_name" text NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" real,
	"reps" integer,
	"duration_sec" integer,
	"rpe" integer,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"routine_name" text,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_min" integer,
	"coach_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'cliente' NOT NULL,
	"consent_health_data" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"privacy_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkins_user_idx" ON "checkins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_trainer_idx" ON "clients" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "clients_user_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "measurements_user_idx" ON "measurements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_user_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prt_token_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "session_sets_session_idx" ON "session_sets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_trainer_idx" ON "sessions" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "sessions_client_idx" ON "sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "sessions_scheduled_idx" ON "sessions" USING btree ("scheduled_at");