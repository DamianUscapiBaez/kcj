"use server";
// Acción antigua deshabilitada: ahora utiliza saveServiceRate de rates.ts.
import { requireSessionCompany } from "@/lib/permissions";
import { z } from "zod";
const schema = z.object({ serviceId: z.uuid(), vehicleTypeId: z.union([z.uuid(), z.literal("")]), unit: z.enum(["DAY", "TRIP", "SERVICE", "MONTH"]), pen: z.union([z.literal(""), z.coerce.number().positive()]), usd: z.union([z.literal(""), z.coerce.number().positive()]), penId: z.uuid().nullable(), usdId: z.uuid().nullable() });
export type TariffInput = z.input<typeof schema>;
export async function saveTariffPrices(_input: TariffInput) {
  await requireSessionCompany(undefined, ["ADMIN"]);
  return { ok: false, message: "Este formulario antiguo fue reemplazado. Usa el módulo /tarifas." };
}
