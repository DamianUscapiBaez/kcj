
import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

// ==========================================
// CONFIGURACIÓN
// ==========================================

const SESSION_MAX_AGE = 60 * 60 * 8;

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(200)),

  password: z.string().min(1).max(256),
});

// ==========================================
// PROTECCIÓN CONTRA ENUMERACIÓN DE USUARIOS
// ==========================================

let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  return (dummyHash ??= hash("timing-equalizer"));
}

// ==========================================
// VALIDACIÓN DE CREDENCIALES
// ==========================================

async function validateCredentials(
  raw: Partial<Record<string, unknown>>
) {
  const parsed = credentialsSchema.safeParse(raw);

  if (!parsed.success) {
    return null;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },

    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      passwordHash: true,

      memberships: {
        where: {
          company: {
            isActive: true,
          },
        },

        select: {
          companyId: true,
        },
      },
    },
  });

  // Utilizar un hash de relleno cuando no existe
  // una contraseña registrada.
  const passwordHash =
    user?.passwordHash || (await getDummyHash());

  let passwordValid = false;

  try {
    passwordValid = await verify(passwordHash, password);
  } catch {
    passwordValid = false;
  }

  const userExists = Boolean(user);
  const userActive = user?.isActive === true;
  const hasPassword = Boolean(user?.passwordHash);
  const hasActiveCompany =
    (user?.memberships.length ?? 0) > 0;

  // Diagnóstico temporal: solo en desarrollo.
  // Nunca registrar contraseñas ni hashes.
  if (process.env.NODE_ENV === "development") {
    console.info("[KCJ AUTH]", {
      userExists,
      passwordValid,
      userActive,
      hasPassword,
      hasActiveCompany,
    });
  }

  if (
    !user ||
    !passwordValid ||
    !userActive ||
    !hasPassword ||
    !hasActiveCompany
  ) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

// ==========================================
// NEXTAUTH
// ==========================================

const nextAuth = NextAuth({
  ...authConfig,

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },

  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Correo electrónico",
          type: "email",
        },

        password: {
          label: "Contraseña",
          type: "password",
        },
      },

      async authorize(credentials) {
        return validateCredentials(credentials);
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      if (
        session.user &&
        typeof token.userId === "string"
      ) {
        session.user.id = token.userId;
      }

      return session;
    },
  },
});

// ==========================================
// EXPORTACIONES
// ==========================================

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = nextAuth;
