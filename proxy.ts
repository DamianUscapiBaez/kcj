import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Se usa solo la configuración ligera (sin Prisma ni argon2) para que el proxy sea
// seguro de ejecutar en cualquier runtime. La callback `authorized` decide el acceso.
export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/cotizaciones/:path*",
    "/servicios/:path*",
    "/tarifas/:path*",
    "/vehiculos/:path*",
    "/empresa/:path*",
    "/login",
  ],
};
