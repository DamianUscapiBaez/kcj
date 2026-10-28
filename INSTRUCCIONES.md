# Solución de autenticación — Next.js 16 + Prisma 7

Corrige `auth is not a function` al exportar `auth` desde el resultado de NextAuth,
y evita importar Prisma en el proxy.

## Instalación

1. Haz una copia de seguridad de tu proyecto.
2. Copia los archivos de este ZIP a `D:\\Nextjs\\cotizaciones`, respetando carpetas.
   **NO** reemplaces tu `prisma/schema.prisma`, `prisma/seed.ts`,
   `lib/prisma.ts`, `app/layout.tsx` ni `app/globals.css`.
3. Instala:

   npm install next-auth@beta @node-rs/argon2 zod server-only

4. En `.env` conserva `DATABASE_URL`, añade `AUTH_SECRET` (generar con `npx auth secret`)
   y `SEED_ADMIN_PASSWORD` con una contraseña de desarrollo segura.
5. Ejecuta `npx tsx prisma/set-admin-password.ts` (usuario `admin@demo.cotizaciones.test`).
6. En `app/layout.tsx`, si no lo hiciste antes, envuelve los children con
   `<AuthProvider>{children}</AuthProvider>` e importa `AuthProvider from "@/auth-provider"`.
7. Comprueba que exista `app/api/auth/[...nextauth]/route.ts`.
8. Detén el servidor, borra caché con `Remove-Item -Recurse -Force .next`
   y ejecuta `npm run dev`.
9. Visita `http://localhost:3000/login`.

## Si sigue fallando

- Confirma que `auth.ts` esté en la raíz (no dentro de app/).
- Comprueba `npm ls next-auth` (debe ser 5.x beta).
- Busca `export const auth = NextAuth(` en tu proyecto: es incorrecto en Auth.js v5.
- Comprueba que `proxy.ts` sea el de este paquete, sin `auth((req...)`.
- Si `/dashboard` da 404, verifica `app/(dashboard)/dashboard/page.tsx`.
- Si `@/` falla, comprueba `tsconfig.json` con `"paths": {"@/*": ["./*"]}`.

## Seguridad

El proxy solo filtra navegación. El layout y cada operación de datos
deben validar sesión y membresía. La primera empresa activa se usa por
defecto; falta implementar selector multiempresa seguro.
Los usuarios del seed sin hash no pueden iniciar sesión.
No publiques contraseñas ni secretos.
