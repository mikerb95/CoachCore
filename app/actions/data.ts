"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auth } from "@/auth";
import { clients, checkins, measurements, messages, sessions, sessionSets } from "@/db/schema";
import type { Client, Message, Session, SessionSet } from "@/db/schema";

async function requireUser(role?: "entrenador" | "cliente") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (role && session.user.role !== role) throw new Error("No autorizado");
  return session.user;
}

/* ───────────────────────── Coach: roster ───────────────────────── */

// Roster de ejemplo para el modo demo (sin DATABASE_URL). Evita que la página
// /coach reviente al consultar la BD cuando solo está el login en memoria.
function demoRoster(trainerId: string): Client[] {
  const base = [
    { name: "Marcos Vidal", goal: "Hipertrofia", level: "Avanzado", age: 32, status: "Activo", injuries: "Sin lesiones activas. Molestia lumbar leve resuelta (mar. 2026)." },
    { name: "Laura Pérez", goal: "Pérdida de grasa", level: "Intermedio", age: 28, status: "Activo", injuries: "Sin lesiones registradas." },
    { name: "Diego Sánchez", goal: "Fuerza", level: "Avanzado", age: 35, status: "Descanso", injuries: "Hombro izq. — tendinitis manguito rotador (en seguimiento)." },
    { name: "Ana Torres", goal: "Hipertrofia", level: "Principiante", age: 24, status: "Activo", injuries: "Sin lesiones registradas." },
    { name: "Javier Ruiz", goal: "Rehabilitación", level: "Intermedio", age: 41, status: "Activo", injuries: "Rodilla der. — reconstrucción LCA (feb. 2026). Fase de fortalecimiento." },
    { name: "Sofía Gómez", goal: "Fuerza", level: "Avanzado", age: 29, status: "Activo", injuries: "Sin lesiones registradas." },
  ] as const;
  return base.map((c, i) => ({
    id: `demo-client-${i}`,
    trainerId,
    userId: null,
    name: c.name,
    goal: c.goal,
    level: c.level,
    age: c.age,
    status: c.status,
    injuries: c.injuries,
    createdAt: new Date(),
  }));
}

export async function listClients(): Promise<Client[]> {
  const user = await requireUser("entrenador");
  // Modo demo: sin BD devolvemos un roster de ejemplo en memoria.
  if (!process.env.DATABASE_URL) return demoRoster(user.id);
  return db.select().from(clients).where(eq(clients.trainerId, user.id)).orderBy(clients.name);
}

const GOALS = ["Hipertrofia", "Pérdida de grasa", "Fuerza", "Rehabilitación"] as const;

export type CreateClientState = { error?: string };

export async function createClient(_prev: CreateClientState, formData: FormData): Promise<CreateClientState> {
  const user = await requireUser("entrenador");
  const name = String(formData.get("name") ?? "").trim();
  const goal = String(formData.get("goal") ?? "Hipertrofia");
  const level = String(formData.get("level") ?? "Principiante").trim() || "Principiante";
  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = ageRaw ? Math.max(0, Math.min(120, parseInt(ageRaw, 10) || 0)) : null;

  if (name.length < 2) return { error: "El nombre es demasiado corto" };
  if (!GOALS.includes(goal as (typeof GOALS)[number])) return { error: "Objetivo no válido" };

  await db.insert(clients).values({
    trainerId: user.id,
    name,
    goal: goal as (typeof GOALS)[number],
    level,
    age,
  });
  revalidatePath("/coach");
  return {};
}

export async function deleteClient(id: string): Promise<void> {
  const user = await requireUser("entrenador");
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.trainerId, user.id)));
  revalidatePath("/coach");
}

/** Carga el roster de ejemplo del diseño para este entrenador (solo si está vacío). */
export async function seedDemoClients(): Promise<void> {
  const user = await requireUser("entrenador");
  const existing = await db.select({ id: clients.id }).from(clients).where(eq(clients.trainerId, user.id)).limit(1);
  if (existing.length > 0) return;

  await db.insert(clients).values([
    { trainerId: user.id, name: "Marcos Vidal", goal: "Hipertrofia", level: "Avanzado", age: 32, status: "Activo", injuries: "Sin lesiones activas. Molestia lumbar leve resuelta (mar. 2026)." },
    { trainerId: user.id, name: "Laura Pérez", goal: "Pérdida de grasa", level: "Intermedio", age: 28, status: "Activo", injuries: "Sin lesiones registradas." },
    { trainerId: user.id, name: "Diego Sánchez", goal: "Fuerza", level: "Avanzado", age: 35, status: "Descanso", injuries: "Hombro izq. — tendinitis manguito rotador (en seguimiento)." },
    { trainerId: user.id, name: "Ana Torres", goal: "Hipertrofia", level: "Principiante", age: 24, status: "Activo", injuries: "Sin lesiones registradas." },
    { trainerId: user.id, name: "Javier Ruiz", goal: "Rehabilitación", level: "Intermedio", age: 41, status: "Activo", injuries: "Rodilla der. — reconstrucción LCA (feb. 2026). Fase de fortalecimiento." },
    { trainerId: user.id, name: "Sofía Gómez", goal: "Fuerza", level: "Avanzado", age: 29, status: "Activo", injuries: "Sin lesiones registradas." },
  ]);
  revalidatePath("/coach");
}

