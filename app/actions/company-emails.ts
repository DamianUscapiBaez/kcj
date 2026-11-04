"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

const schema = z.object({
  label: z.string().trim().min(1, "La etiqueta es obligatoria.").max(100),
  email: z.email("Correo electrónico inválido.").max(200),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
  position: z.number().int().min(0).default(0),
});
export type CompanyEmailInput = z.input<typeof schema>;
const validId = (id: string) => z.uuid().safeParse(id).success;
const refresh = () => { revalidatePath("/empresa"); revalidatePath("/cotizaciones"); };

export async function saveCompanyEmail(id: string | null, input: CompanyEmailInput) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    const companyId = membership.companyId;
    const data = schema.parse(input);
    if (id && !validId(id)) return { ok: false, message: "ID inválido." };
    const result = await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.companyEmail.findFirst({ where: { id, companyId } });
        if (!existing) return false;
      }
      if (data.isPrimary && data.isActive) {
        await tx.companyEmail.updateMany({ where: { companyId, isPrimary: true, ...(id ? { id: { not: id } } : {}) }, data: { isPrimary: false } });
      }
      if (id) {
        await tx.companyEmail.update({ where: { id }, data: { ...data, isPrimary: data.isActive && data.isPrimary } });
      } else {
        await tx.companyEmail.create({ data: { companyId, ...data, isPrimary: data.isActive && data.isPrimary } });
      }
      return true;
    });
    if (!result) return { ok: false, message: "Correo no encontrado." };
    refresh();
    return { ok: true, message: id ? "Correo actualizado." : "Correo registrado." };
  } catch (error) {
    console.error("saveCompanyEmail", error);
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? "Datos inválidos." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: "Este correo ya está registrado." };
    return { ok: false, message: "No se pudo guardar el correo." };
  }
}

export async function setPrimaryCompanyEmail(id: string) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    if (!validId(id)) return { ok: false, message: "ID inválido." };
    const companyId = membership.companyId;
    const result = await prisma.$transaction(async (tx) => {
      const email = await tx.companyEmail.findFirst({ where: { id, companyId, isActive: true } });
      if (!email) return false;
      await tx.companyEmail.updateMany({ where: { companyId, isPrimary: true, id: { not: id } }, data: { isPrimary: false } });
      await tx.companyEmail.update({ where: { id }, data: { isPrimary: true } });
      return true;
    });
    if (!result) return { ok: false, message: "Correo activo no encontrado." };
    refresh(); return { ok: true, message: "Correo principal actualizado." };
  } catch (error) { console.error("setPrimaryCompanyEmail", error); return { ok: false, message: "No se pudo cambiar el correo principal." }; }
}

export async function setCompanyEmailActive(id: string, active: boolean) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    if (!validId(id) || typeof active !== "boolean") return { ok: false, message: "Datos inválidos." };
    const result = await prisma.companyEmail.updateMany({ where: { id, companyId: membership.companyId }, data: { isActive: active, ...(active ? {} : { isPrimary: false }) } });
    if (!result.count) return { ok: false, message: "Correo no encontrado." };
    refresh(); return { ok: true, message: active ? "Correo activado." : "Correo desactivado." };
  } catch (error) { console.error("setCompanyEmailActive", error); return { ok: false, message: "No se pudo cambiar el estado." }; }
}

export async function deleteCompanyEmail(id: string) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    if (!validId(id)) return { ok: false, message: "ID inválido." };
    const result = await prisma.companyEmail.deleteMany({ where: { id, companyId: membership.companyId } });
    if (!result.count) return { ok: false, message: "Correo no encontrado." };
    refresh(); return { ok: true, message: "Correo eliminado." };
  } catch (error) { console.error("deleteCompanyEmail", error); return { ok: false, message: "No se pudo eliminar el correo." }; }
}
