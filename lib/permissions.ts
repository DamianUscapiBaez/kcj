import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { CompanyRole } from "@/app/generated/prisma/client";

// `cache` evita repetir la consulta dentro de una misma petición.
export const getActiveMemberships = cache(async (userId: string) =>
  prisma.companyUser.findMany({
    where: { userId, user: { isActive: true }, company: { isActive: true } },
    include: { company: true },
    orderBy: { joinedAt: "asc" },
  }),
);

export async function requireCompanyAccess(
  userId: string,
  companyId?: string,
  allowedRoles?: CompanyRole[],
) {
  const memberships = await getActiveMemberships(userId);
  const membership = companyId
    ? memberships.find((m) => m.companyId === companyId)
    : memberships[0];
  if (!membership) throw new Error("Acceso denegado: empresa no autorizada");
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new Error("Acceso denegado: permisos insuficientes");
  }
  return membership;
}

// Sesión + empresa activa del usuario. Redirige a /login si no hay sesión.
export async function requireSessionCompany(
  companyId?: string,
  roles?: CompanyRole[],
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await requireCompanyAccess(session.user.id, companyId, roles);
  return { session, membership };
}
