"use server";

import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auth } from "@/auth";
import { users, clients, checkins, measurements, messages, sessions, sessionSets, routines, routineExercises } from "@/db/schema";
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
    { name: "Andrés Martínez", goal: "Hipertrofia", level: "Avanzado", age: 32, status: "Activo", injuries: "Sin lesiones activas. Molestia lumbar leve resuelta (mar. 2026)." },
    { name: "Valentina López", goal: "Pérdida de grasa", level: "Intermedio", age: 28, status: "Activo", injuries: "Sin lesiones registradas." },
    { name: "Sebastián Gómez", goal: "Fuerza", level: "Avanzado", age: 35, status: "Descanso", injuries: "Hombro izq. — tendinitis manguito rotador (en seguimiento)." },
    { name: "Camila Rodríguez", goal: "Hipertrofia", level: "Principiante", age: 24, status: "Activo", injuries: "Sin lesiones registradas." },
    { name: "Carlos Herrera", goal: "Rehabilitación", level: "Intermedio", age: 41, status: "Activo", injuries: "Rodilla der. — reconstrucción LCA (feb. 2026). Fase de fortalecimiento." },
    { name: "María Fernanda Ospina", goal: "Fuerza", level: "Avanzado", age: 29, status: "Activo", injuries: "Sin lesiones registradas." },
  ] as const;
  return base.map((c, i) => ({
    id: `demo-client-${i}`,
    trainerId,
    userId: null,
    code: `AA${String(i + 1).padStart(4, "0")}`,
    seq: i + 1,
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

/* ── ID público del cliente: 2 letras (entrenador) + 4 dígitos (consecutivo) ── */

// 0 → "AA", 25 → "AZ", 26 → "BA", … 675 → "ZZ".
function codeFromIndex(i: number): string {
  return String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
}
function indexFromCode(code: string): number {
  return (code.charCodeAt(0) - 65) * 26 + (code.charCodeAt(1) - 65);
}

/** Devuelve el código de 2 letras del entrenador, asignando el siguiente libre si aún no tiene. */
async function getOrAssignCoachCode(trainerId: string): Promise<string> {
  const [me] = await db.select({ coachCode: users.coachCode }).from(users).where(eq(users.id, trainerId)).limit(1);
  if (me?.coachCode) return me.coachCode;

  const taken = await db.select({ coachCode: users.coachCode }).from(users).where(isNotNull(users.coachCode));
  const maxIdx = taken.reduce((m, r) => Math.max(m, indexFromCode(r.coachCode!)), -1);
  const next = maxIdx + 1;
  if (next > 675) throw new Error("Se agotaron los códigos de entrenador (ZZ)");

  const code = codeFromIndex(next);
  await db.update(users).set({ coachCode: code }).where(eq(users.id, trainerId));
  return code;
}

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

  // Genera el ID público: prefijo del entrenador + consecutivo del cliente.
  const coachCode = await getOrAssignCoachCode(user.id);
  const [{ maxSeq }] = await db
    .select({ maxSeq: sql<number>`coalesce(max(${clients.seq}), 0)` })
    .from(clients)
    .where(eq(clients.trainerId, user.id));
  const seq = Number(maxSeq) + 1;
  if (seq > 9999) return { error: "Has alcanzado el máximo de clientes (9999)" };
  const code = `${coachCode}${String(seq).padStart(4, "0")}`;

  await db.insert(clients).values({
    trainerId: user.id,
    name,
    goal: goal as (typeof GOALS)[number],
    level,
    age,
    code,
    seq,
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
    { trainerId: user.id, name: "Andrés Martínez", goal: "Hipertrofia", level: "Avanzado", age: 32, status: "Activo", injuries: "Sin lesiones activas. Molestia lumbar leve resuelta (mar. 2026)." },
    { trainerId: user.id, name: "Valentina López", goal: "Pérdida de grasa", level: "Intermedio", age: 28, status: "Activo", injuries: "Sin lesiones registradas." },
    { trainerId: user.id, name: "Sebastián Gómez", goal: "Fuerza", level: "Avanzado", age: 35, status: "Descanso", injuries: "Hombro izq. — tendinitis manguito rotador (en seguimiento)." },
    { trainerId: user.id, name: "Camila Rodríguez", goal: "Hipertrofia", level: "Principiante", age: 24, status: "Activo", injuries: "Sin lesiones registradas." },
    { trainerId: user.id, name: "Carlos Herrera", goal: "Rehabilitación", level: "Intermedio", age: 41, status: "Activo", injuries: "Rodilla der. — reconstrucción LCA (feb. 2026). Fase de fortalecimiento." },
    { trainerId: user.id, name: "María Fernanda Ospina", goal: "Fuerza", level: "Avanzado", age: 29, status: "Activo", injuries: "Sin lesiones registradas." },
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
  routineId?: string;
  routineName?: string;
  coachNotes?: string;
}): Promise<string> {
  const user = await requireUser();
  const [row] = await db
    .insert(sessions)
    .values({
      trainerId: user.role === "entrenador" ? user.id : (await resolveTrainerId(user.id)),
      clientId: input.clientId,
      routineId: input.routineId ?? null,
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

/* ───────────────────────── Rutinas ───────────────────────── */

export type RoutineSummary = {
  id: string;
  name: string;
  description: string | null;
  clientId: string | null;
  exerciseCount: number;
  createdAt: Date;
};

export type RoutineExerciseData = {
  id: string;
  exerciseName: string;
  setCount: number;
  repsTarget: number | null;
  durationSec: number | null;
  weightKg: number | null;
  rpeTarget: number | null;
  restSec: number | null;
  orderIndex: number;
  notes: string | null;
};

export type RoutineWithExercises = {
  id: string;
  name: string;
  description: string | null;
  clientId: string | null;
  exercises: RoutineExerciseData[];
};

/** Crea una rutina nueva y devuelve su ID. */
export async function createRoutine(input: {
  name: string;
  description?: string;
  clientId?: string;
}): Promise<string> {
  const user = await requireUser("entrenador");
  if (!process.env.DATABASE_URL) throw new Error("Base de datos no configurada");
  const [row] = await db
    .insert(routines)
    .values({
      trainerId: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      clientId: input.clientId || null,
    })
    .returning({ id: routines.id });
  revalidatePath("/coach");
  revalidatePath("/cliente");
  return row.id;
}

/** Reemplaza todos los ejercicios de una rutina (delete + insert). */
export async function saveRoutineExercises(
  routineId: string,
  exercises: {
    exerciseName: string;
    setCount: number;
    repsTarget?: number;
    durationSec?: number;
    weightKg?: number;
    rpeTarget?: number;
    restSec?: number;
    orderIndex: number;
    notes?: string;
  }[],
): Promise<void> {
  const user = await requireUser("entrenador");
  const [routine] = await db
    .select({ trainerId: routines.trainerId })
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.trainerId, user.id)))
    .limit(1);
  if (!routine) throw new Error("No autorizado");

  await db.delete(routineExercises).where(eq(routineExercises.routineId, routineId));
  if (exercises.length > 0) {
    await db.insert(routineExercises).values(
      exercises.map((e) => ({
        routineId,
        exerciseName: e.exerciseName,
        setCount: e.setCount,
        repsTarget: e.repsTarget ?? null,
        durationSec: e.durationSec ?? null,
        weightKg: e.weightKg ?? null,
        rpeTarget: e.rpeTarget ?? null,
        restSec: e.restSec ?? 120,
        orderIndex: e.orderIndex,
        notes: e.notes ?? null,
      })),
    );
  }
  revalidatePath("/coach");
  revalidatePath("/cliente");
}

/** Rutinas del entrenador logueado (con conteo de ejercicios). */
export async function listMyRoutines(): Promise<RoutineSummary[]> {
  const user = await requireUser("entrenador");
  if (!process.env.DATABASE_URL) return [];
  const rows = await db
    .select({
      id: routines.id,
      name: routines.name,
      description: routines.description,
      clientId: routines.clientId,
      createdAt: routines.createdAt,
      exerciseCount: sql<number>`cast(count(${routineExercises.id}) as int)`,
    })
    .from(routines)
    .leftJoin(routineExercises, eq(routineExercises.routineId, routines.id))
    .where(eq(routines.trainerId, user.id))
    .groupBy(routines.id)
    .orderBy(desc(routines.createdAt));
  return rows;
}

/** Rutinas asignadas a un cliente específico (llamado por el coach). */
export async function listClientRoutines(clientId: string): Promise<RoutineSummary[]> {
  await requireUser("entrenador");
  if (!process.env.DATABASE_URL) return [];
  const rows = await db
    .select({
      id: routines.id,
      name: routines.name,
      description: routines.description,
      clientId: routines.clientId,
      createdAt: routines.createdAt,
      exerciseCount: sql<number>`cast(count(${routineExercises.id}) as int)`,
    })
    .from(routines)
    .leftJoin(routineExercises, eq(routineExercises.routineId, routines.id))
    .where(eq(routines.clientId, clientId))
    .groupBy(routines.id)
    .orderBy(routines.name);
  return rows;
}

/** Rutinas asignadas al cliente logueado (llamado desde ClientApp). */
export async function listMyAssignedRoutines(): Promise<RoutineSummary[]> {
  const user = await requireUser("cliente");
  if (!process.env.DATABASE_URL) return [];
  const [clientRow] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.userId, user.id))
    .limit(1);
  if (!clientRow) return [];

  const rows = await db
    .select({
      id: routines.id,
      name: routines.name,
      description: routines.description,
      clientId: routines.clientId,
      createdAt: routines.createdAt,
      exerciseCount: sql<number>`cast(count(${routineExercises.id}) as int)`,
    })
    .from(routines)
    .leftJoin(routineExercises, eq(routineExercises.routineId, routines.id))
    .where(eq(routines.clientId, clientRow.id))
    .groupBy(routines.id)
    .orderBy(routines.name);
  return rows;
}

/** Rutina con todos sus ejercicios ordenados. */
export async function getRoutineWithExercises(routineId: string): Promise<RoutineWithExercises | null> {
  await requireUser();
  if (!process.env.DATABASE_URL) return null;
  const [routine] = await db.select().from(routines).where(eq(routines.id, routineId)).limit(1);
  if (!routine) return null;

  const exs = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId))
    .orderBy(routineExercises.orderIndex);

  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    clientId: routine.clientId,
    exercises: exs.map((e) => ({
      id: e.id,
      exerciseName: e.exerciseName,
      setCount: e.setCount,
      repsTarget: e.repsTarget,
      durationSec: e.durationSec,
      weightKg: e.weightKg,
      rpeTarget: e.rpeTarget,
      restSec: e.restSec,
      orderIndex: e.orderIndex,
      notes: e.notes,
    })),
  };
}

/** Elimina una rutina (los ejercicios se borran en cascada). */
export async function deleteRoutine(routineId: string): Promise<void> {
  const user = await requireUser("entrenador");
  await db.delete(routines).where(and(eq(routines.id, routineId), eq(routines.trainerId, user.id)));
  revalidatePath("/coach");
  revalidatePath("/cliente");
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
