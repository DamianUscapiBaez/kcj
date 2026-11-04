"use server";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { Prisma } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const lineSchema = z.object({
  description: z.string().trim().min(2).max(1000),
  serviceId: z.union([z.uuid(), z.literal("")]),
  vehicleModelId: z.union([z.uuid(), z.literal("")]),
  serviceRateId: z.union([z.uuid(), z.literal("")]),
  unit: z.enum(["DAY", "TRIP", "SERVICE", "MONTH"]),
  quantity: z.coerce.number().positive().max(1000000),
  unitPrice: z.coerce.number().nonnegative(),
  discountAmount: z.coerce.number().nonnegative().default(0),
  serviceStart: z.union([z.iso.date(), z.literal("")]).optional(),
  serviceEnd: z.union([z.iso.date(), z.literal("")]).optional(),
});
const quoteSchema = z.object({
  clientId: z.uuid(), currency: z.enum(["PEN", "USD"]),
  exchangeRate: z.coerce.number().positive().max(1000),
  taxRate: z.coerce.number().min(0).max(100), taxIncluded: z.boolean(),
  expiryDate: z.iso.date(), notes: z.string().max(4000),
  terms: z.string().max(4000), items: z.array(lineSchema).min(1).max(100),
});
export type QuoteInput = z.input<typeof quoteSchema>;
const decimal = (v: string | number | Prisma.Decimal | { toString(): string }) =>
  new Prisma.Decimal(String(v));
const money = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const dateOnly = (s: string) => new Date(`${s}T12:00:00.000Z`);
const dayString = (d: Date) => d.toISOString().slice(0, 10);
const bad = (message: string) => ({ ok: false as const, message });

// Mantener esta regla sincronizada con quotation-client.tsx.
// Menos de un mes: 1–29 días; un mes o más: 30+ días.
const DAY_MS = 86_400_000;
function inclusiveDays(start: string, end: string): number {
  return Math.round((dateOnly(end).getTime() - dateOnly(start).getTime()) / DAY_MS) + 1;
}

function calendarMonthsRoundedUp(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const endMs = Date.UTC(ey, em - 1, Number(end.slice(8)));
  const anniversary = (offset: number) => {
    const monthIndex = sm - 1 + offset;
    const year = sy + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Date.UTC(year, month, Math.min(sd, lastDay));
  };
  let months = (ey - sy) * 12 + em - sm;
  if (anniversary(months) > endMs + DAY_MS) months--;
  return Math.max(1, months + (anniversary(months) < endMs + DAY_MS ? 1 : 0));
}

