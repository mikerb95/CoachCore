CREATE TABLE "routines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "routine_exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "routine_id" uuid NOT NULL REFERENCES "routines"("id") ON DELETE CASCADE,
  "exercise_name" text NOT NULL,
  "set_count" integer DEFAULT 3 NOT NULL,
  "reps_target" integer,
  "duration_sec" integer,
  "weight_kg" real,
  "rpe_target" integer,
  "rest_sec" integer DEFAULT 120,
  "order_index" integer NOT NULL,
  "notes" text
);

ALTER TABLE "sessions" ADD COLUMN "routine_id" uuid REFERENCES "routines"("id") ON DELETE SET NULL;

CREATE INDEX "routines_trainer_idx" ON "routines" ("trainer_id");
CREATE INDEX "routines_client_idx" ON "routines" ("client_id");
CREATE INDEX "routine_exercises_routine_idx" ON "routine_exercises" ("routine_id");
