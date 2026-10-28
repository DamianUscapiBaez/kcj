"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  serviceId: z.uuid(),
  vehicleTypeId: z.union([z.uuid(), z.literal("")]),
  unit: z.enum(["HOUR", "DAY", "TRIP", "SERVICE", "MONTH"]),
  pen: z.union([z.literal(""), z.coerce.number().positive().max(999999999)]),
  usd: z.union([z.literal(""), z.coerce.number().positive().max(999999999)]),
  penId: z.uuid().nullable(),
  usdId: z.uuid().nullable(),
});
export type TariffInput = z.input<typeof schema>;

export async function saveTariffPrices(input: TariffInput) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["OWNER", "ADMIN"]);
    const companyId = membership.companyId;
    const v = schema.parse(input);
    if (v.pen === "" && v.usd === "")
      return { ok: false, message: "Ingresa al menos un precio." };
    if (v.penId && v.penId === v.usdId)
      return { ok: false, message: "Identificadores de tarifas inválidos." };
    const [service, vehicle] = await Promise.all([
      prisma.service.findFirst({ where: { id: v.serviceId, companyId, isActive: true } }),
      v.vehicleTypeId ? prisma.vehicleType.findFirst({ where: { id: v.vehicleTypeId, companyId, isActive: true } }) : Promise.resolve(null),
    ]);
    if (!service || (v.vehicleTypeId && !vehicle))
      return { ok: false, message: "Servicio o vehículo no disponible." };

    const unitNames = { HOUR: "hora", DAY: "día", TRIP: "viaje", SERVICE: "servicio", MONTH: "mes" };
    const name = `${service.name}${vehicle ? " · " + vehicle.name : ""} / ${unitNames[v.unit]}`;
    await prisma.$transaction(async tx => {
      const ids = [v.penId, v.usdId].filter((id): id is string => Boolean(id));
      const originals = await tx.serviceRate.findMany({ where: { id: { in: ids }, companyId } });
      if (originals.length !== ids.length ||
          (v.penId && !originals.some(x => x.id === v.penId && x.currency === "PEN")) ||
          (v.usdId && !originals.some(x => x.id === v.usdId && x.currency === "USD")))
        throw new Error("Las tarifas originales no son válidas o no pertenecen a la empresa.");

      // Impide sobrescribir otro grupo existente. Se permiten los IDs propios al editar.
      const collisions = await tx.serviceRate.findMany({
        where: {
          companyId, serviceId: v.serviceId, vehicleTypeId: v.vehicleTypeId || null,
          unit: v.unit, isActive: true,
          ...(ids.length ? { id: { notIn: ids } } : {}),
        },
        select: { currency: true },
      });
      if (collisions.some(x => (x.currency === "PEN" && v.pen !== "") ||
                               (x.currency === "USD" && v.usd !== "")))
        throw new Error("Ya existe una tarifa para ese servicio, vehículo, modalidad y moneda.");

      for (const currency of ["PEN", "USD"] as const) {
        const amount = currency === "PEN" ? v.pen : v.usd;
        const id = currency === "PEN" ? v.penId : v.usdId;
        if (id) {
          await tx.serviceRate.update({ where: { id }, data: {
            serviceId: v.serviceId, vehicleTypeId: v.vehicleTypeId || null,
            unit: v.unit, name, ...(amount === "" ? { isActive: false } : { price: amount, isActive: true }),
          } });
        } else if (amount !== "") {
          await tx.serviceRate.create({ data: {
            companyId, serviceId: v.serviceId, vehicleTypeId: v.vehicleTypeId || null,
            unit: v.unit, currency, price: amount, name,
          } });
        }
      }
    });
    revalidatePath("/tarifas");
    revalidatePath("/cotizaciones");
    return { ok: true, message: "Tarifa actualizada correctamente." };
  } catch (error) {
    console.error("saveTariffPrices", error);
    return { ok: false, message: error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Datos inválidos."
      : error instanceof Error && (error.message.startsWith("Ya existe") || error.message.startsWith("Las tarifas"))
      ? error.message : "No se pudieron guardar los precios." };
  }
}
