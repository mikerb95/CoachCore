import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. NO database, NO bcrypt, NO node-only imports here:
 * this file is imported by the middleware, which runs on the edge runtime.
 * The Credentials provider (which needs the db + bcrypt) is added in auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 /* 7 días */ },
  trustHost: true,
  providers: [], // poblado en auth.ts
  callbacks: {
    // Propaga id + role al token y a la sesión.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "entrenador" | "cliente";
      }
      return session;
    },
    // Protección de rutas a nivel de middleware (defensa en profundidad;
    // las páginas también revalidan en servidor).
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;
      const isLoggedIn = !!auth?.user;

      const onCoach = pathname.startsWith("/coach");
      const onCliente = pathname.startsWith("/cliente");

      if (onCoach || onCliente) {
        if (!isLoggedIn) return false; // → redirige a /login
        if (onCoach && role !== "entrenador") return false;
        if (onCliente && role !== "cliente") return false;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
