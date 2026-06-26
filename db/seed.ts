/**
 * Seed de demo: crea un entrenador y un cliente vinculados entre sí.
 *
 * Uso:
 *   npx tsx db/seed.ts
 *
 * Credenciales resultantes:
 *   Entrenador → coach@demo.com  / Demo1234!
 *   Cliente    → client@demo.com / Demo1234!
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌  DATABASE_URL no está configurada");
  process.exit(1);
}

const db = drizzle(neon(url), { schema });

async function main() {
  console.log("🌱  Iniciando seed…");

  // ── 1. Usuarios ──────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("Demo1234!", 12);
  const now = new Date();

  const [coach] = await db
    .insert(schema.users)
    .values({
      name: "Camilo Llano",
      email: "coach@demo.com",
      phone: "3001112233",
      coachCode: "AA",
      passwordHash: hash,
      role: "entrenador",
      consentHealthData: true,
      consentAt: now,
      privacyVersion: "1.0",
    })
    .onConflictDoNothing()
    .returning({ id: schema.users.id, email: schema.users.email });

  const [clientUser] = await db
    .insert(schema.users)
    .values({
      name: "Andrés Martínez",
      email: "client@demo.com",
      phone: "3004445566",
      passwordHash: hash,
      role: "cliente",
      consentHealthData: true,
      consentAt: now,
      privacyVersion: "1.0",
    })
    .onConflictDoNothing()
    .returning({ id: schema.users.id, email: schema.users.email });

  if (!coach || !clientUser) {
    console.log("ℹ️   Los usuarios ya existían — sin cambios en usuarios.");
  } else {
    console.log(`✅  Coach:   ${coach.email}  (${coach.id})`);
    console.log(`✅  Cliente: ${clientUser.email}  (${clientUser.id})`);
  }

  // Recupera los IDs aunque ya existieran (onConflictDoNothing no devuelve filas existentes).
  const [coachRow] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, "coach@demo.com"))
    .limit(1);

  const [clientRow] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, "client@demo.com"))
    .limit(1);

  if (!coachRow || !clientRow) {
    console.error("❌  No se encontraron los usuarios tras insertarlos.");
    process.exit(1);
  }

  // ── 2. Roster del entrenador ──────────────────────────────────────────────
  const demoClients = [
    { name: "Andrés Martínez",       goal: "Hipertrofia"      as const, level: "Avanzado",     age: 32, status: "Activo"   as const, injuries: "Sin lesiones activas. Molestia lumbar leve resuelta (mar. 2026).", userId: clientRow.id, code: "AA0001", seq: 1 },
    { name: "Valentina López",        goal: "Pérdida de grasa" as const, level: "Intermedio",   age: 28, status: "Activo"   as const, injuries: "Sin lesiones registradas.", userId: null, code: "AA0002", seq: 2 },
    { name: "Sebastián Gómez",        goal: "Fuerza"           as const, level: "Avanzado",     age: 35, status: "Descanso" as const, injuries: "Hombro izq. — tendinitis manguito rotador (en seguimiento).", userId: null, code: "AA0003", seq: 3 },
    { name: "Camila Rodríguez",       goal: "Hipertrofia"      as const, level: "Principiante", age: 24, status: "Activo"   as const, injuries: "Sin lesiones registradas.", userId: null, code: "AA0004", seq: 4 },
    { name: "Carlos Herrera",         goal: "Rehabilitación"   as const, level: "Intermedio",   age: 41, status: "Activo"   as const, injuries: "Rodilla der. — reconstrucción LCA (feb. 2026). Fase de fortalecimiento.", userId: null, code: "AA0005", seq: 5 },
    { name: "María Fernanda Ospina",  goal: "Fuerza"           as const, level: "Avanzado",     age: 29, status: "Activo"   as const, injuries: "Sin lesiones registradas.", userId: null, code: "AA0006", seq: 6 },
  ];

  const insertedClients = await db
    .insert(schema.clients)
    .values(demoClients.map((c) => ({ ...c, trainerId: coachRow.id })))
    .onConflictDoNothing()
    .returning({ id: schema.clients.id, name: schema.clients.name });

  if (insertedClients.length === 0) {
    console.log("ℹ️   El roster ya existía — sin cambios en clientes.");
  } else {
    console.log(`✅  Roster: ${insertedClients.map((c) => c.name).join(", ")}`);
  }

  // ── 3. Check-ins de demo para Andrés Martínez ────────────────────────────
  const marcosClientRow = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(and(
      eq(schema.clients.trainerId, coachRow.id),
      eq(schema.clients.userId, clientRow.id),
    ))
    .limit(1);

  if (marcosClientRow.length > 0) {
    const existing = await db
      .select({ id: schema.checkins.id })
      .from(schema.checkins)
      .where(eq(schema.checkins.userId, clientRow.id))
      .limit(1);

    if (existing.length === 0) {
      const baseDate = new Date();
      await db.insert(schema.checkins).values(
        Array.from({ length: 7 }, (_, i) => {
          const d = new Date(baseDate);
          d.setDate(d.getDate() - (6 - i));
          return {
            userId: clientRow.id,
            weightKg: 82 - i * 0.5,
            sleepHours: 7 + (i % 3) * 0.5,
            energy: 3 + (i % 3),
            soreness: i % 2,
            createdAt: d,
          };
        }),
      );
      console.log("✅  Check-ins de demo insertados (7 días).");
    } else {
      console.log("ℹ️   Check-ins ya existían — sin cambios.");
    }
  }

  // ── 4. Sesión de demo completada ─────────────────────────────────────────
  if (marcosClientRow.length > 0) {
    const marcosId = marcosClientRow[0]!.id;
    const existingSession = await db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(eq(schema.sessions.clientId, marcosId))
      .limit(1);

    if (existingSession.length === 0) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - 1);

      const [sess] = await db
        .insert(schema.sessions)
        .values({
          trainerId: coachRow.id,
          clientId: marcosId,
          routineName: "Fuerza · Día A",
          coachNotes: "Cuida la postura lumbar. Si la 1ª serie sale fácil, sube 2.5 kg.",
          startedAt: sessionDate,
          completedAt: sessionDate,
          durationMin: 62,
        })
        .returning({ id: schema.sessions.id });

      if (sess) {
        await db.insert(schema.sessionSets).values([
          { sessionId: sess.id, exerciseName: "Sentadilla trasera", setNumber: 1, weightKg: 102.5, reps: 5, rpe: 8 },
          { sessionId: sess.id, exerciseName: "Sentadilla trasera", setNumber: 2, weightKg: 102.5, reps: 5, rpe: 8 },
          { sessionId: sess.id, exerciseName: "Sentadilla trasera", setNumber: 3, weightKg: 102.5, reps: 4, rpe: 9 },
          { sessionId: sess.id, exerciseName: "Press de banca",    setNumber: 1, weightKg: 92.5,  reps: 5, rpe: 8 },
          { sessionId: sess.id, exerciseName: "Press de banca",    setNumber: 2, weightKg: 92.5,  reps: 5, rpe: 8 },
          { sessionId: sess.id, exerciseName: "Remo con barra",    setNumber: 1, weightKg: 72.5,  reps: 8, rpe: 8 },
          { sessionId: sess.id, exerciseName: "Remo con barra",    setNumber: 2, weightKg: 72.5,  reps: 8, rpe: 8 },
        ]);
        console.log("✅  Sesión de demo + sets insertados.");
      }
    } else {
      console.log("ℹ️   Sesión de demo ya existía — sin cambios.");
    }
  }

  console.log("\n🎉  Seed completado.");
  console.log("     Entrenador → coach@demo.com  / Demo1234!");
  console.log("     Cliente    → client@demo.com / Demo1234!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
