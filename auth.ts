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

// ── Modo demo (sin BD) ──────────────────────────────────────────────────────
// Si no hay DATABASE_URL, el login valida contra estos usuarios en memoria para
// poder enseñar la app sin base de datos. En cuanto se configure DATABASE_URL,
// este bloque se ignora y se usa la autenticación real contra la BD.
// ⚠️ Quitar (o dejar como está, sólo se activa sin BD) antes de producción real.
const DEMO_USERS = [
  { id: "demo-coach", email: "coach@demo.com", phone: "3001112233", name: "Diego Sánchez", role: "entrenador", password: "Demo1234!" },
  { id: "demo-client", email: "client@demo.com", phone: "3004445566", name: "Marcos Vidal", role: "cliente", password: "Demo1234!" },
] as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        phone: { label: "Móvil", type: "tel" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        // Validación estricta de entrada.
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { phone, password } = parsed.data;

        // Rate limit en el ÚNICO punto por el que pasan todos los intentos
        // (incluido el POST directo a /api/auth/callback/credentials, que se
        // salta el server action). Por IP, ventana de 5 min.
        const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const rl = await rateLimit(`login-authz:${ip}`, 10, 5 * 60_000);
        if (!rl.success) return null;

        // Modo demo: los usuarios demo SIEMPRE pueden entrar (haya o no BD), para
        // poder enseñar la app aunque falten variables de entorno. Se comprueba
        // antes que la BD; el resto de credenciales siguen el flujo normal.
        const demo = DEMO_USERS.find((u) => u.phone === phone);
        if (demo) {
          if (demo.password !== password) return null;
          return { id: demo.id, email: demo.email, name: demo.name, role: demo.role };
        }

        // Sin BD configurada no hay más usuarios que los demo.
        if (!process.env.DATABASE_URL) return null;

        const found = await db
          .select()
          .from(users)
          .where(eq(users.phone, phone))
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
