
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type VerifyPageProps = {
  params: Promise<{ token: string }>;
};

const STATUS_CONFIG = {
  DRAFT: {
    label: "Borrador",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  SENT: {
    label: "Enviada",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ACCEPTED: {
    label: "Aceptada",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Rechazada",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  EXPIRED: {
    label: "Vencida",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  CANCELLED: {
    label: "Anulada",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
} as const;

function formatDate(date: Date): string {
  const [year, month, day] = date
    .toISOString()
    .slice(0, 10)
    .split("-");

  return `${day}/${month}/${year}`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <div className="text-sm font-medium text-slate-800 sm:text-right">
        {children}
      </div>
    </div>
  );
}

async function Verification({
  params,
}: VerifyPageProps) {
  // Compatible con Next.js 16 y cacheComponents.
  // La consulta se ejecuta durante la petición.
  await connection();

  const { token } = await params;

  // El token del QR es un UUID.
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(token)) {
    notFound();
  }

  // Consulta únicamente los datos necesarios.
  const quote = await prisma.quotation.findUnique({
    where: {
      verificationToken: token,
    },
    select: {
      code: true,
      status: true,
      issueDate: true,
      expiryDate: true,
      currency: true,
      total: true,
      clientName: true,
      company: {
        select: {
          legalName: true,
          taxId: true,
          isActive: true,
        },
      },
    },
  });

  if (!quote || !quote.company.isActive) {
    notFound();
  }

  const currentStatus = STATUS_CONFIG[quote.status];

  const isDraft = quote.status === "DRAFT";
  const isIssued = !isDraft;

  const currencySymbol =
    quote.currency === "PEN" ? "S/" : "US$";

  const formattedTotal = Number(quote.total).toLocaleString(
    "es-PE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

  // Indica vencimiento por fecha sin modificar el
  // estado persistido en la base de datos.
  const today = new Date().toISOString().slice(0, 10);

  const isPastExpiry =
    quote.expiryDate.toISOString().slice(0, 10) < today;

  const isExpired =
    isPastExpiry &&
    (quote.status === "DRAFT" || quote.status === "SENT");

  const displayStatus = isExpired
    ? STATUS_CONFIG.EXPIRED
    : currentStatus;

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-10">
      {/* ENCABEZADO */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${isIssued
              ? "border-emerald-100 bg-emerald-50 text-emerald-600"
              : "border-amber-100 bg-amber-50 text-amber-600"
            }`}
        >
          {isIssued ? (
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ) : (
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          )}
        </div>

        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wider ${isIssued
                ? "text-emerald-600"
                : "text-amber-600"
              }`}
          >
            {isIssued
              ? "Registro encontrado"
              : "Documento en preparación"}
          </p>

          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {isIssued
              ? "Verificación de cotización"
              : "Cotización en borrador"}
          </h1>
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <p className="mt-5 text-sm leading-relaxed text-slate-600">
        {isDraft
          ? "Esta cotización está registrada como borrador y todavía no ha sido emitida. Su contenido puede cambiar."
          : "El código de verificación corresponde a una cotización registrada en el sistema de la empresa emisora. Puedes consultar sus datos y estado actual."}
      </p>

      {/* DETALLES */}
      <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-2">
        <DetailRow label="Código de documento">
          <span className="font-mono text-base font-bold text-slate-900">
            {quote.code}
          </span>
        </DetailRow>

        <DetailRow label="Empresa emisora">
          {quote.company.legalName}
        </DetailRow>

        <DetailRow label="RUC emisor">
          <span className="font-mono">
            {quote.company.taxId}
          </span>
        </DetailRow>

        <DetailRow label="Cliente">
          {quote.clientName}
        </DetailRow>

        <DetailRow label="Estado actual">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${displayStatus.className}`}
          >
            {displayStatus.label}
          </span>
        </DetailRow>

        <DetailRow label="Fecha de cotización">
          {formatDate(quote.issueDate)}
        </DetailRow>

        <DetailRow label="Válida hasta">
          {formatDate(quote.expiryDate)}
        </DetailRow>

        <DetailRow label="Importe total">
          <span className="text-base font-bold text-slate-900">
            {currencySymbol} {formattedTotal}
          </span>
        </DetailRow>
      </div>

      {/* AVISO DE VENCIMIENTO */}
      {isExpired && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Esta cotización ha superado su fecha de vigencia.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            El documento continúa registrado, pero su plazo
            de validez ha finalizado.
          </p>
        </div>
      )}

      {/* INFORMACIÓN LEGAL */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <p className="text-xs leading-relaxed text-blue-900">
          Esta consulta permite verificar que la cotización
          existe en el sistema emisor y conocer su estado.
          No certifica su aceptación ni constituye una
          factura electrónica o comprobante de pago válido
          para efectos de la SUNAT.
        </p>
      </div>

      {/* PIE */}
      <div className="mt-7 border-t border-slate-100 pt-5 text-center">
        <p className="text-xs text-slate-400">
          Sistema de verificación de cotizaciones
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-700">
          SUMAQ ILLARY
        </p>
      </div>
    </div>
  );
}

function VerificationFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700">
          Verificando cotización...
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Consultando la información del documento
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage({
  params,
}: VerifyPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100/70 px-4 py-12">
      <Suspense fallback={<VerificationFallback />}>
        <Verification params={params} />
      </Suspense>
    </main>
  );
}
