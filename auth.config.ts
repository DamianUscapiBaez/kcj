import type { NextAuthConfig } from "next-auth";

// Rutas que requieren sesión. Mantener sincronizado con `matcher` en proxy.ts.
export const PRIVATE_PREFIXES = ["/dashboard", "/clientes", "/cotizaciones", "/servicios", "/tarifas", "/vehiculos"];

export default {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const privateRoute = PRIVATE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
      if (privateRoute) return loggedIn;
      if (loggedIn && pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
