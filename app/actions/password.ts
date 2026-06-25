"use server";

import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
}

function baseUrl(): string {
  return (
    process.env.AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

export type ResetRequestState = { ok?: boolean; error?: string };

/** Paso 1: solicitar el enlace de recuperación. No revela si el email existe. */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Email no válido" };
  const email = parsed.data;

  const ip = await clientIp();
  const rl = rateLimit(`reset:${ip}`, 3, 15 * 60_000);
  if (!rl.success) return { error: `Demasiados intentos. Prueba en ${rl.retryAfter}s.` };

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 60 * 60_000), // 1 hora
    });
    const link = `${baseUrl()}/restablecer?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Restablece tu contraseña · CoachCore",
      html: `<p>Has solicitado restablecer tu contraseña.</p>
             <p><a href="${link}">Crear una nueva contraseña</a> (caduca en 1 hora).</p>
             <p>Si no fuiste tú, ignora este mensaje.</p>`,
    });
  }

  // Respuesta idéntica exista o no el usuario (anti-enumeración).
  return { ok: true };
}

export type ResetState = { error?: string; fieldErrors?: Record<string, string> };

/** Paso 2: fijar la nueva contraseña con un token válido. */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const pw = passwordSchema.safeParse(formData.get("password"));
  if (!token) return { error: "Enlace no válido" };
  if (!pw.success) return { fieldErrors: { password: pw.error.issues[0].message } };

  const tokenHash = sha256(token);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const record = rows[0];
  if (!record) return { error: "El enlace ha caducado o no es válido. Solicita uno nuevo." };

  const passwordHash = await bcrypt.hash(pw.data, 12);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, record.id));

  return {};
}
