import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Email no válido").max(254);

// Móvil: normalizamos quitando espacios, guiones y paréntesis; admitimos un "+"
// inicial opcional (prefijo internacional). El resultado es el identificador de login.
export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(/^\+?\d{7,15}$/, "Número de móvil no válido"));

// Política de contraseñas: mínimo 10, mezcla básica. Se valida en cliente y servidor.
export const passwordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(200, "Demasiado larga")
  .regex(/[a-z]/, "Incluye una minúscula")
  .regex(/[A-Z]/, "Incluye una mayúscula")
  .regex(/[0-9]/, "Incluye un número");

export const roleSchema = z.enum(["entrenador", "cliente"]);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: roleSchema,
  consentHealthData: z
    .boolean()
    .refine((v) => v === true, { message: "Debes aceptar el tratamiento de datos para continuar" }),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Introduce tu contraseña").max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
