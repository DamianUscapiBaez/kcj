"use server";
import { prisma } from "@/lib/prisma";
import { hashReviewToken } from "@/lib/quotation-review";
import { revalidatePath } from "next/cache";

export async function respondToQuotation(
  token: string, decision: "ACCEPTED" | "REJECTED", observation: string
) {
  if (!/^[a-f0-9]{64}$/.test(token) || !["ACCEPTED", "REJECTED"].includes(decision))
    return { ok: false, message: "Enlace o respuesta inválidos." };
  const note = observation.trim().slice(0, 2000);
  if (decision === "REJECTED" && !note)
    return { ok: false, message: "Indica el motivo del rechazo." };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.quotationReview.findUnique({
        where: { tokenHash: hashReviewToken(token) },
        include: { quotation: { select: { status: true, expiryDate: true } } },
      });
      if (!review || review.expiresAt <= new Date() || review.respondedAt || review.quotation.status !== "SENT")
        return false;
      if (review.quotation.expiryDate && review.quotation.expiryDate < new Date(new Date().toISOString().slice(0,10)))
        return false;
      const updated = await tx.quotationReview.updateMany({
        where: { id: review.id, respondedAt: null, expiresAt: { gt: new Date() } },
        data: { respondedAt: new Date(), observation: note || null },
      });
      if (updated.count !== 1) return false;
      const quote = await tx.quotation.updateMany({
        where: { id: review.quotationId, status: "SENT" },
        data: { status: decision },
      });
      if (quote.count !== 1) throw new Error("Estado de cotización modificado");
      // El historial público se conserva en QuotationReview.respondedAt/observation.
      return true;
    });
    if (!result) return { ok: false, message: "Enlace vencido, utilizado o cotización no disponible." };
    revalidatePath("/cotizaciones");
    return { ok: true, message: decision === "ACCEPTED" ? "Cotización aceptada." : "Cotización rechazada." };
  } catch (error) {
    console.error("Respuesta pública de cotización", error);
    return { ok: false, message: "No se pudo registrar la respuesta." };
  }
}
