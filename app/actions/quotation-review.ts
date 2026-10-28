'use server';

import { prisma } from '@/lib/prisma'; // Ajusta este import a tu cliente Prisma existente.
import { hashReviewToken } from '@/lib/quotation-review';

export async function respondToQuotation(token: string, decision: 'ACCEPTED' | 'REJECTED', observation: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return { ok: false, message: 'Enlace inválido.' };
  const comment = observation.trim();
  if (comment.length > 2000) return { ok: false, message: 'La observación supera 2000 caracteres.' };
  if (decision === 'REJECTED' && !comment) return { ok: false, message: 'Indica el motivo del rechazo.' };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.quotationReview.findUnique({
        where: { tokenHash: hashReviewToken(token) },
        include: { quotation: { select: { status: true, expiryDate: true } } },
      });
      if (!review || review.respondedAt || review.expiresAt <= new Date() || review.quotation.expiryDate < new Date() || review.quotation.status !== 'SENT') return false;
      // Actualización condicional: evita respuestas simultáneas con el mismo enlace.
      const claimed = await tx.quotationReview.updateMany({
        where: { id: review.id, respondedAt: null, expiresAt: { gt: new Date() } },
        data: { respondedAt: new Date(), observation: comment || null },
      });
      if (claimed.count !== 1) return false;
      const updated = await tx.quotation.updateMany({ where: { id: review.quotationId, status: 'SENT' }, data: { status: decision } });
      if (updated.count !== 1) throw new Error('La cotización cambió de estado');
      return true;
    });
    return result ? { ok: true, message: decision === 'ACCEPTED' ? 'Cotización aceptada correctamente.' : 'Respuesta registrada correctamente.' } : { ok: false, message: 'El enlace venció o la cotización ya fue respondida.' };
  } catch {
    return { ok: false, message: 'No se pudo registrar la respuesta. Inténtalo nuevamente.' };
  }
}
