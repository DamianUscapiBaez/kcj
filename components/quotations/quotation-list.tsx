"use client";
import { viewStyles } from "../ui/view-styles";
import { useState } from "react";
import { Plus, Search, X, FileText } from "lucide-react";
import QuotationActions from "./quotation-actions";
import type { Quote } from "./quotation-types";

interface QuotationListProps {
  quotes: Quote[];
  canEdit: boolean;
  onCreate: () => void;
  onEdit: (quote: Quote) => void;
  onCopyLink: (id: string) => void;
  onMarkSent: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function QuotationList({ quotes, canEdit, onCreate, onEdit, onCopyLink, onMarkSent, onAccept, onReject, onCancel, onDelete }: QuotationListProps) {
  const [search, setSearch] = useState("");
    const statusLabels: Record<string, string> = {
        DRAFT: "Borrador",
        SENT: "Enviada",
        ACCEPTED: "Aceptada",
        REJECTED: "Rechazada",
        EXPIRED: "Vencida",
        CANCELLED: "Anulada",
    };

    const filtered = quotes.filter((q) =>
        [q.code, q.clientName, statusLabels[q.status] ?? q.status].some((x) =>
            x.toLowerCase().includes(search.toLowerCase())
        )
    );

    const getStatusBadge = (statusKey: string) => {
        const config: Record<string, string> = {
            DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
            SENT: "bg-blue-50 text-blue-700 border-blue-200",
            ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
            REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
            CANCELLED: "bg-amber-50 text-amber-700 border-amber-200",
            EXPIRED: "bg-orange-50 text-orange-700 border-orange-200",
        };
        return config[statusKey] || "bg-slate-100 text-slate-600 border-slate-200";
    };

  return (
    <>
            {/* Cabecera Principal */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="eyebrow">VENTAS · DOCUMENTOS</p>
                    <h1 className="page-title text-2xl font-bold tracking-tight text-slate-900">
                        Cotizaciones
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Presupuestos, importes, estados y seguimiento comercial.
                    </p>
                </div>
                {canEdit && (
                    <button
                        className={viewStyles.primaryButton}
                        onClick={onCreate}
                    >
                        <Plus className="h-4 w-4" /> Nueva cotización
                    </button>
                )}
            </div>

            {/* Resumen comercial: indicadores de un vistazo */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: "Total cotizaciones", value: quotes.length, color: "text-slate-900", accent: "bg-slate-100" },
                    { label: "Borradores", value: quotes.filter(q => q.status === "DRAFT").length, color: "text-amber-700", accent: "bg-amber-50" },
                    { label: "Enviadas", value: quotes.filter(q => q.status === "SENT").length, color: "text-blue-700", accent: "bg-blue-50" },
                    { label: "Aceptadas", value: quotes.filter(q => q.status === "ACCEPTED").length, color: "text-emerald-700", accent: "bg-emerald-50" },
                ].map(card => (
                    <div key={card.label} className={viewStyles.metric}>
                        <span className="text-xs font-medium text-slate-500">{card.label}</span>
                        <div className="mt-2 flex items-center justify-between">
                            <span className={`text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</span>
                            <span className={`h-2.5 w-2.5 rounded-full ${card.accent}`} aria-hidden="true" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Contenedor de la Tabla */}
            <div className={viewStyles.panel}>
                {/* Barra de búsqueda y resultados */}
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* Buscador */}
                    <div className="relative w-full sm:max-w-md">
                        <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar cotizaciones..."
                            aria-label="Buscar cotizaciones"
                            className="
        w-full rounded-xl border border-slate-200
        bg-slate-50/70 py-2.5 pl-11 pr-10
        text-sm text-slate-800
        placeholder:text-slate-400
        outline-none transition-all duration-200
        hover:border-slate-300 hover:bg-white
        focus:border-blue-500 focus:bg-white
        focus:ring-4 focus:ring-blue-500/10
      "
                        />

                        {/* Limpiar búsqueda */}
                        {search.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                aria-label="Limpiar búsqueda"
                                className="
          absolute right-3 top-1/2 flex h-6 w-6
          -translate-y-1/2 items-center justify-center
          rounded-md text-slate-400
          transition-colors hover:bg-slate-200
          hover:text-slate-700
        "
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Contador de documentos */}
                    <div className="flex shrink-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <FileText className="h-4 w-4" />
                        </div>

                        <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold tabular-nums text-slate-900">
                                {filtered.length}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                                {filtered.length === 1
                                    ? "cotización encontrada"
                                    : "cotizaciones encontradas"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className={viewStyles.table}>
                        <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <tr>
                                {[
                                    "Código",
                                    "Cliente",
                                    "Emisión",
                                    "Vencimiento",
                                    "Estado",
                                    "Total",
                                    "Acciones",
                                ].map((x) => (
                                    <th key={x} className="px-6 py-3.5 font-semibold">
                                        {x}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filtered.map((q) => (
                                <tr
                                    key={q.id}
                                    className="hover:bg-slate-50/80 transition-colors"
                                >
                                    <td className="px-6 py-4 font-mono font-bold text-blue-700">
                                        {q.code}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {q.clientName}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {q.issueDate.slice(0, 10)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {q.expiryDate.slice(0, 10)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                                                q.status
                                            )}`}
                                        >
                                            {statusLabels[q.status] ?? q.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        {q.currency} {Number(q.total).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 whitespace-nowrap">

                                            <QuotationActions
                                                pdfUrl={`/api/cotizaciones/${q.id}/pdf`}

                                                onEdit={() => onEdit(q)}

                                                onCopyLink={() => onCopyLink(q.id)}

                                                onMarkSent={() => onMarkSent(q.id)}

                                                onAccept={() => onAccept(q.id)}

                                                onReject={() => onReject(q.id)}

                                                onCancel={() => onCancel(q.id)}

                                                onDelete={() => onDelete(q.id)}

                                                canEdit={canEdit && q.status === "DRAFT"}

                                                canCopyLink={
                                                    canEdit && ["DRAFT", "SENT"].includes(q.status)
                                                }

                                                canMarkSent={canEdit && q.status === "DRAFT"}

                                                canAccept={canEdit && q.status === "SENT"}

                                                canReject={canEdit && q.status === "SENT"}

                                                canCancel={
                                                    canEdit && ["DRAFT", "SENT"].includes(q.status)
                                                }

                                                canDelete={canEdit && q.status === "DRAFT"}
                                            />

                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!filtered.length && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        No hay cotizaciones registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

    </>
  );
}
