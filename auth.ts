import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { users } from "./db/schema";
import { loginSchema } from "./lib/validation";

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

        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        const user = found[0];

        // Comparación en tiempo (semi-)constante: si no existe el usuario,
        // igualmente hacemos un compare con un hash dummy para no filtrar
        // qué emails están registrados por timing.
        const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
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
