import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Prisma } from "@/app/generated/prisma/client";

type Quote = Prisma.QuotationGetPayload<{
  include: { company: { include: { bankAccounts: true } }; items: true };
}>;

type PDF = PDFKit.PDFDocument;
const C = {
  navy: "#14253F", navy2: "#223B5C", gold: "#BD9455", ink: "#1E293B",
  muted: "#64748B", line: "#DFE6EF", soft: "#F4F7FB", white: "#FFFFFF",
  green: "#157347", red: "#B42318", blue: "#2563EB",
};
const W = 595.28, H = 841.89, L = 43, R = 552, CW = R - L;
const TOP = 144, BOTTOM = 745;
const safe = (v: unknown) => String(v ?? "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ").trim();
const money = (v: { toString(): string } | number, currency: string) =>
  `${currency === "PEN" ? "S/" : "US$"} ${Number(v.toString()).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const number = (v: { toString(): string }) => Number(v.toString()).toLocaleString("es-PE", { maximumFractionDigits: 2 });
const date = (v: Date | null | undefined) => v ? new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(v) : "—";
const time = (v: Date | null | undefined) => v ? new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false }).format(v) : "";
const statusText: Record<string, string> = { DRAFT: "BORRADOR", SENT: "ENVIADA", ACCEPTED: "ACEPTADA", REJECTED: "RECHAZADA", EXPIRED: "VENCIDA", CANCELLED: "ANULADA" };
const unitText: Record<string, string> = { DAY: "día(s)", TRIP: "viaje(s)", SERVICE: "servicio(s)", MONTH: "mes(es)" };

export async function createQuotationPdf(quote: Quote, verificationUrl: string): Promise<Buffer> {
  const qr = await QRCode.toBuffer(verificationUrl, { type: "png", width: 320, margin: 1, errorCorrectionLevel: "M" });
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 38, bottom: 42, left: L, right: W - R }, bufferPages: true,
      info: { Title: `Cotización ${quote.code}`, Author: safe(quote.company.legalName), Subject: "Propuesta comercial de servicios" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const label = (txt: string, x: number, y: number, width = 200) => doc.font("Helvetica-Bold").fontSize(7.4).fillColor(C.muted).text(txt.toUpperCase(), x, y, { width, lineBreak: false });
    const val = (txt: string, x: number, y: number, width: number, size = 9.1, color = C.ink) => doc.font("Helvetica").fontSize(size).fillColor(color).text(safe(txt) || "—", x, y, { width, lineGap: 2 });
    const rule = (y: number) => doc.moveTo(L, y).lineTo(R, y).lineWidth(0.7).strokeColor(C.line).stroke();
    const header = () => {
      doc.rect(0, 0, W, 9).fill(C.navy);
      doc.rect(L, 35, 4, 55).fill(C.gold);
      const brand = safe(quote.company.tradeName || quote.company.legalName);
      doc.font("Helvetica-Bold").fontSize(17).fillColor(C.navy).text(brand, L + 13, 34, { width: 300, height: 27, ellipsis: true });
      doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(safe(quote.company.legalName), L + 13, 60, { width: 305, height: 12, ellipsis: true });
      doc.text(`RUC ${safe(quote.company.taxId)}`, L + 13, 74, { width: 300 });
      doc.font("Helvetica-Bold").fontSize(19).fillColor(C.navy).text("COTIZACIÓN", 355, 32, { width: 197, align: "right" });
      doc.font("Helvetica-Bold").fontSize(11).fillColor(C.gold).text(safe(quote.code), 355, 59, { width: 197, align: "right" });
      const state = statusText[quote.status] ?? quote.status;
      doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(`Estado: ${state}`, 355, 78, { width: 197, align: "right" });
      rule(103);
      const info = [quote.company.address, [quote.company.phone, quote.company.email].filter(Boolean).join("   |   ")].filter(Boolean).map(safe).join("   ·   ");
      doc.font("Helvetica").fontSize(7.4).fillColor(C.muted).text(info, L, 112, { width: CW, height: 22, ellipsis: true });
    };
    const newPage = () => { doc.addPage(); header(); return TOP; };
    const ensure = (y: number, height: number) => y + height > BOTTOM ? newPage() : y;
    const section = (title: string, y: number) => {
      y = ensure(y, 34);
      doc.roundedRect(L, y, CW, 25, 4).fill(C.soft);
      doc.rect(L, y, 3, 25).fill(C.gold);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.navy).text(title.toUpperCase(), L + 12, y + 8, { width: CW - 24 });
      return y + 34;
    };
    const block = (title: string, content: string, y: number) => {
      if (!safe(content)) return y;
      y = section(title, y);
      doc.font("Helvetica").fontSize(9).fillColor(C.ink);
      // Split by lines so a long paragraph cannot overlap the footer.
      for (const paragraph of safe(content).split(/\n/)) {
        const words = paragraph.split(/\s+/);
        let line = "";
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (doc.widthOfString(candidate) > CW - 16 && line) {
            y = ensure(y, 14);
            doc.text(line, L + 8, y, { width: CW - 16, lineBreak: false });
            y += 14;
            line = word;
          } else line = candidate;
        }
        if (line) { y = ensure(y, 14); doc.text(line, L + 8, y, { width: CW - 16, lineBreak: false }); y += 14; }
        y += 4;
      }
      return y + 9;
    };
    const field = (title: string, value: string, x: number, y: number, width: number) => {
      label(title, x, y, width);
      doc.font("Helvetica").fontSize(9).fillColor(C.ink);
      const h = doc.heightOfString(safe(value) || "—", { width, lineGap: 2 });
      val(value, x, y + 13, width);
      return Math.max(31, h + 15);
    };

    header();
    let y = 147;
    y = section("Información de la propuesta", y);
    const firstH = Math.max(
      field("Cliente / razón social", quote.clientName, L + 8, y, 294),
      field("Documento", quote.clientDocument, 375, y, 166),
    );
    y += firstH + 7;
    const secondH = Math.max(
      field("Dirección", quote.clientAddress || "No especificada", L + 8, y, 294),
      field("Fecha de emisión", date(quote.issueDate), 375, y, 166),
    );
    y += secondH + 7;
    const thirdH = Math.max(
      field("Contacto", [quote.contactName, quote.contactEmail].filter(Boolean).join(" · ") || "No especificado", L + 8, y, 294),
      field("Válida hasta", date(quote.expiryDate), 375, y, 166),
    );
    y += thirdH + 9;

    y = section("Detalle de los servicios", y + 5);
    const fx = Number(quote.exchangeRate.toString());
    const inCurrency = (value: { toString(): string } | number, target: "PEN" | "USD") => {
      const amount = Number(value.toString());
      return money(quote.currency === target ? amount : target === "PEN" ? amount * fx : amount / fx, target);
    };
    const tableHead = () => {
      doc.roundedRect(L, y, CW, 28, 4).fill(C.navy);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.white);
      doc.text("SERVICIO / DESCRIPCIÓN", L + 10, y + 9, { width: 228 });
      doc.text("CANTIDAD", 285, y + 9, { width: 45, align: "right" });
      doc.text("C.U. ($)", 333, y + 9, { width: 64, align: "right" });
      doc.text("SIN IGV ($)", 400, y + 9, { width: 70, align: "right" });
      doc.text("SIN IGV (S/)", 475, y + 9, { width: 66, align: "right" });
      y += 34;
    };
    y = ensure(y, 70); tableHead();
    const items = [...quote.items].sort((a, b) => a.position - b.position);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const details = [
        item.serviceStart || item.serviceEnd ? `Fechas: ${date(item.serviceStart)}${item.serviceEnd ? ` al ${date(item.serviceEnd)}` : ""}` : "",
        `Unidad: ${unitText[item.unit] ?? item.unit}`,
        Number(item.discountAmount.toString()) > 0 ? `Descuento: ${money(item.discountAmount, quote.currency)}` : "",
      ].filter(Boolean);
      const desc = safe(item.description) || "Servicio";
      doc.font("Helvetica-Bold").fontSize(9);
      const descH = doc.heightOfString(desc, { width: 220, lineGap: 2 });
      doc.font("Helvetica").fontSize(7.7);
      const detailH = details.reduce((sum, t) => sum + doc.heightOfString(t, { width: 220 }), 0);
      const rowH = Math.max(46, 12 + descH + (details.length ? 5 + detailH : 0) + 9);
      if (y + rowH > BOTTOM) { y = newPage(); tableHead(); }
      if (i % 2 === 0) doc.rect(L, y, CW, rowH).fill(C.soft);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink).text(desc, L + 10, y + 9, { width: 220, lineGap: 2 });
      let dy = y + 11 + descH + 3;
      doc.font("Helvetica").fontSize(7.7).fillColor(C.muted);
      for (const d of details) { const h = doc.heightOfString(d, { width: 220 }); doc.text(d, L + 10, dy, { width: 220 }); dy += h; }
      doc.font("Helvetica").fontSize(8.5).fillColor(C.ink).text(number(item.quantity), 283, y + 11, { width: 47, align: "right" });
      doc.text(inCurrency(item.unitPrice, "USD"), 332, y + 11, { width: 65, align: "right" });
      doc.font("Helvetica-Bold").fontSize(7.7).text(inCurrency(item.lineTotal, "USD"), 399, y + 11, { width: 71, align: "right" });
      doc.text(inCurrency(item.lineTotal, "PEN"), 473, y + 11, { width: 68, align: "right" });
      doc.moveTo(L, y + rowH).lineTo(R, y + rowH).strokeColor(C.line).lineWidth(0.5).stroke();
      y += rowH;
    }
    if (!items.length) { y = ensure(y, 32); val("Sin servicios registrados", L + 10, y + 4, CW - 20); y += 30; }

    y = ensure(y + 18, 120);
    doc.font("Helvetica").fontSize(8.4).fillColor(C.muted).text(`Tipo de cambio: S/ ${fx.toFixed(4)} por US$ 1. Importes de detalle sin IGV.`, L + 4, y + 4, { width: 230 });
    // El IGV se calcula una sola vez en la moneda contable y se convierte a la otra.
    // NO se grava dos veces ni se suma el IGV de PEN al total USD.
    const tx = 260;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.navy).text("CONCEPTO", tx, y, { width: 105 });
    doc.text("USD ($)", 370, y, { width: 82, align: "right" });
    doc.text("PEN (S/)", 458, y, { width: 88, align: "right" });
    y += 20;
    const totalRow = (title: string, amount: { toString(): string }, yy: number) => {
      doc.font("Helvetica").fontSize(8.4).fillColor(C.ink).text(title, tx, yy, { width: 105 });
      doc.text(inCurrency(amount, "USD"), 363, yy, { width: 90, align: "right" });
      doc.text(inCurrency(amount, "PEN"), 455, yy, { width: 91, align: "right" });
    };
    totalRow("Subtotal sin IGV", quote.subtotal, y); y += 22;
    totalRow(`IGV (${quote.taxRate.toString()}%)`, quote.taxAmount, y); y += 25;
    doc.roundedRect(tx - 6, y - 6, R - tx + 6, 42, 6).fill(C.navy);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white).text("TOTAL", tx + 4, y + 10, { width: 65 });
    doc.text(inCurrency(quote.total, "USD"), 352, y + 10, { width: 101, align: "right" });
    doc.text(inCurrency(quote.total, "PEN"), 454, y + 10, { width: 91, align: "right" });
    y += 52;
    if (quote.taxIncluded) { y = ensure(y, 17); doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text("El importe base incluye IGV; se desglosa el impuesto en el resumen.", L + 8, y); y += 18; }
    else { y = ensure(y, 17); doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text("Los precios unitarios y subtotales mostrados no incluyen IGV.", L + 8, y); y += 18; }

    y = block("Condiciones comerciales", quote.terms || "", y + 8);
    y = block("Condiciones de pago", quote.paymentTerms || "", y);
    y = block("Observaciones de la propuesta", quote.notes || "", y);

    const accounts = quote.company.bankAccounts.filter(a => a.isActive);
    if (accounts.length) {
      y = section("Datos bancarios para el pago", y + 5);
      for (const a of accounts) {
        const accountLines = [
          `${safe(a.bankName)} · ${a.currency}`,
          a.accountName ? `Titular: ${safe(a.accountName)}` : "",
          `Cuenta: ${safe(a.accountNumber)}`,
          a.cci ? `CCI: ${safe(a.cci)}` : "",
          a.isDetraction ? "Cuenta de detracciones" : "",
        ].filter(Boolean);
        const ah = accountLines.length * 13 + 15;
        y = ensure(y, ah);
        doc.roundedRect(L + 4, y, CW - 8, ah - 5, 5).fill(C.soft);
        for (let j = 0; j < accountLines.length; j++) {
          doc.font(j === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(j === 0 ? 9 : 8.2)
            .fillColor(j === 0 ? C.navy : C.ink).text(accountLines[j], L + 14, y + 8 + j * 13, { width: CW - 30 });
        }
        y += ah + 5;
      }
    }

    // The QR is for authenticity verification, not for client acceptance.
    y = ensure(y + 13, 118);
    doc.roundedRect(L, y, CW, 107, 6).lineWidth(0.8).strokeColor(C.line).stroke();
    doc.image(qr, L + 12, y + 10, { width: 87, height: 87 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.navy).text("VERIFICACIÓN DIGITAL", L + 112, y + 18, { width: 365 });
    doc.font("Helvetica").fontSize(8.2).fillColor(C.muted)
      .text("Escanea el código QR para verificar la autenticidad y consultar el estado actual de esta cotización.", L + 112, y + 37, { width: 365 });
    doc.fontSize(7.3).fillColor(C.blue).text(verificationUrl, L + 112, y + 68, { width: 365, link: verificationUrl, underline: true });

    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      rule(767);
      doc.font("Helvetica").fontSize(7.5).fillColor(C.muted)
        .text(`${safe(quote.code)}  ·  Propuesta comercial. No constituye comprobante de pago.`, L, 777, { width: 410, lineBreak: false });
      doc.text(`Página ${i - pages.start + 1} de ${pages.count}`, 454, 777, { width: 98, align: "right", lineBreak: false });
    }
    doc.end();
  });
}
