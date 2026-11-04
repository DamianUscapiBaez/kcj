import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMemberships } from "@/lib/permissions";
import { createQuotationPdf } from "@/lib/quotation-pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const memberships = await getActiveMemberships(session.user.id);
  if (!memberships.length) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  let quotation = await prisma.quotation.findFirst({
    where: { id, companyId: { in: memberships.map((m) => m.companyId) } },
    include: {
      company: { include: { bankAccounts: { where: { isActive: true } } } },
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  }

  // Cotizaciones antiguas: asignar token al generar el PDF, sin bloquear la descarga.
  if (!quotation.verificationToken) {
    try {
      const updated = await prisma.quotation.update({
        where: { id: quotation.id },
        data: { verificationToken: crypto.randomUUID() },
      });
      quotation = { ...quotation, verificationToken: updated.verificationToken };
    } catch (error) {
      console.error("No se pudo asignar token de verificación", error);
      return NextResponse.json({ error: "No se pudo habilitar la verificación de esta cotización. Comprueba la migración de verification_token." }, { status: 500 });
    }
  }

  // URL configurada: no confiar en cabeceras Host para construir QR.
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";

  if (!base || !/^https?:\/\//.test(base)) {
    return NextResponse.json(
      { error: "Configura APP_URL o verifica los headers del servidor para generar un QR válido" },
      { status: 500 }
    );
  }

  const verificationUrl = new URL(
    `/verificar/${quotation.verificationToken}`,
    base
  ).toString();

  try {
    const pdf = await createQuotationPdf(quotation, verificationUrl);
    const safeCode = quotation.code.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cotizacion-${safeCode}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error generando PDF", error);
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}