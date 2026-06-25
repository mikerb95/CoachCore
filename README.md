# CoachCore

App PWA para entrenadores personales (Next.js App Router + Auth.js + Neon Postgres).

- **Roles:** `entrenador` (app de gestión) y `cliente` (app de entreno).
- **Auth real:** email + contraseña, Auth.js (NextAuth v5), sesiones JWT, sin terceros de identidad.
- **Datos:** Postgres gestionado (Neon) vía Drizzle ORM.

## Puesta en marcha (lo que necesitas hacer tú)

1. **Crear la base de datos (Neon).**
   - Desde el Marketplace de Vercel: `Storage → Neon → Create`, o en [neon.tech](https://neon.tech) (free tier).
   - Copia la *connection string* (pooled, `?sslmode=require`).

2. **Configurar variables de entorno.**
   - Copia `.env.example` → `.env.local` y rellena:
     - `AUTH_SECRET` — genera uno: `openssl rand -base64 33`
     - `DATABASE_URL` — la connection string de Neon
   - En Vercel, añade las mismas variables en *Project → Settings → Environment Variables*.

3. **Crear las tablas.**
   ```bash
   npm run db:push      # aplica el esquema a Neon
   # o:  npm run db:generate && (aplicar migración)
   ```

4. **Arrancar.**
   ```bash
   npm install
   npm run dev          # http://localhost:3000
   ```
   Crea una cuenta en `/register` (elige rol) y entra en `/login`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:push` | Sincroniza el esquema con la BD |
| `npm run db:generate` | Genera migraciones SQL en `db/migrations` |
| `npm run db:studio` | Explorador de la BD (Drizzle Studio) |

## Seguridad implementada

- Contraseñas con **hash bcrypt** (cost 12); nunca se guarda ni exporta el texto plano.
- **Sesiones JWT** firmadas (`AUTH_SECRET`), 7 días, cookie httpOnly/secure.
- **Control de acceso por rol** en `proxy.ts` (middleware) **y** revalidado en cada página de servidor (defensa en profundidad).
- **Validación de entrada con Zod** en cliente y servidor.
- Comparación de login resistente a *timing* (hash dummy si el email no existe).
- **Cabeceras de seguridad:** HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, y **CSP con nonce por petición** (`strict-dynamic`).
- `poweredByHeader` desactivado.

## Privacidad / RGPD

- Datos de salud (lesiones, peso, medidas) = **categoría especial (art. 9)**: se piden con **consentimiento explícito** en el registro y se guarda el rastro (`consent_at`, `privacy_version`).
- **Derechos del usuario** desde la propia app: exportar datos (portabilidad) y eliminar cuenta (supresión).
- Política de privacidad en `/privacidad` (plantilla base — revísala con asesoría legal y rellena el responsable del tratamiento).

## Pendiente / siguientes pasos

- Los datos de entreno que se muestran en las apps siguen siendo **demo**; el login, los roles, los usuarios y las medidas de seguridad/privacidad son reales. Falta migrar el contenido de clientes/sesiones/medidas a tablas propias por usuario.
- **Rate limiting** de login: en producción conviene Upstash Redis (`@upstash/ratelimit`) — ahora mismo no hay límite de intentos a nivel de app.
- Opcional: 2FA / passkeys, verificación de email, recuperación de contraseña.