/* ───────────────────────── Client: check-in ───────────────────────── */

export async function saveCheckin(input: {
  weightKg: number;
  sleepHours: number;
  energy: number;
  soreness: number;
}): Promise<void> {
  const user = await requireUser("cliente");
  await db.insert(checkins).values({
    userId: user.id,
    weightKg: input.weightKg,
    sleepHours: input.sleepHours,
    energy: input.energy,
    soreness: input.soreness,
  });
  // Registramos también el peso como medida para el histórico de progreso.
  await db.insert(measurements).values({
    userId: user.id,
    label: "Peso corporal",
    value: input.weightKg,
    unit: "kg",
  });
  revalidatePath("/cliente");
}

/* ───────────────────────── Coach: link client account ───────────────────────── */

/** Vincula la cuenta de usuario del cliente (userId) a su entrada en el roster. */
export async function linkClientUser(clientId: string, targetUserId: string): Promise<void> {
  const user = await requireUser("entrenador");
  await db
    .update(clients)
    .set({ userId: targetUserId })
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, user.id)));
  revalidatePath("/coach");
}

/* ───────────────────────── Sessions ───────────────────────── */

export async function startSession(input: {
  clientId: string;
  routineName?: string;
  coachNotes?: string;
}): Promise<string> {
  const user = await requireUser();
  const [row] = await db
    .insert(sessions)
    .values({
      trainerId: user.role === "entrenador" ? user.id : (await resolveTrainerId(user.id)),
      clientId: input.clientId,
      routineName: input.routineName ?? null,
      coachNotes: input.coachNotes ?? null,
      startedAt: new Date(),
    })
    .returning({ id: sessions.id });
  return row.id;
}

export async function completeSession(sessionId: string, durationMin: number): Promise<void> {
  await requireUser();
  await db
    .update(sessions)
    .set({ completedAt: new Date(), durationMin })
    .where(eq(sessions.id, sessionId));
  revalidatePath("/cliente");
  revalidatePath("/coach");
}

export async function saveSessionSets(
  sessionId: string,
  sets: { exerciseName: string; setNumber: number; weightKg?: number; reps?: number; durationSec?: number; rpe?: number }[],
): Promise<void> {
  await requireUser();
  if (sets.length === 0) return;
  await db.insert(sessionSets).values(
    sets.map((s) => ({ sessionId, ...s })),
  );
}

export async function listClientSessions(clientId: string): Promise<Session[]> {
  const user = await requireUser("entrenador");
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.clientId, clientId), eq(sessions.trainerId, user.id)))
    .orderBy(desc(sessions.startedAt))
    .limit(50);
}

export async function listMySessionSets(sessionId: string): Promise<SessionSet[]> {
  await requireUser();
  return db
    .select()
    .from(sessionSets)
    .where(eq(sessionSets.sessionId, sessionId))
    .orderBy(sessionSets.exerciseName, sessionSets.setNumber);
}

/** Resuelve el trainerId a partir del userId del cliente (busca en el roster). */
async function resolveTrainerId(userId: string): Promise<string> {
  const [row] = await db
    .select({ trainerId: clients.trainerId })
    .from(clients)
    .where(eq(clients.userId, userId))
    .limit(1);
  if (!row) throw new Error("Este usuario no está vinculado a ningún roster");
  return row.trainerId;
}

/* ───────────────────────── Chat ───────────────────────── */

export async function listMyMessages(): Promise<Message[]> {
  const user = await requireUser();
  return db.select().from(messages).where(eq(messages.userId, user.id)).orderBy(desc(messages.createdAt)).limit(100);
}

export async function sendMyMessage(text: string): Promise<void> {
  const user = await requireUser();
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  await db.insert(messages).values({
    userId: user.id,
    fromCoach: user.role === "entrenador",
    text: clean,
  });
  revalidatePath("/cliente");
}
