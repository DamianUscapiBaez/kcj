import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";

export const hashReviewToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createQuotationReviewLink(quotationId: string) {
  const { membership } = await requireSessionCompany(undefined, ["ADMIN", "SALES"]);
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !/^https?:\/\//.test(base)) throw new Error("Configura APP_URL");
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashReviewToken(token);
  await prisma.$transaction(async (tx) => {
    const quote = await tx.quotation.findFirst({
      where: { id: quotationId, companyId: membership.companyId },
      select: { status: true, expiryDate: true },
    });
    if (!quote || !["DRAFT", "SENT"].includes(quote.status))
      throw new Error("Cotización no disponible para envío");
    if (quote.expiryDate && quote.expiryDate < new Date(new Date().toISOString().slice(0,10)))
      throw new Error("La cotización está vencida");
    await tx.quotationReview.upsert({
      where: { quotationId },
      create: { quotationId, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) },
      update: { tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000), respondedAt: null, observation: null },
    });
    if (quote.status === "DRAFT")
      await tx.quotation.update({ where: { id: quotationId }, data: { status: "SENT", issuedAt: new Date() } });
  });
  return new URL(`/cotizacion/revisar/${token}`, base).toString();
}
