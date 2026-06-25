"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auth } from "@/auth";
import { clients, checkins, measurements, messages } from "@/db/schema";
import type { Client, Message } from "@/db/schema";

async function requireUser(role?: "entrenador" | "cliente") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (role && session.user.role !== role) throw new Error("No autorizado");
  return session.user;
}

/* ───────────────────────── Coach: roster ───────────────────────── */

export async function listClients(): Promise<Client[]> {
  const user = await requireUser("entrenador");
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
