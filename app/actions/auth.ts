"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { headers } from "next/headers";
import { registerSchema, loginSchema } from "@/lib/validation";
import { PRIVACY_VERSION } from "@/lib/constants";
import { auth, signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { rateLimit } from "@/lib/rateLimit";

export type RegisterState = { error?: string; fieldErrors?: Record<string, string> };
export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Email o contraseña no válidos" };

  // Límite de intentos por IP + email para frenar fuerza bruta.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`login:${ip}:${parsed.data.email}`, 5, 5 * 60_000);
  if (!rl.success) {
    return { error: `Demasiados intentos. Inténtalo de nuevo en ${rl.retryAfter}s.` };
  }

  try {
    // En éxito, signIn lanza un redirect a "/" que el layout reparte por rol.
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" };
    }
    throw e; // re-lanza el NEXT_REDIRECT de éxito
  }
  return {};
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    consentHealthData: formData.get("consentHealthData") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Revisa los datos del formulario", fieldErrors };
  }

  const { name, email, password, role } = parsed.data;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    // No revelamos explícitamente que el email existe en el flujo público,
    // pero en registro es aceptable indicarlo para usabilidad.
    return { error: "Ese email ya está registrado", fieldErrors: { email: "Ya existe una cuenta" } };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role,
    consentHealthData: true,
    consentAt: new Date(),
    privacyVersion: PRIVACY_VERSION,
  });

  // Tras crear la cuenta, lo llevamos al login (sesión limpia).
  redirect("/login?registered=1");
}

/** Exporta todos los datos del usuario autenticado (derecho de acceso/portabilidad — Ley 1581 de 2012). */
export async function exportMyData(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const rows = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  const me = rows[0];
  if (!me) throw new Error("No encontrado");

  // Nunca exportamos el hash de la contraseña.
  const { passwordHash: _omit, ...safe } = me;
  void _omit;
  return JSON.stringify({ exportedAt: new Date().toISOString(), user: safe }, null, 2);
}

/** Elimina la cuenta del usuario y cierra sesión (derecho de supresión — Ley 1581 de 2012). */
export async function deleteMyAccount(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  await db.delete(users).where(eq(users.id, session.user.id));
  await signOut({ redirectTo: "/" });
}

/** Cierre de sesión simple para los botones de la app. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
