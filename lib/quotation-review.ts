import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma'; // Ajusta este import a tu cliente Prisma existente.

export const hashReviewToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createQuotationReviewLink(quotationId: string) {
  // Llamar solo desde una acción/ruta de administración AUTENTICADA y AUTORIZADA.
  const quote = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { status: true } });
  if (!quote || !['DRAFT', 'SENT'].includes(quote.status)) throw new Error('Cotización no disponible');
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashReviewToken(token);
  await prisma.$transaction(async (tx) => {
    await tx.quotationReview.upsert({
      where: { quotationId },
      create: { quotationId, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) },
      update: { tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000), respondedAt: null, observation: null },
    });
    if (quote.status === 'DRAFT') await tx.quotation.update({ where: { id: quotationId }, data: { status: 'SENT' } });
  });
  return `${process.env.APP_URL ?? 'http://localhost:3000'}/cotizacion/revisar/${token}`;
}
