"use server";
import { createQuotationReviewLink } from "@/lib/quotation-review";
import { revalidatePath } from "next/cache";
export async function generateReviewLink(quotationId: string) {
  try {
    const url = await createQuotationReviewLink(quotationId);
    revalidatePath("/cotizaciones");
    return { ok: true, url, message: "Enlace generado" };
  } catch (error) {
    console.error(error);
    return { ok: false, url: null, message: "No se pudo generar el enlace" };
  }
}
