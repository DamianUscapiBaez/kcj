import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  password: z.string().min(1).max(256),
});

// Hash de relleno: se verifica cuando el usuario no existe para que el tiempo de
// respuesta no revele si un correo está registrado (enumeración de usuarios).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash("timing-equalizer"));

const nextAuth = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            passwordHash: true,
            memberships: { select: { company: { select: { isActive: true } } } },
          },
        });

        const passwordHash = user?.passwordHash ?? (await getDummyHash());
        const valid = await verify(passwordHash, password).catch(() => false);

        if (!user || !valid || !user.isActive || !user.passwordHash) return null;
        if (!user.memberships.some((m) => m.company.isActive)) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
