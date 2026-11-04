
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashReviewToken } from "@/lib/quotation-review";
import ReviewForm from "./review-form";

type ReviewPageProps = {
  params: Promise<{ token: string }>;
};

function ReviewLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">
          Cargando cotización...
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Estamos verificando la información de tu cotización.
        </p>
      </div>
    </main>
  );
}

async function ReviewContent({ params }: ReviewPageProps) {
  const { token } = await params;

  // Validar el formato del token.
  if (!/^[a-f0-9]{64}$/.test(token)) {
    notFound();
  }

  // Consultar la cotización desde PostgreSQL.
  const review = await prisma.quotationReview.findUnique({
    where: {
      tokenHash: hashReviewToken(token),
    },
    select: {
      expiresAt: true,
      respondedAt: true,
      quotation: {
        select: {
          code: true,
          status: true,
          issueDate: true,
          expiryDate: true,
          currency: true,
          total: true,
          clientName: true,
          terms: true,
          company: {
            select: {
              legalName: true,
              isActive: true,
            },
          },
          items: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
            },
          },
        },
      },
    },
  });

  // Evitar mostrar cotizaciones inexistentes o empresas inactivas.
  if (!review || !review.quotation.company.isActive) {
    notFound();
  }

  const quote = review.quotation;

  // Comprobar vencimiento del enlace y de la cotización.
  const now = new Date();

  const todayUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  const expired =
    review.expiresAt <= now ||
    (quote.expiryDate !== null && quote.expiryDate < todayUTC);

  // Solo permitir responder cotizaciones enviadas y vigentes.
  const canRespond =
    !expired &&
    review.respondedAt === null &&
    quote.status === "SENT";

  const formatMoney = (value: { toString(): string }) => {
    return Number(value.toString()).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Encabezado */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">
            {quote.company.legalName}
          </p>

          <h1 className="text-2xl font-bold tracking-tight">
            Cotización {quote.code}
          </h1>

          <p className="text-sm text-slate-600">
            Cliente: {quote.clientName}
          </p>

          <p className="text-sm text-slate-600">
            Estado: {quote.status}
          </p>
        </div>

        {/* Detalle de la cotización */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  Descripción
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Precio unitario
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {quote.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-4 py-3">
                    {item.description}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.quantity.toString()}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {formatMoney(item.unitPrice)}
                  </td>

                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end border-t border-slate-200 pt-5">
          <div className="text-right">
            <p className="text-sm text-slate-500">
              Importe total
            </p>

            <p className="mt-1 text-2xl font-bold">
              {quote.currency} {formatMoney(quote.total)}
            </p>
          </div>
        </div>

        {/* Condiciones */}
        {quote.terms && (
          <div className="rounded-xl bg-slate-50 p-5">
            <h2 className="mb-2 font-semibold">
              Condiciones comerciales
            </h2>

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {quote.terms}
            </p>
          </div>
        )}

        {/* Formulario de respuesta */}
        {canRespond ? (
          <ReviewForm token={token} />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Este enlace ya no admite respuestas.
            </p>

            <p className="mt-1 text-sm text-amber-800">
              La cotización puede haber vencido, haber recibido
              una respuesta o haber cambiado de estado.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

// La consulta dinámica queda dentro de Suspense.
export default function ReviewPage({
  params,
}: ReviewPageProps) {
  return (
    <Suspense fallback={<ReviewLoading />}>
      <ReviewContent params={params} />
    </Suspense>
  );
}
