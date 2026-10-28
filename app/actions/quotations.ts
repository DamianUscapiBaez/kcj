"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { createHash, randomBytes } from "node:crypto";

const itemSchema = z.object({
  description: z.string().trim().min(2).max(1000),
  serviceId: z.union([z.uuid(), z.literal("")]),
  vehicleTypeId: z.union([z.uuid(), z.literal("")]),
  serviceRateId: z.union([z.uuid(), z.literal("")]).optional(),
  unit: z.enum(["HOUR", "DAY", "TRIP", "SERVICE", "MONTH"]),
  quantity: z.coerce.number().positive().max(1000000),
  unitPrice: z.coerce.number().nonnegative().max(100000000),
  discountAmount: z.coerce.number().nonnegative().default(0),
  serviceStart: z.union([z.iso.date(), z.literal("")]).optional(),
  serviceEnd: z.union([z.iso.date(), z.literal("")]).optional(),
  startTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional(),
  endTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional(),
});
const schema = z.object({
  clientId: z.uuid(),
  currency: z.enum(["PEN", "USD"]),
  taxRate: z.coerce.number().min(0).max(100),
  taxIncluded: z.boolean(),
  expiryDate: z.iso.date(),
  notes: z.string().max(4000),
  terms: z.string().max(4000),
  items: z.array(itemSchema).min(1).max(100),
});
export type QuoteInput = z.input<typeof schema>;
const money = (value: number | string | Prisma.Decimal) => new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export async function saveQuotation(id: string | null, input: QuoteInput) {
  try {
    const { session, membership } = await requireSessionCompany(undefined, ["OWNER", "ADMIN", "SALES"]);
    const companyId = membership.companyId;
    const v = schema.parse(input);
    const client = await prisma.client.findFirst({ where: { id: v.clientId, companyId, isActive: true } });
    if (!client) return { ok: false, message: "Cliente no disponible." };

    const serviceIds = [...new Set(v.items.map((i) => i.serviceId).filter(Boolean))];
    const vehicleIds = [...new Set(v.items.map((i) => i.vehicleTypeId).filter(Boolean))];
    const rateIds = [...new Set(v.items.map((i) => i.serviceRateId || "").filter(Boolean))];
    const [services, vehicles, rates, settings] = await Promise.all([
      prisma.service.findMany({ where: { companyId, id: { in: serviceIds }, isActive: true }, select: { id: true } }),
      prisma.vehicleType.findMany({ where: { companyId, id: { in: vehicleIds }, isActive: true }, select: { id: true } }),
      prisma.serviceRate.findMany({ where: { companyId, id: { in: rateIds }, isActive: true, service: { isActive: true } } }),
      prisma.companySettings.findUnique({ where: { companyId }, select: { quotationPrefix: true, defaultTaxRate: true, defaultCurrency: true, defaultValidityDays: true, defaultTerms: true } }),
    ]);
    if (services.length !== serviceIds.length || vehicles.length !== vehicleIds.length || rates.length !== rateIds.length) {
      return { ok: false, message: "Uno de los servicios, vehículos o tarifas no está disponible para tu empresa." };
    }
    if (v.items.some((line) => !line.serviceRateId)) return { ok: false, message: "Selecciona una tarifa en cada línea." };
    const existing = id ? await prisma.quotation.findFirst({ where: { id, companyId, status: "DRAFT" }, select: { id: true, taxRate: true, taxIncluded: true, expiryDate: true, terms: true, items: { select: { serviceRateId: true, unitPrice: true } } } }) : null;
    if (id && !existing) return { ok: false, message: "Solo se pueden editar borradores." };
    const rateMap = new Map(rates.map((r) => [r.id, r]));
    const today = new Date().toISOString().slice(0, 10);
    for (const line of v.items) {
      if (!line.serviceRateId) continue;
      const rate = rateMap.get(line.serviceRateId);
      if (!rate || rate.serviceId !== line.serviceId || (rate.vehicleTypeId ?? "") !== line.vehicleTypeId || rate.currency !== v.currency ||
        (rate.validFrom && rate.validFrom.toISOString().slice(0, 10) > today) ||
        (rate.validUntil && rate.validUntil.toISOString().slice(0, 10) < today)) {
        return { ok: false, message: "La tarifa seleccionada no coincide con el servicio, vehículo, moneda o vigencia." };
      }
      if (rate.unit !== line.unit) return { ok: false, message: "La unidad debe coincidir con la tarifa seleccionada." };
      // En nuevas cotizaciones el precio debe venir del catálogo; no confiar en el navegador.
      // En borradores anteriores, preservar precios históricos al editar.
      const oldPrice = existing?.items.find((old) => old.serviceRateId === line.serviceRateId && old.unitPrice.eq(line.unitPrice));
      if (!oldPrice && !rate.price.eq(line.unitPrice)) return { ok: false, message: "El precio no coincide con la tarifa registrada." };
    }

    const parseDay = (date: string) => new Date(`${date}T12:00:00Z`);
    const calc = (unit: string, start: string, end: string) => {
      const a = parseDay(start), b = parseDay(end);
      if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) ||
        a.toISOString().slice(0, 10) !== start || b.toISOString().slice(0, 10) !== end || b < a) return null;
      if (unit === "DAY") return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
      if (unit === "MONTH") {
        let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
        const anniversary = (offset: number) => {
          const year = a.getUTCFullYear() + Math.floor((a.getUTCMonth() + offset) / 12);
          const month = (a.getUTCMonth() + offset) % 12;
          const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
          return Date.UTC(year, month, Math.min(a.getUTCDate(), last));
        };
        if (anniversary(months) > b.getTime() + 86400000) months--;
        return Math.max(1, months + (anniversary(months) < b.getTime() + 86400000 ? 1 : 0));
      }
      return null;
    };
    const parseTime = (time: string) => new Date(`1970-01-01T${time}:00.000Z`);
    for (const line of v.items) {
      if (line.unit === "HOUR") {
        if (!line.serviceStart || !line.serviceEnd || !line.startTime || !line.endTime)
          return { ok: false, message: "Completa las fechas y horas del servicio." };
        const start = new Date(`${line.serviceStart}T${line.startTime}:00.000Z`);
        const end = new Date(`${line.serviceEnd}T${line.endTime}:00.000Z`);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
          return { ok: false, message: "La fecha y hora de fin deben ser posteriores al inicio." };
        const hours = Math.ceil((end.getTime() - start.getTime()) / 3600000);
        if (hours !== line.quantity)
          return { ok: false, message: "La cantidad de horas no coincide con el horario seleccionado." };
      }
    }
    for (const line of v.items) {
      if (line.unit === "DAY" || line.unit === "MONTH") {
        if (!line.serviceStart || !line.serviceEnd) return { ok: false, message: "Indica fechas de inicio y fin." };
        const qty = calc(line.unit, line.serviceStart, line.serviceEnd);
        if (qty === null || qty !== line.quantity) return { ok: false, message: "La cantidad no coincide con las fechas del servicio." };
      }
    }

    const rows = v.items.map((line, index) => {
      const gross = money(new Prisma.Decimal(line.quantity).mul(line.unitPrice));
      const discount = money(line.discountAmount);
      if (discount.gt(gross)) throw new Error(`El descuento de la línea ${index + 1} supera su importe.`);
      return {
        companyId, position: index + 1, description: line.description,
        serviceId: line.serviceId || null, vehicleTypeId: line.vehicleTypeId || null,
        serviceRateId: line.serviceRateId || null, unit: line.unit,
        quantity: line.quantity, unitPrice: money(line.unitPrice),
        serviceStart: line.serviceStart ? parseDay(line.serviceStart) : null,
        serviceEnd: line.serviceEnd ? parseDay(line.serviceEnd) : null,
        startTime: line.unit === "HOUR" && line.startTime ? parseTime(line.startTime) : null,
        endTime: line.unit === "HOUR" && line.endTime ? parseTime(line.endTime) : null,
        discountAmount: discount, lineTotal: gross.minus(discount),
      };
    });
    const base = rows.reduce((sum, row) => sum.plus(row.lineTotal), new Prisma.Decimal(0));
    const effectiveTaxRate = existing ? Number(existing.taxRate) : Number(settings?.defaultTaxRate ?? 18);
    const effectiveTaxIncluded = existing ? existing.taxIncluded : false;
    const tax = new Prisma.Decimal(effectiveTaxRate).div(100);
    const subtotal = effectiveTaxIncluded ? money(base.div(new Prisma.Decimal(1).plus(tax))) : money(base);
    const taxAmount = effectiveTaxIncluded ? money(base.minus(subtotal)) : money(subtotal.mul(tax));
    const total = effectiveTaxIncluded ? money(base) : money(subtotal.plus(taxAmount));
    const expiryDate = new Date(`${v.expiryDate}T12:00:00Z`);
    if (Number.isNaN(expiryDate.getTime()) || expiryDate.toISOString().slice(0, 10) !== v.expiryDate) {
      return { ok: false, message: "Fecha de vencimiento inválida." };
    }
    const payload = {
      clientId: v.clientId, clientName: client.legalName,
      clientDocument: client.documentNumber, clientAddress: client.address,
      currency: v.currency, taxRate: effectiveTaxRate, taxIncluded: effectiveTaxIncluded,
      expiryDate, notes: v.notes, terms: v.terms, subtotal, taxAmount, total,
    };
    let quoteId: string | null = id;
    await prisma.$transaction(async (tx) => {
      if (id) {
        const current = await tx.quotation.findFirst({ where: { id, companyId }, select: { status: true } });
        if (!current || current.status !== "DRAFT") throw new Error("Solo se pueden editar cotizaciones en borrador.");
        await tx.quotation.update({ where: { id, companyId }, data: payload });
        await tx.quotationItem.deleteMany({ where: { quotationId: id, companyId } });
        await tx.quotationItem.createMany({ data: rows.map((row) => ({ ...row, quotationId: id })) });
      } else {
        const year = new Date().getUTCFullYear();
        const seq = await tx.quotationSequence.upsert({
          where: { companyId_year: { companyId, year } },
          create: { companyId, year, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        const prefix = (settings?.quotationPrefix || "CT").trim().toUpperCase();
        const code = `${prefix}-${year}-${String(seq.lastNumber).padStart(5, "0")}`;
        const quote = await tx.quotation.create({
          data: {
            ...payload, companyId, createdById: session.user.id!, year,
            number: seq.lastNumber, code,
            statusHistory: { create: { changedById: session.user.id!, toStatus: "DRAFT", note: "Cotización creada" } },
          },
        });
        quoteId = quote.id;
        await tx.quotationItem.createMany({ data: rows.map((row) => ({ ...row, quotationId: quote.id })) });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/cotizaciones");
    revalidatePath("/dashboard");
    return { ok: true, message: "Cotización guardada correctamente.", id: quoteId };
  } catch (error) {
    console.error("saveQuotation", error);
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Datos inválidos." :
      error instanceof Error && (error.message.includes("borrador") || error.message.includes("descuento")) ? error.message :
        "No se pudo guardar la cotización. Comprueba los datos.";
    return { ok: false, message };
  }
}

export async function changeQuotationStatus(id: string, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED") {
  try {
    const { session, membership } = await requireSessionCompany(undefined, ["OWNER", "ADMIN", "SALES"]);
    const companyId = membership.companyId;
    const current = await prisma.quotation.findFirst({ where: { id, companyId }, select: { status: true } });
    if (!current) return { ok: false, message: "Cotización no encontrada." };
    const allowed: Record<string, string[]> = { DRAFT: ["SENT", "CANCELLED"], SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"], ACCEPTED: [], REJECTED: [], EXPIRED: [], CANCELLED: [] };
    if (!allowed[current.status].includes(status)) return { ok: false, message: "Cambio de estado no permitido." };
    await prisma.$transaction(async (tx) => {
      const updated = await tx.quotation.updateMany({ where: { id, companyId, status: current.status }, data: { status, ...(status === "SENT" ? { issuedAt: new Date() } : {}) } });
      if (updated.count !== 1) throw new Error("Estado modificado por otra solicitud");
      await tx.quotationStatusHistory.create({ data: { quotationId: id, changedById: session.user.id!, fromStatus: current.status, toStatus: status } });
    });
    revalidatePath("/cotizaciones"); revalidatePath("/dashboard");
    return { ok: true, message: "Estado actualizado." };
  } catch { return { ok: false, message: "No se pudo cambiar el estado." }; }
}

export async function deleteDraft(id: string) {
  try {
    const { membership } = await requireSessionCompany(undefined, ["OWNER", "ADMIN"]);
    const companyId = membership.companyId;
    const result = await prisma.quotation.deleteMany({ where: { id, companyId, status: "DRAFT" } });
    if (!result.count) return { ok: false, message: "Solo puedes eliminar borradores de tu empresa." };
    revalidatePath("/cotizaciones"); revalidatePath("/dashboard");
    return { ok: true, message: "Borrador eliminado." };
  } catch { return { ok: false, message: "No se pudo eliminar." }; }
}


/** Envía el PDF como adjunto con Resend; no requiere exponer una URL pública. */
export async function sendQuotationEmail(id: string, recipient: string) {
  try {
    const { session, membership } = await requireSessionCompany(undefined, ["OWNER", "ADMIN", "SALES"]);
    const email = z.email().max(200).safeParse(recipient.trim());
    if (!email.success) return { ok: false, message: "Ingresa un correo electrónico válido." };
    if (!process.env.RESEND_API_KEY || !process.env.QUOTATION_FROM_EMAIL)
      return { ok: false, message: "Configura RESEND_API_KEY y QUOTATION_FROM_EMAIL en el servidor." };

    const quote = await prisma.quotation.findFirst({
      where: { id, companyId: membership.companyId, status: "DRAFT" },
      include: {
        company: { include: { bankAccounts: { where: { isActive: true } } } },
        items: { orderBy: { position: "asc" } },
      },
    });
    if (!quote) return { ok: false, message: "Solo puedes enviar cotizaciones en borrador de tu empresa." };
    if (!quote.verificationToken) return { ok: false, message: "Falta el token de verificación del PDF." };

    const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!base || !/^https:\/\//.test(base) && process.env.NODE_ENV === "production")
      return { ok: false, message: "Configura APP_URL con la dirección HTTPS de tu sistema." };
    const { createQuotationPdf } = await import("@/lib/quotation-pdf");
    const verificationUrl = new URL(`/verificar/${quote.verificationToken}`, base || "http://localhost:3000").toString();
    const pdf = await createQuotationPdf(quote, verificationUrl);

    // La API acepta el mensaje para entrega; esto no garantiza lectura ni recepción final.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cotizacion-${quote.id}-primer-envio`,
      },
      body: JSON.stringify({
        from: process.env.QUOTATION_FROM_EMAIL,
        to: [email.data],
        subject: `Cotización ${quote.code} - ${quote.company.tradeName || quote.company.legalName}`,
        text: `Hola,\n\nAdjuntamos la cotización ${quote.code} en formato PDF.\n\nSaludos,\n${quote.company.tradeName || quote.company.legalName}`,
        attachments: [{ filename: `cotizacion-${quote.code.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`, content: pdf.toString("base64") }],
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Resend rechazó el envío", response.status, await response.text());
      return { ok: false, message: "El proveedor de correo no aceptó el envío. Revisa la configuración y los registros del servidor." };
    }
    // Si otra petición cambió el estado mientras se enviaba, no sobrescribirlo.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.quotation.updateMany({
        where: { id, companyId: membership.companyId, status: "DRAFT" },
        data: { status: "SENT", issuedAt: new Date() },
      });
      if (result.count === 1) {
        await tx.quotationStatusHistory.create({
          data: { quotationId: id, changedById: session.user.id!, fromStatus: "DRAFT", toStatus: "SENT", note: `Correo aceptado por proveedor para ${email.data}` },
        });
      }
      return result.count;
    });
    revalidatePath("/cotizaciones"); revalidatePath("/dashboard");
    return updated === 1
      ? { ok: true, message: `El proveedor aceptó el correo dirigido a ${email.data}. Cotización marcada como enviada.` }
      : { ok: false, message: "El correo fue aceptado, pero el estado cambió simultáneamente. Revisa la cotización." };
  } catch (error) {
    console.error("Error al enviar cotización", error);
    return { ok: false, message: "No se pudo completar el envío. Comprueba el correo antes de reintentar para evitar duplicados." };
  }
}


/**
 * Genera un enlace público y seguro para que el cliente
 * revise, acepte o rechace una cotización.
 *
 * Cada enlace nuevo invalida el anterior.
 */
export async function createQuotationReviewLink(
  quotationId: string
): Promise<{
  ok: boolean;
  message: string;
  url?: string;
}> {
  try {
    const { membership } = await requireSessionCompany(
      undefined,
      ["OWNER", "ADMIN", "SALES"]
    );

    const parsedId = z.uuid().safeParse(quotationId);

    if (!parsedId.success) {
      return {
        ok: false,
        message: "Identificador de cotización inválido.",
      };
    }

    const companyId = membership.companyId;

    const quote = await prisma.quotation.findFirst({
      where: {
        id: parsedId.data,
        companyId,
        status: { in: ["DRAFT", "SENT"] },
      },
      select: {
        id: true,
        expiryDate: true,
      },
    });

    if (!quote) {
      return {
        ok: false,
        message: "Cotización no encontrada o no disponible para compartir.",
      };
    }

    // Comparar fechas calendario en UTC.
    const today = new Date().toISOString().slice(0, 10);
    const expiryDay = quote.expiryDate.toISOString().slice(0, 10);

    if (expiryDay < today) {
      return {
        ok: false,
        message: "La cotización está vencida.",
      };
    }

    const baseUrl =
      process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      return {
        ok: false,
        message: "Configura APP_URL en el archivo .env.",
      };
    }

    const origin = new URL(baseUrl);

    if (
      !["http:", "https:"].includes(origin.protocol) ||
      (process.env.NODE_ENV === "production" &&
        origin.protocol !== "https:")
    ) {
      return {
        ok: false,
        message: "La URL pública debe utilizar HTTPS en producción.",
      };
    }

    // Token aleatorio de 256 bits.
    const token = randomBytes(32).toString("hex");

    // Guardamos únicamente su hash en PostgreSQL.
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    // Válido como máximo 7 días, sin superar el vencimiento.
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const expiryEnd = Date.parse(`${expiryDay}T23:59:59.999Z`);

    const expiresAt = new Date(Math.min(sevenDays, expiryEnd));

    if (expiresAt.getTime() <= Date.now()) {
      return {
        ok: false,
        message: "La cotización ya no tiene vigencia para generar el enlace.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Bloquea la fila de la cotización mientras se crea el enlace.
      // Evita generar enlaces para estados que cambiaron.
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM quotations
        WHERE id = ${quote.id}::uuid
          AND company_id = ${companyId}::uuid
          AND status IN ('DRAFT', 'SENT')
        FOR UPDATE
      `;

      if (rows.length !== 1) {
        throw new Error("La cotización cambió de estado.");
      }

      await tx.quotationReview.upsert({
        where: {
          quotationId: quote.id,
        },
        create: {
          quotationId: quote.id,
          tokenHash,
          expiresAt,
        },
        update: {
          tokenHash,
          expiresAt,
          respondedAt: null,
          observation: null,
        },
      });
    });

    const url = new URL(
      `/cotizacion/revisar/${token}`,
      origin
    ).toString();

    return {
      ok: true,
      message: "Enlace generado correctamente.",
      url,
    };
  } catch (error) {
    console.error("createQuotationReviewLink:", error);

    return {
      ok: false,
      message: "No se pudo generar el enlace de revisión.",
    };
  }
}
