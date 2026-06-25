import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// Edge-safe auth instance (authConfig has no db/bcrypt imports).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  // ── Route protection (defensa en profundidad; las páginas revalidan también) ──
  const onCoach = nextUrl.pathname.startsWith("/coach");
  const onCliente = nextUrl.pathname.startsWith("/cliente");
  if (onCoach || onCliente) {
    if (!isLoggedIn) {
      const url = new URL("/login", nextUrl);
      url.searchParams.set("from", nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    if (onCoach && role !== "entrenador") return NextResponse.redirect(new URL("/cliente", nextUrl));
    if (onCliente && role !== "cliente") return NextResponse.redirect(new URL("/coach", nextUrl));
  }

  // ── Content-Security-Policy con nonce por petición ──
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    `default-src 'self'`,
    // Next.js inyecta el nonce en sus scripts; strict-dynamic permite los que cargan ellos.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`.trim(),
    // 'unsafe-inline' necesario para los atributos style del diseño y los <style> de next/font.
    // Iconos auto-hospedados: ya no se permite ningún CDN externo.
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self' data:`,
    `img-src 'self' data: blob:`,
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
});

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
