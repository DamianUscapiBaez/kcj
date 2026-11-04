"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

const schema = z.object({
  label: z.string().trim().min(1, "La etiqueta es obligatoria.").max(100),
  number: z.string().trim().min(4, "Ingresa un teléfono válido.").max(40),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
  position: z.number().int().min(0).default(0),
});
export type CompanyPhoneInput = z.input<typeof schema>;
const validId = (id: string) => z.uuid().safeParse(id).success;
const refresh = () => { revalidatePath("/empresa"); revalidatePath("/cotizaciones"); };

export async function saveCompanyPhone(id: string | null, input: CompanyPhoneInput) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    const companyId = membership.companyId;
    const data = schema.parse(input);
    if (id && !validId(id)) return { ok: false, message: "ID inválido." };
    const result = await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.companyPhone.findFirst({ where: { id, companyId } });
        if (!existing) return false;
      }
      if (data.isPrimary && data.isActive) {
        await tx.companyPhone.updateMany({ where: { companyId, isPrimary: true, ...(id ? { id: { not: id } } : {}) }, data: { isPrimary: false } });
      }
      if (id) {
        await tx.companyPhone.update({ where: { id }, data: { ...data, isPrimary: data.isActive && data.isPrimary } });
      } else {
        await tx.companyPhone.create({ data: { companyId, ...data, isPrimary: data.isActive && data.isPrimary } });
      }
      return true;
    });
    if (!result) return { ok: false, message: "Teléfono no encontrado." };
    refresh();
    return { ok: true, message: id ? "Teléfono actualizado." : "Teléfono registrado." };
  } catch (error) {
    console.error("saveCompanyPhone", error);
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? "Datos inválidos." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: "Este teléfono ya está registrado." };
    return { ok: false, message: "No se pudo guardar el teléfono." };
  }
}

export async function setPrimaryCompanyPhone(id: string) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    if (!validId(id)) return { ok: false, message: "ID inválido." };
    const companyId = membership.companyId;
    const result = await prisma.$transaction(async (tx) => {
      const phone = await tx.companyPhone.findFirst({ where: { id, companyId, isActive: true } });
      if (!phone) return false;
      await tx.companyPhone.updateMany({ where: { companyId, isPrimary: true, id: { not: id } }, data: { isPrimary: false } });
      await tx.companyPhone.update({ where: { id }, data: { isPrimary: true } });
      return true;
    });
    if (!result) return { ok: false, message: "Teléfono activo no encontrado." };
    refresh(); return { ok: true, message: "Teléfono principal actualizado." };
  } catch (error) { console.error("setPrimaryCompanyPhone", error); return { ok: false, message: "No se pudo cambiar el teléfono principal." }; }
}

export async function setCompanyPhoneActive(id: string, active: boolean) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    if (!validId(id) || typeof active !== "boolean") return { ok: false, message: "Datos inválidos." };
    const result = await prisma.companyPhone.updateMany({ where: { id, companyId: membership.companyId }, data: { isActive: active, ...(active ? {} : { isPrimary: false }) } });
    if (!result.count) return { ok: false, message: "Teléfono no encontrado." };
    refresh(); return { ok: true, message: active ? "Teléfono activado." : "Teléfono desactivado." };
  } catch (error) { console.error("setCompanyPhoneActive", error); return { ok: false, message: "No se pudo cambiar el estado." }; }
}

export async function deleteCompanyPhone(id: string) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    if (!validId(id)) return { ok: false, message: "ID inválido." };
    const result = await prisma.companyPhone.deleteMany({ where: { id, companyId: membership.companyId } });
    if (!result.count) return { ok: false, message: "Teléfono no encontrado." };
    refresh(); return { ok: true, message: "Teléfono eliminado." };
  } catch (error) { console.error("deleteCompanyPhone", error); return { ok: false, message: "No se pudo eliminar el teléfono." }; }
}