export async function saveQuotation(id: string | null, input: QuoteInput) {
  try {
    const { session, membership } = await requireSessionCompany(undefined, ["ADMIN", "SALES"]);
    const companyId = membership.companyId;
    const v = quoteSchema.parse(input);
    if (id && !z.uuid().safeParse(id).success) return bad("Identificador inválido.");
    const client = await prisma.client.findFirst({ where: { id: v.clientId, companyId, isActive: true } });
    if (!client) return bad("Cliente no disponible para tu empresa.");
    const existing = id ? await prisma.quotation.findFirst({ where: { id, companyId, status: "DRAFT" }, include: { items: true } }) : null;
    if (id && !existing) return bad("Solo puedes editar borradores de tu empresa.");
    if (existing && existing.currency !== v.currency) return bad("No cambies la moneda de un borrador existente.");
    if (!Number.isFinite(v.exchangeRate)) return bad("Tipo de cambio inválido.");
    const fx = decimal(v.exchangeRate);
    const rateIds = [...new Set(v.items.map(x => x.serviceRateId).filter(Boolean))];
    if (v.items.some(x => !x.serviceRateId)) {
      return bad("Selecciona una tarifa para cada línea.");
    }
    const rates = await prisma.serviceRate.findMany({
      where: { companyId, id: { in: rateIds } },
      include: { service: { select: { isActive: true } }, vehicleModel: { select: { isActive: true, vehicleType: { select: { isActive: true } } } } },
    });
    const map = new Map(rates.map(r => [r.id, r]));
    const today = new Date().toISOString().slice(0, 10);
    const rows: Omit<Prisma.QuotationItemCreateManyInput, "quotationId">[] = [];
    for (let index = 0; index < v.items.length; index++) {
      const line = v.items[index];
      const rate = map.get(line.serviceRateId);
      if (!rate || rate.companyId !== companyId || rate.serviceId !== line.serviceId ||
        (rate.vehicleModelId ?? "") !== line.vehicleModelId || rate.unit !== line.unit) return bad(`La tarifa de la línea ${index + 1} no coincide con el servicio, modelo o unidad.`);
      const old = existing?.items.find(x => x.position === index + 1 && x.serviceRateId === rate.id);
      if (!old && (!rate.isActive || !rate.service.isActive || rate.vehicleModel?.isActive === false || rate.vehicleModel?.vehicleType.isActive === false)) return bad(`La tarifa de la línea ${index + 1} no está disponible.`);
      if (line.serviceStart && line.serviceEnd && line.serviceEnd < line.serviceStart) return bad("La fecha final debe ser posterior o igual a la inicial.");
      if (line.unit === "DAY" || line.unit === "MONTH") {
        if (!line.serviceStart || !line.serviceEnd) return bad("Completa las fechas de inicio y fin.");
        const days = inclusiveDays(line.serviceStart, line.serviceEnd);
        if (rate.durationType === "LESS_THAN_MONTH" && days >= 30) {
          return bad(`La tarifa de la línea ${index + 1} corresponde a menos de 30 días.`);
        }
        if (rate.durationType === "GREATER_THAN_MONTH" && days < 30) {
          return bad(`La tarifa de la línea ${index + 1} requiere al menos 30 días.`);
        }
        if (line.unit === "DAY" && days !== line.quantity) {
          return bad("La cantidad de días no coincide con las fechas.");
        }
        if (line.unit === "MONTH" && calendarMonthsRoundedUp(line.serviceStart, line.serviceEnd) !== line.quantity) {
          return bad("La cantidad de meses no coincide con las fechas.");
        }
      }
      // Precio del catálogo, salvo que sea la misma línea de un borrador existente.
      const sourcePrice = old ? decimal(old.sourceUnitPrice) : decimal(rate.price);
      const effectivePrice = old ? decimal(old.unitPrice) : (rate.currency === v.currency ? sourcePrice : v.currency === "PEN" ? sourcePrice.mul(fx) : sourcePrice.div(fx)).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      if (!effectivePrice.eq(decimal(line.unitPrice))) return bad(`El precio de la línea ${index + 1} no coincide con la tarifa registrada.`);
      const gross = money(decimal(line.quantity).mul(effectivePrice));
      const discount = money(decimal(line.discountAmount));
      if (discount.gt(gross)) return bad("El descuento no puede superar el importe.");
      rows.push({
        companyId, position: index + 1, description: line.description,
        serviceId: rate.serviceId, vehicleModelId: rate.vehicleModelId,
        serviceRateId: rate.id,
        unit: rate.unit, requestedUnits: null, serviceStart: line.serviceStart ? dateOnly(line.serviceStart) : null,
        serviceEnd: line.serviceEnd ? dateOnly(line.serviceEnd) : null,
        quantity: decimal(line.quantity), sourceCurrency: old?.sourceCurrency ?? rate.currency,
        sourceUnitPrice: sourcePrice, unitPrice: effectivePrice, discountAmount: discount,
        lineTotal: gross.minus(discount)
      });
    }
    const base = rows.reduce((sum, x) => sum.plus(String(x.lineTotal)), decimal(0));
    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    const taxRate = decimal(v.taxRate);
    const rateFactor = taxRate.div(100);
    const subtotal = v.taxIncluded ? money(base.div(decimal(1).plus(rateFactor))) : money(base);
    const taxAmount = v.taxIncluded ? money(base.minus(subtotal)) : money(subtotal.mul(rateFactor));
    const total = v.taxIncluded ? money(base) : money(subtotal.plus(taxAmount));
    const expiryDate = dateOnly(v.expiryDate);
    if (dayString(expiryDate) !== v.expiryDate || (!id && v.expiryDate < today)) return bad("Fecha de vencimiento inválida.");
    const payload = {
      clientId: v.clientId, clientName: client.legalName,
      clientDocument: client.documentNumber, clientAddress: client.address,
      currency: v.currency, exchangeRate: fx, exchangeRateAt: new Date(), taxRate, taxIncluded: v.taxIncluded,
      expiryDate, notes: v.notes, terms: v.terms,
      subtotal, discountAmount: decimal(0), taxAmount, total
    };
    let quoteId = id;
    await prisma.$transaction(async tx => {
      if (id) {
        const updated = await tx.quotation.updateMany({ where: { id, companyId, status: "DRAFT" }, data: payload });
        if (updated.count !== 1) throw new Error("El borrador cambió de estado.");
        await tx.quotationItem.deleteMany({ where: { quotationId: id, companyId } });
        await tx.quotationItem.createMany({ data: rows.map(x => ({ ...x, quotationId: id })) });
      } else {
        const year = new Date().getUTCFullYear();
        const seq = await tx.quotationSequence.upsert({
          where: { companyId_year: { companyId, year } },
          create: { companyId, year, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        const prefix = (settings?.quotationPrefix || "COT").trim().toUpperCase();
        const code = `${prefix}-${year}-${String(seq.lastNumber).padStart(5, "0")}`;
        const created = await tx.quotation.create({
          data: {
            ...payload, companyId, createdById: session.user.id!, year,
            number: seq.lastNumber, code,
            statusHistory: { create: { changedById: session.user.id!, toStatus: "DRAFT", note: "Cotización creada" } },
          }
        });
        quoteId = created.id;
        await tx.quotationItem.createMany({ data: rows.map(x => ({ ...x, quotationId: created.id })) });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/cotizaciones"); revalidatePath("/dashboard");
    return { ok: true as const, message: "Cotización guardada correctamente.", id: quoteId };
  } catch (e) {
    console.error("saveQuotation", e);
    return bad(e instanceof z.ZodError ? e.issues[0]?.message ?? "Datos inválidos." : "No se pudo guardar la cotización.");
  }
}

export async function changeQuotationStatus(id: string, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED") {
  try {
    const { session, membership } = await requireSessionCompany(undefined, ["ADMIN", "SALES"]);
    const companyId = membership.companyId;
    const current = await prisma.quotation.findFirst({ where: { id, companyId } });
    if (!current) return bad("Cotización no encontrada.");
    const allowed: Record<string, string[]> = { DRAFT: ["SENT", "CANCELLED"], SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"], ACCEPTED: [], REJECTED: [], EXPIRED: [], CANCELLED: [] };
    if (!allowed[current.status].includes(status)) return bad("Cambio de estado no permitido.");
    await prisma.$transaction(async tx => {
      const changed = await tx.quotation.updateMany({ where: { id, companyId, status: current.status }, data: { status, ...(status === "SENT" ? { issuedAt: new Date() } : {}) } });
      if (changed.count !== 1) throw new Error("Estado modificado simultáneamente.");
      await tx.quotationStatusHistory.create({ data: { quotationId: id, changedById: session.user.id!, fromStatus: current.status, toStatus: status } });
    });
    revalidatePath("/cotizaciones"); revalidatePath("/dashboard");
    return { ok: true, message: "Estado actualizado." };
  } catch { return bad("No se pudo cambiar el estado."); }
}
export async function deleteDraft(id: string) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["ADMIN"]);
    const result = await prisma.quotation.deleteMany({ where: { id, companyId: membership.companyId, status: "DRAFT" } });
    if (!result.count) return bad("Solo puedes eliminar borradores de tu empresa.");
    revalidatePath("/cotizaciones"); revalidatePath("/dashboard");
    return { ok: true, message: "Borrador eliminado." };
  } catch { return bad("No se pudo eliminar el borrador."); }
}
export async function createQuotationReviewLink(quotationId: string): Promise<{ ok: boolean; message: string; url?: string }> {
  try {
    const { createQuotationReviewLink: createLink } = await import("@/lib/quotation-review");
    const url = await createLink(quotationId);
    revalidatePath("/cotizaciones");
    return { ok: true, message: "Enlace de revisión generado.", url };
  } catch (error) {
    console.error("createQuotationReviewLink", error);
    return bad("No se pudo generar el enlace. Verifica APP_URL y el estado de la cotización.");
  }
}
export async function sendQuotationEmail(_id: string, _recipient: string) {
  void _id;
  void _recipient;
  await requireSessionCompany(undefined, ["ADMIN", "SALES"]);
  return bad("El envío PDF necesita actualizarse al esquema actual antes de habilitarlo.");
}
