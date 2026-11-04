"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { Prisma, Currency, RateUnit, DurationType } from "@/app/generated/prisma/client";

const nameSchema = z.string().trim().min(1, "Nombre obligatorio.").max(160);
const optionalId = z.union([z.uuid(), z.null()]);
const rateSchema = z.object({
  serviceId: z.uuid(),
  vehicleModelId: optionalId,
  durationType: z.union([z.nativeEnum(DurationType), z.null()]),
  name: nameSchema,
  description: z.string().trim().nullable(),
  unit: z.nativeEnum(RateUnit),
  currency: z.literal(Currency.USD),
  price: z.string().trim().regex(/^\d{1,14}(?:\.\d{1,4})?$/, "Precio inválido: máximo cuatro decimales."),
}).refine(v => new Prisma.Decimal(v.price).gt(0), { message: "El precio debe ser mayor a cero.", path: ["price"] });

export type RateInput = z.input<typeof rateSchema>;
type Result = { ok: boolean; message: string };
const refresh = () => { revalidatePath("/tarifas"); revalidatePath("/cotizaciones"); };
const validId = (id: string | null) => id === null || z.uuid().safeParse(id).success;
function failure(error: unknown): Result {
  if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? "Datos inválidos." };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, message: "Ya existe un registro con esa clave única." };
    if (error.code === "P2003") return { ok: false, message: "Hay registros relacionados que impiden esta operación." };
  }
  console.error("Tarifas:", error);
  return { ok: false, message: "No se pudo completar la operación." };
}

export async function saveServiceRate(id: string | null, input: RateInput): Promise<Result> {
  const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
  const companyId = membership.companyId;
  try {
    if (!validId(id)) return { ok: false, message: "ID inválido." };
    const value = rateSchema.parse(input);
    if (value.unit === RateUnit.HOUR) {
      if (!id) return { ok: false, message: "La unidad Hora es solo histórica." };
      const existing = await prisma.serviceRate.findFirst({where:{id,companyId},select:{unit:true}});
      if (existing?.unit !== RateUnit.HOUR) return { ok: false, message: "No puedes asignar Hora a una tarifa nueva." };
    }
    const [service, vehicle] = await Promise.all([
      prisma.service.findFirst({ where: { id: value.serviceId, companyId, isActive: true }, select: { id: true, requiresVehicle: true } }),
      value.vehicleModelId ? prisma.vehicleModel.findFirst({ where: { id: value.vehicleModelId, companyId, isActive: true, vehicleType: { isActive: true } }, select: { id: true } }) : Promise.resolve(true),
    ]);
    if (!service) return { ok: false, message: "Selecciona un servicio activo de tu empresa." };
    if (service.requiresVehicle && !value.vehicleModelId) return { ok: false, message: "El servicio requiere un modelo de vehículo." };
    if (!vehicle) return { ok: false, message: "Modelo de vehículo no disponible." };
    const data = {
      serviceId: value.serviceId,
      vehicleModelId: value.vehicleModelId,
      durationType: value.durationType,
      name: value.name,
      description: value.description?.trim() || null,
      unit: value.unit,
      currency: Currency.USD,
      price: new Prisma.Decimal(value.price),
    };
    if (id) {
      const updated = await prisma.serviceRate.updateMany({ where: { id, companyId }, data });
      if (!updated.count) return { ok: false, message: "Tarifa no encontrada." };
    } else {
      await prisma.serviceRate.create({ data: { ...data, companyId } });
    }
    refresh(); return { ok: true, message: id ? "Tarifa actualizada." : "Tarifa registrada." };
  } catch (error) { return failure(error); }
}

export async function setServiceRateActive(id: string, isActive: boolean): Promise<Result> {
  const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
  const companyId = membership.companyId;
  try {
    if (!z.uuid().safeParse(id).success || typeof isActive !== "boolean") return { ok: false, message: "Datos inválidos." };
    if (isActive) {
      const rate = await prisma.serviceRate.findFirst({
        where: { id, companyId },
        select: { service: { select: { isActive: true, requiresVehicle: true } }, vehicleModel: { select: { isActive: true, vehicleType: { select: { isActive: true } } } } },
      });
      if (!rate) return { ok: false, message: "Tarifa no encontrada." };
      if (!rate.service.isActive || (rate.service.requiresVehicle && !rate.vehicleModel) || (rate.vehicleModel && (!rate.vehicleModel.isActive || !rate.vehicleModel.vehicleType.isActive))) {
        return { ok: false, message: "Activa primero los catálogos asociados a esta tarifa." };
      }
    }
    const updated = await prisma.serviceRate.updateMany({ where: { id, companyId }, data: { isActive } });
    if (!updated.count) return { ok: false, message: "Tarifa no encontrada." };
    refresh(); return { ok: true, message: "Estado actualizado." };
  } catch (error) { return failure(error); }
}
