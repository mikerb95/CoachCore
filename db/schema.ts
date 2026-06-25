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
