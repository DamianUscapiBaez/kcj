
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

import type { CompanyRole } from "@/app/generated/prisma/client";

// ==========================================
// TIPOS
// ==========================================

type AllowedRoles = readonly CompanyRole[];

// ==========================================
// EMPRESAS ACTIVAS DEL USUARIO
// ==========================================

// cache() evita repetir la misma consulta dentro
// de una misma petición renderizada en React.
export const getActiveMemberships = cache(
  async (userId: string) => {
    if (!userId) {
      return [];
    }

    return prisma.companyUser.findMany({
      where: {
        userId,
        user: {
          isActive: true,
        },
        company: {
          isActive: true,
        },
      },

      include: {
        company: true,
      },

      orderBy: [
        {
          joinedAt: "asc",
        },
        {
          companyId: "asc",
        },
      ],
    });
  }
);

// ==========================================
// VALIDAR ACCESO A LA EMPRESA
// ==========================================

export async function requireCompanyAccess(
  userId: string,
  companyId?: string,
  allowedRoles?: AllowedRoles
) {
  if (!userId) {
    throw new Error(
      "Acceso denegado: usuario no identificado."
    );
  }

  const memberships = await getActiveMemberships(userId);

  if (memberships.length === 0) {
    throw new Error(
      "Acceso denegado: el usuario no tiene una empresa activa."
    );
  }

  // Si se especifica una empresa, verificar que
  // el usuario realmente pertenezca a ella.
  const membership = companyId
    ? memberships.find(
      (item) => item.companyId === companyId
    )
    : memberships.length === 1
      ? memberships[0]
      : null;

  if (!membership) {
    if (!companyId) {
      throw new Error(
        "Acceso denegado: se debe especificar la empresa activa."
      );
    }

    throw new Error(
      "Acceso denegado: empresa no autorizada."
    );
  }

  // Validar los roles permitidos.
  if (
    allowedRoles &&
    !allowedRoles.includes(membership.role)
  ) {
    throw new Error(
      "Acceso denegado: permisos insuficientes."
    );
  }

  return membership;
}

// ==========================================
// VALIDAR SESIÓN Y EMPRESA
// ==========================================

export async function requireSessionCompany(
  companyId?: string,
  roles?: AllowedRoles
) {
  const session = await auth();

  // Usuario no autenticado.
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await requireCompanyAccess(
    session.user.id,
    companyId,
    roles
  );

  return {
    session,
    membership,
  };
}
