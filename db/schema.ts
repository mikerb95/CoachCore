import { pgTable, text, timestamp, uuid, pgEnum, boolean, integer, real, index } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["entrenador", "cliente"]);

/**
 * Users table. We own this directly (Credentials provider + JWT sessions),
 * so it also stores the RGPD consent trail required for handling health data.
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  // bcrypt hash — never the plaintext password
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("cliente"),

  // ── RGPD / consent trail ────────────────────────────────────────────
  // Consentimiento explícito para tratar datos de salud (categoría especial).
  consentHealthData: boolean("consent_health_data").notNull().default(false),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  privacyVersion: text("privacy_version"), // versión de la política aceptada

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const goalEnum = pgEnum("goal", [
  "Hipertrofia",
  "Pérdida de grasa",
  "Fuerza",
  "Rehabilitación",
]);

export const clientStatusEnum = pgEnum("client_status", ["Activo", "Descanso"]);

/** Roster del entrenador. Cada cliente pertenece a un entrenador (trainerId). */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Cuenta de usuario del cliente (null hasta que el cliente se registra y el coach vincula la cuenta).
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    goal: goalEnum("goal").notNull().default("Hipertrofia"),
    level: text("level").notNull().default("Principiante"),
    age: integer("age"),
    status: clientStatusEnum("status").notNull().default("Activo"),
    injuries: text("injuries").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("clients_trainer_idx").on(t.trainerId),
    index("clients_user_idx").on(t.userId),
  ],
);

/** Check-ins diarios que envía el cliente (datos de salud). */
export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weightKg: real("weight_kg"),
    sleepHours: real("sleep_hours"),
    energy: integer("energy"), // 1–5
    soreness: integer("soreness"), // 0–3
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("checkins_user_idx").on(t.userId)],
);

/** Medidas corporales del cliente. */
export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // p.ej. "Cintura", "% Grasa"
    value: real("value").notNull(),
    unit: text("unit").notNull().default("kg"),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("measurements_user_idx").on(t.userId)],
);

/** Mensajes cliente ⇄ entrenador. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromCoach: boolean("from_coach").notNull().default(false),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_user_idx").on(t.userId)],
);

/** Sesiones de entrenamiento (programadas o completadas). */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    // Nombre del entreno (ej. "Fuerza · Día A"). Libre, sin FK a routines aún.
    routineName: text("routine_name"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMin: integer("duration_min"),
    coachNotes: text("coach_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sessions_trainer_idx").on(t.trainerId),
    index("sessions_client_idx").on(t.clientId),
    index("sessions_scheduled_idx").on(t.scheduledAt),
  ],
);

/** Series registradas dentro de una sesión. */
export const sessionSets = pgTable(
  "session_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseName: text("exercise_name").notNull(),
    setNumber: integer("set_number").notNull(),
    weightKg: real("weight_kg"),
    reps: integer("reps"),
    durationSec: integer("duration_sec"), // para ejercicios isométricos (planchas, etc.)
    rpe: integer("rpe"), // 6–10
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("session_sets_session_idx").on(t.sessionId)],
);

/** Tokens de recuperación de contraseña (se guarda solo el hash). */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prt_token_idx").on(t.tokenHash)],
);

export type Client = typeof clients.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionSet = typeof sessionSets.$inferSelect;
export type NewSessionSet = typeof sessionSets.$inferInsert;
