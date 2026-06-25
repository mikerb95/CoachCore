import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { users } from "./db/schema";
import { loginSchema } from "./lib/validation";
import { rateLimit } from "./lib/rateLimit";

// Hash bcrypt REAL de una cadena aleatoria. Se compara contra él cuando el
// usuario no existe, para que el tiempo de respuesta sea equivalente al de un
// usuario real (mismo coste 12) y no se pueda enumerar emails por timing.
const DUMMY_HASH = bcrypt.hashSync("cc-timing-safety-decoy-" + Math.random().toString(36).slice(2), 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        // Validación estricta de entrada.
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Rate limit en el ÚNICO punto por el que pasan todos los intentos
        // (incluido el POST directo a /api/auth/callback/credentials, que se
        // salta el server action). Por IP, ventana de 5 min.
        const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const rl = await rateLimit(`login-authz:${ip}`, 10, 5 * 60_000);
        if (!rl.success) return null;

        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        const user = found[0];

        // Si no existe el usuario, comparamos igualmente contra un hash válido
        // para no filtrar qué emails están registrados por timing.
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const ok = await bcrypt.compare(password, hash);
        if (!user || !ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
