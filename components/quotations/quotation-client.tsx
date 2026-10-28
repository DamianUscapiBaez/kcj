"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
    Plus,
    Search,
    Trash2,
    X,
    FileSpreadsheet,
    FileText,
    CalendarDays,
    Clock3,
    BadgeCheck,
    Calculator,
} from "lucide-react";
import {
    saveQuotation,
    changeQuotationStatus,
    deleteDraft,
    createQuotationReviewLink,
} from "@/app/actions/quotations";
import QuotationActions from "./quotation-actions";

type Option = { id: string; name: string; description?: string | null };
type RateOption = {
    id: string;
    name: string;
    serviceId: string;
    vehicleTypeId: string | null;
    unit: "HOUR" | "DAY" | "TRIP" | "SERVICE" | "MONTH";
    currency: "PEN" | "USD";
    price: number;
    validFrom: string | null;
    validUntil: string | null;
};
type CompanyDefaults = {
    defaultCurrency: "PEN" | "USD";
    defaultTaxRate: number;
    defaultValidityDays: number;
    defaultTerms: string;
};
type Quote = {
    id: string;
    code: string;
    clientName: string;
    status: string;
    currency: string;
    total: string;
    issueDate: string;
    expiryDate: string;
    notes: string | null;
    terms: string | null;
    taxRate: string;
    taxIncluded: boolean;
    clientId: string;
    items: {
        description: string;
        serviceId: string | null;
        vehicleTypeId: string | null;
        serviceRateId?: string | null;
        unit: string;
        quantity: string;
        unitPrice: string;
        discountAmount: string;
        serviceStart?: string | null;
        serviceEnd?: string | null;
        startTime?: string | null;
        endTime?: string | null;
    }[];
};
type Line = {
    description: string;
    serviceId: string;
    vehicleTypeId: string;
    serviceRateId: string;
    unit: "HOUR" | "DAY" | "TRIP" | "SERVICE" | "MONTH";
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    serviceStart: string;
    serviceEnd: string;
    startTime: string;
    endTime: string;
};

const empty = (): Line => ({
    description: "",
    serviceId: "",
    vehicleTypeId: "",
    serviceRateId: "",
    unit: "SERVICE",
    quantity: 1,
    unitPrice: 0,
    discountAmount: 0,
    serviceStart: "",
    serviceEnd: "",
    startTime: "",
    endTime: "",
});

export default function QuotationClient({
    quotes,
    clients,
    services,
    vehicles,
    rates,
    defaults,
    role,
}: {
    quotes: Quote[];
    clients: Option[];
    services: Option[];
    vehicles: Option[];
    rates: RateOption[];
    defaults: CompanyDefaults;
    role: string;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [clientId, setClientId] = useState("");
    const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");
    const [taxRate, setTaxRate] = useState(18);
    const [taxIncluded, setTaxIncluded] = useState(false);
    const [expiryDate, setExpiryDate] = useState("");
    const [notes, setNotes] = useState("");
    const [terms, setTerms] = useState("");
    const [items, setItems] = useState<Line[]>([empty()]);
    const [search, setSearch] = useState("");
    const [pending, start] = useTransition();

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [open]);
    const todayLocal = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const canEdit = role !== "VIEWER";

    function defaultExpiryDate() {
        const today = new Date();
        const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + defaults.defaultValidityDays));
        return date.toISOString().slice(0, 10);
    }

    function begin(q?: Quote) {
        setEditId(q?.id ?? null);
        setClientId(q?.clientId ?? clients[0]?.id ?? "");
        setCurrency(q ? (q.currency === "USD" ? "USD" : "PEN") : defaults.defaultCurrency);
        setTaxRate(q ? Number(q.taxRate) : defaults.defaultTaxRate);
        setTaxIncluded(q?.taxIncluded ?? false);
        setExpiryDate(q?.expiryDate.slice(0, 10) ?? defaultExpiryDate());
        setNotes(q?.notes ?? "");
        setTerms(q?.terms ?? defaults.defaultTerms);
        setItems(
            q?.items.map((x) => ({
                ...x,
                serviceId: x.serviceId ?? "",
                vehicleTypeId: x.vehicleTypeId ?? "",
                serviceRateId: x.serviceRateId ?? "",
                unit: x.unit as Line["unit"],
                quantity: Number(x.quantity),
                unitPrice: Number(x.unitPrice),
                discountAmount: Number(x.discountAmount),
                serviceStart: x.serviceStart?.slice(0, 10) ?? "",
                serviceEnd: x.serviceEnd?.slice(0, 10) ?? "",
                startTime: x.startTime ? (x.startTime.includes("T") ? x.startTime.slice(11, 16) : x.startTime.slice(0, 5)) : "",
                endTime: x.endTime ? (x.endTime.includes("T") ? x.endTime.slice(11, 16) : x.endTime.slice(0, 5)) : "",
            })) ?? [empty()]
        );
        setOpen(true);
    }

    function update(i: number, key: keyof Line, value: string) {
        setItems((xs) =>
            xs.map((x, j) =>
                i !== j
                    ? x
                    : {
                        ...x,
                        [key]: ["quantity", "unitPrice", "discountAmount"].includes(key)
                            ? Number(value)
                            : value,
                    }
            )
        );
    }

    // La moneda se elige para toda la cotización. No se convierten precios.
    function changeCurrency(nextCurrency: "PEN" | "USD") {
        setCurrency(nextCurrency);
        setItems(previous => previous.map(line => {
            if (!line.serviceId) return { ...line, serviceRateId: "", unitPrice: 0 };
            const matches = rates.filter(rate =>
                rate.serviceId === line.serviceId &&
                (rate.vehicleTypeId ?? "") === line.vehicleTypeId &&
                rate.unit === line.unit &&
                rate.currency === nextCurrency &&
                (!rate.validFrom || rate.validFrom <= todayLocal()) &&
                (!rate.validUntil || rate.validUntil >= todayLocal())
            );
            const selected = matches.length === 1 ? matches[0] : null;
            return { ...line, serviceRateId: selected?.id ?? "", unitPrice: selected?.price ?? 0 };
        }));
    }

    const rateUnitLabel: Record<Line["unit"], string> = {
        HOUR: "Por hora", DAY: "Por día", TRIP: "Por viaje",
        SERVICE: "Por servicio", MONTH: "Por mes",
    };

    const unitOptions: Line["unit"][] = ["HOUR", "DAY", "TRIP", "SERVICE", "MONTH"];

    // Las fechas son fechas calendario, no instantes con zona horaria.
    function dateParts(value: string) {
        const parts = value.split("-").map(Number);
        if (parts.length !== 3 || parts.some((x) => !Number.isInteger(x))) return null;
        const [y, m, d] = parts;
        const ms = Date.UTC(y, m - 1, d);
        if (new Date(ms).toISOString().slice(0, 10) !== value) return null;
        return { y, m, d, ms };
    }

    // Calcula la duración con fechas y horas locales de servicio, sin depender
    // de la zona horaria del navegador. Los turnos pueden cruzar medianoche.
    function calculateHours(from: string, startTime: string, to: string, endTime: string): number | null {
        const a = dateParts(from);
        const b = dateParts(to);
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!a || !b || !timePattern.test(startTime) || !timePattern.test(endTime)) return null;
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        const minutes = (b.ms - a.ms) / 60000 + (eh * 60 + em) - (sh * 60 + sm);
        if (minutes <= 0) return null;
        return Math.ceil(minutes / 60);
    }

    function followingDay(date: string): string {
        const parts = dateParts(date);
        if (!parts) return date;
        return new Date(parts.ms + 86400000).toISOString().slice(0, 10);
    }

    function quantityForLine(line: Line): number | null {
        if (line.unit === "HOUR") return calculateHours(line.serviceStart, line.startTime, line.serviceEnd, line.endTime);
        return calculateQuantity(line.unit, line.serviceStart, line.serviceEnd);
    }

    function calculateQuantity(unit: Line["unit"], from: string, to: string): number | null {
        const a = dateParts(from);
        const b = dateParts(to);
        if (!a || !b || b.ms < a.ms) return null;
        if (unit === "DAY") return Math.round((b.ms - a.ms) / 86400000) + 1;
        if (unit === "MONTH") {
            // Meses completos por aniversario; fracción adicional se cobra como mes completo.
            // El rango es inclusivo: 01/11 a 30/11 equivale a 1 mes.
            let months = (b.y - a.y) * 12 + b.m - a.m;
            const anniversary = (offset: number) => {
                const y = a.y + Math.floor((a.m - 1 + offset) / 12);
                const m = (a.m - 1 + offset) % 12;
                const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
                return Date.UTC(y, m, Math.min(a.d, lastDay));
            };
            if (anniversary(months) > b.ms + 86400000) months--;
            return Math.max(1, months + (anniversary(months) < b.ms + 86400000 ? 1 : 0));
        }
        return null;
    }

    function ratesFor(_index: number, serviceId: string, vehicleTypeId: string, unit: Line["unit"]) {
        const today = todayLocal();
        return rates.filter((r) =>
            r.serviceId === serviceId &&
            (r.vehicleTypeId ?? "") === vehicleTypeId &&
            r.unit === unit &&
            r.currency === currency &&
            (!r.validFrom || r.validFrom <= today) &&
            (!r.validUntil || r.validUntil >= today)
        );
    }

    function changeLineChoice(index: number, patch: Partial<Line>) {
        setItems((previous) => previous.map((line, i) => {
            if (i !== index) return line;
            const next = { ...line, ...patch };
            const matching = ratesFor(index, next.serviceId, next.vehicleTypeId, next.unit);
            const rate = matching.length === 1 ? matching[0] : null;
            const service = services.find((x) => x.id === next.serviceId);
            const vehicle = vehicles.find((x) => x.id === next.vehicleTypeId);
            const calculated = quantityForLine(next);
            return {
                ...next,
                serviceRateId: rate?.id ?? "",
                unitPrice: rate?.price ?? 0,
                description: [service?.name, vehicle?.name].filter(Boolean).join(" · "),
                quantity: calculated ?? (next.unit === "DAY" || next.unit === "MONTH" || next.unit === "HOUR" ? 1 : next.quantity),
            };
        }));
    }

    function selectRate(index: number, rateId: string) {
        const rate = rates.find((r) => r.id === rateId && r.currency === currency);
        if (!rate) return;
        setItems((previous) => previous.map((line, i) => i !== index ? line : ({
            ...line, serviceRateId: rate.id, unitPrice: rate.price,
        })));
    }

    function changeDates(index: number, field: "serviceStart" | "serviceEnd" | "startTime" | "endTime", value: string) {
        setItems((previous) => previous.map((line, i) => {
            if (i !== index) return line;
            const next = { ...line, [field]: value };

            // Si se escribe una hora final anterior (o igual) a la inicial
            // en el mismo día, el servicio se interpreta como turno nocturno.
            // Se modifica fecha y hora en una sola actualización de estado.
            if (field === "endTime" && next.unit === "HOUR" &&
                next.serviceStart && next.serviceEnd === next.serviceStart &&
                next.startTime && value && value <= next.startTime) {
                next.serviceEnd = followingDay(next.serviceStart);
            }

            const calculated = quantityForLine(next);
            return { ...next, quantity: calculated ?? 1 };
        }));
    }

    const gross = items.reduce(
        (s, i) => s + Math.max(0, i.quantity * i.unitPrice - i.discountAmount),
        0
    );
    const subtotal = taxIncluded ? gross / (1 + taxRate / 100) : gross;
    const total = taxIncluded ? gross : subtotal * (1 + taxRate / 100);

    function save(e: { preventDefault: () => void }) {
        e.preventDefault();
        if (!expiryDate || (!editId && expiryDate < todayLocal())) {
            void Swal.fire({ icon: "warning", title: "Vencimiento inválido", text: "Selecciona una fecha de vencimiento válida, desde hoy en adelante." });
            return;
        }
        if (items.some((line) => (["DAY", "MONTH", "HOUR"] as string[]).includes(line.unit) &&
            quantityForLine(line) === null)) {
            void Swal.fire({ icon: "warning", title: "Fechas u horas inválidas", text: "Indica fechas y horas de inicio y fin válidas. El fin debe ser posterior al inicio." });
            return;
        }
        if (items.some(line => {
            const rate = rates.find(r => r.id === line.serviceRateId);
            return rate && rate.currency !== currency;
        })) {
            void Swal.fire({ icon: "warning", title: "Monedas distintas", text: "Todos los servicios deben usar la moneda elegida para la cotización." });
            return;
        }
        if (items.some((line) => !line.serviceRateId)) {
            void Swal.fire({ icon: "warning", title: "Selecciona una tarifa", text: "Todas las líneas deben tener una tarifa registrada." });
            return;
        }
        if (items.some((line) => line.discountAmount > line.quantity * line.unitPrice)) {
            void Swal.fire({ icon: "warning", title: "Descuento inválido", text: "El descuento no puede superar el importe de la línea." });
            return;
        }
        start(async () => {
            const r = await saveQuotation(editId, {
                clientId,
                currency,
                taxRate,
                taxIncluded,
                expiryDate,
                notes,
                terms,
                items,
            });

            if (r.ok) {
                setOpen(false);
                router.refresh();
                Swal.fire({
                    icon: "success",
                    title: "¡Éxito!",
                    text: r.message,
                    timer: 2000,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Atención",
                    text: r.message,
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    // Copia un enlace generado en el servidor, con permisos y token seguro.
    async function copyReviewLink(id: string) {
        try {
            const result = await createQuotationReviewLink(id);
            if (!result.ok || !result.url) {
                throw new Error(result.message);
            }
            try {
                await navigator.clipboard.writeText(result.url);
                await Swal.fire({
                    icon: "success",
                    title: "Enlace copiado",
                    text: "Compártelo con tu cliente por WhatsApp o por el medio que prefieras.",
                    timer: 2200,
                    showConfirmButton: false,
                });
            } catch {
                await Swal.fire({
                    icon: "info",
                    title: "Copia el enlace",
                    input: "text",
                    inputValue: result.url,
                    inputAttributes: { readonly: "true" },
                    confirmButtonText: "Cerrar",
                });
            }
            router.refresh();
        } catch (error) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo generar el enlace",
                text: error instanceof Error ? error.message : "Inténtalo de nuevo.",
            });
        }
    }

    async function markSent(id: string) {
        const confirmation = await Swal.fire({
            title: "¿Marcar como enviada?",
            text: "Confirma que compartiste la cotización con el cliente.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, marcar enviada",
            cancelButtonText: "Volver",
        });
        if (!confirmation.isConfirmed) return;
        start(async () => {
            const result = await changeQuotationStatus(id, "SENT");
            if (result.ok) router.refresh();
            await Swal.fire({
                icon: result.ok ? "success" : "error",
                text: result.message,
                confirmButtonColor: "#2563eb",
            });
        });
    }

    async function decide(id: string, value: "ACCEPTED" | "REJECTED") {
        const label = value === "ACCEPTED" ? "aceptada" : "rechazada";
        const confirmation = await Swal.fire({
            title: `¿Marcar como ${label}?`,
            text: "Confirma que el cliente comunicó su decisión.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, confirmar",
            cancelButtonText: "Volver",
        });
        if (!confirmation.isConfirmed) return;
        start(async () => {
            const result = await changeQuotationStatus(id, value);
            if (result.ok) router.refresh();
            await Swal.fire({ icon: result.ok ? "success" : "error", text: result.message, confirmButtonColor: "#2563eb" });
        });
    }

    async function annul(id: string) {
        const result = await Swal.fire({
            title: "¿Anular cotización?",
            text: "La cotización quedará anulada y se conservará en el historial.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d97706",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Sí, anular",
            cancelButtonText: "Volver",
        });

        if (!result.isConfirmed) return;

        start(async () => {
            const r = await changeQuotationStatus(id, "CANCELLED");
            if (r.ok) {
                router.refresh();
                Swal.fire({
                    icon: "success",
                    title: "Actualizado",
                    text: r.message,
                    timer: 1800,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: r.message,
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    async function remove(id: string) {
        const result = await Swal.fire({
            title: "¿Eliminar borrador?",
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;

        start(async () => {
            const r = await deleteDraft(id);
            if (r.ok) {
                router.refresh();
                Swal.fire({
                    icon: "success",
                    title: "Eliminado",
                    text: r.message,
                    timer: 1800,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: r.message,
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

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
        <section className="space-y-6">
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
                        className="btn-primary flex items-center gap-2 shadow-sm hover:shadow"
                        onClick={() => begin()}
                    >
                        <Plus className="h-4 w-4" /> Nueva cotización
                    </button>
                )}
            </div>

            {/* Contenedor de la Tabla */}
            <div className="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                {/* Barra de búsqueda y resultados */}
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* Buscador */}
                    <div className="relative w-full sm:max-w-md">
                        <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
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
                    <table className="w-full text-left text-sm">
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

                                                onEdit={() => begin(q)}

                                                onCopyLink={() => copyReviewLink(q.id)}

                                                onMarkSent={() => markSent(q.id)}

                                                onAccept={() => decide(q.id, "ACCEPTED")}

                                                onReject={() => decide(q.id, "REJECTED")}

                                                onCancel={() => annul(q.id)}

                                                onDelete={() => remove(q.id)}

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

            {/* Modal de Creación / Edición */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[6px] sm:p-6">
                    <form
                        onSubmit={save}
                        className="flex h-[min(92dvh,920px)] w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_28px_90px_-25px_rgba(15,23,42,0.55)] sm:rounded-[28px]"
                    >
                        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-8 sm:py-5">
                            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                                {editId ? "Editar borrador de cotización" : "Nueva cotización"}
                            </h2>
                            <button
                                type="button"
                                className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Solo el contenido central tiene scroll. Cabecera y acciones siempre visibles. */}
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] sm:px-8 sm:py-6 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                            {/* Datos principales: cliente y vencimiento editable */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <FileText className="h-4 w-4 text-blue-600" /> Datos de la cotización
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Cliente
                                        <select required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                            value={clientId} onChange={(e) => setClientId(e.target.value)}>
                                            <option value="">Seleccionar cliente</option>
                                            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Fecha de vencimiento</span>
                                        <input type="date" required min={editId ? undefined : todayLocal()}
                                            value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                                    </label>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {editId ? "Se conserva el vencimiento guardado." : `Sugerencia: ${defaults.defaultValidityDays} días desde hoy. Puedes cambiarla.`}
                                    </p>
                                    {!editId && <button type="button" onClick={() => setExpiryDate(defaultExpiryDate())}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">Restablecer fecha sugerida</button>}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                                <div>
                                    <label htmlFor="quotation-currency" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Moneda de la cotización</label>
                                    <select id="quotation-currency" value={currency}
                                        onChange={(e) => changeCurrency(e.target.value as "PEN" | "USD")}
                                        className="min-w-48 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                                        <option value="PEN">Soles (PEN) — S/</option>
                                        <option value="USD">Dólares (USD) — US$</option>
                                    </select>
                                    <p className="mt-2 text-xs text-slate-500">Predeterminada: {defaults.defaultCurrency}. Puedes cambiarla en cada cotización.</p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                                    <BadgeCheck className="h-3.5 w-3.5" /> IGV {taxRate}% automático
                                </span>
                            </div>

                            {/* Selección comercial: servicio + vehículo + modalidad. Precio automático. */}
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><Calculator className="h-4 w-4 text-blue-600" /> Detalle de servicios</h3>
                                    <span className="text-xs text-slate-500">El precio se obtiene de Tarifas; las fechas calculan la cantidad.</span>
                                </div>
                                {items.map((line, index) => {
                                    const matching = ratesFor(index, line.serviceId, line.vehicleTypeId, line.unit);
                                    const selectedRate = rates.find((r) => r.id === line.serviceRateId && r.currency === currency);
                                    const vehiclesForService = [...new Set(rates.filter((r) => r.serviceId === line.serviceId && r.currency === currency).map((r) => r.vehicleTypeId ?? ""))];
                                    const hasDates = line.unit === "DAY" || line.unit === "MONTH" || line.unit === "HOUR";
                                    const count = quantityForLine(line);
                                    return (
                                        <div key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Servicio {index + 1}</span>
                                                <button type="button" title="Quitar servicio" aria-label="Quitar servicio" disabled={items.length === 1}
                                                    onClick={() => setItems((xs) => xs.filter((_, j) => j !== index))}
                                                    className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-3">
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Servicio
                                                    <select required value={line.serviceId} onChange={(e) => changeLineChoice(index, { serviceId: e.target.value, vehicleTypeId: "", unit: "DAY" })}
                                                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none">
                                                        <option value="">Seleccionar servicio</option>
                                                        {services.filter((s) => rates.some((r) => r.serviceId === s.id && r.currency === currency)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </label>
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Vehículo
                                                    <select value={line.vehicleTypeId} onChange={(e) => changeLineChoice(index, { vehicleTypeId: e.target.value })}
                                                        disabled={!line.serviceId} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-50">
                                                        <option value="">Sin vehículo</option>
                                                        {vehicles.filter((v) => vehiclesForService.includes(v.id)).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                    </select>
                                                </label>
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Modalidad de cobro
                                                    <select value={line.unit} onChange={(e) => changeLineChoice(index, { unit: e.target.value as Line["unit"] })}
                                                        disabled={!line.serviceId} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-50">
                                                        {unitOptions.filter((u) => rates.some((r) => r.serviceId === line.serviceId && (r.vehicleTypeId ?? "") === line.vehicleTypeId && r.unit === u && r.currency === currency)).map((u) => <option key={u} value={u}>{rateUnitLabel[u]}</option>)}
                                                    </select>
                                                </label>
                                            </div>
                                            {matching.length > 1 && (
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Tarifa disponible
                                                    <select required value={line.serviceRateId} onChange={(e) => selectRate(index, e.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal">
                                                        <option value="">Seleccionar precio</option>
                                                        {matching.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.currency} {r.price.toFixed(2)}</option>)}
                                                    </select>
                                                </label>
                                            )}
                                            {!selectedRate && matching.length === 0 && line.serviceId && (
                                                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No hay precio registrado en {currency} para esta combinación. Agrégalo en el módulo Tarifas o elige otra moneda.</p>
                                            )}
                                            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Descripción del servicio
                                                <input required minLength={2} value={line.description} onChange={(e) => update(index, "description", e.target.value)}
                                                    className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none" />
                                            </label>
                                            {hasDates && (
                                                <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:grid-cols-2">
                                                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                                                        <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-blue-600" /> Fecha de inicio</span>
                                                        <input type="date" required value={line.serviceStart} onChange={(e) => changeDates(index, "serviceStart", e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal" />
                                                    </label>
                                                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                                                        <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-blue-600" /> Fecha de fin</span>
                                                        <input type="date" required min={line.serviceStart || undefined} value={line.serviceEnd} onChange={(e) => changeDates(index, "serviceEnd", e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal" />
                                                    </label>
                                                    {line.unit === "HOUR" && <>
                                                        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                                                            <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-blue-600" /> Hora de inicio</span>
                                                            <input type="time" required step="60" value={line.startTime} onChange={(e) => changeDates(index, "startTime", e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal" />
                                                        </label>
                                                        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                                                            <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-blue-600" /> Hora de fin</span>
                                                            <input type="time" required step="60" value={line.endTime} onChange={(e) => changeDates(index, "endTime", e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal" />
                                                        </label>
                                                    </>}
                                                    {line.unit === "HOUR" && line.serviceStart && line.serviceEnd === line.serviceStart && line.startTime && line.endTime && line.endTime <= line.startTime && (
                                                        <button type="button" onClick={() => changeDates(index, "serviceEnd", followingDay(line.serviceStart))}
                                                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-100 sm:col-span-2">
                                                            El horario cruza medianoche. Usar el día siguiente como fecha de fin.
                                                        </button>
                                                    )}
                                                    <p className="text-xs text-blue-800 sm:col-span-2">
                                                        {count === null ? "Completa el inicio y fin para calcular la cantidad." : `${count} ${line.unit === "DAY" ? (count === 1 ? "día" : "días") : line.unit === "MONTH" ? (count === 1 ? "mes" : "meses") : (count === 1 ? "hora" : "horas")} calculados automáticamente.`}
                                                        {line.unit === "HOUR" ? " Se cobran horas completas y cualquier fracción se redondea hacia arriba." : line.unit === "MONTH" ? " Los meses parciales se cobran como mes completo." : " Se incluyen las fechas de inicio y fin."}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Cantidad ({rateUnitLabel[line.unit]})
                                                    <input required type="number" min="0.01" step={hasDates ? "1" : "0.01"} readOnly={hasDates} value={line.quantity} onChange={(e) => update(index, "quantity", e.target.value)}
                                                        className={`rounded-xl border border-slate-200 p-3 text-sm font-medium ${hasDates ? "bg-slate-100 text-slate-600" : "bg-white"}`} />
                                                </label>
                                                <div className="grid gap-1.5 text-xs font-semibold text-slate-600">Precio unitario
                                                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-800">{selectedRate ? (selectedRate.currency === "PEN" ? "S/" : "US$") : "—"} {line.unitPrice.toFixed(2)}</div>
                                                </div>
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Descuento
                                                    <input type="number" min="0" step="0.01" value={line.discountAmount} onChange={(e) => update(index, "discountAmount", e.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" />
                                                </label>
                                            </div>
                                            <div className="flex justify-end border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700">Importe: {currency === "PEN" ? "S/" : "US$"} {Math.max(0, line.quantity * line.unitPrice - line.discountAmount).toFixed(2)}</div>
                                        </div>
                                    );
                                })}
                                <button type="button" onClick={() => setItems((xs) => [...xs, empty()])} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                                    <Plus className="h-4 w-4" /> Agregar servicio
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Observaciones (opcional)
                                    <textarea className="field h-24 rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800"
                                        value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </label>
                                <details className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                                    <summary className="cursor-pointer font-semibold">Ver o ajustar condiciones comerciales</summary>
                                    <textarea className="mt-3 h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
                                        value={terms} onChange={(e) => setTerms(e.target.value)} />
                                </details>
                            </div>

                            {/* Totales */}
                            <div className="ml-auto max-w-xs space-y-2 rounded-2xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
                                <p className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span className="font-semibold text-slate-800">
                                        {subtotal.toFixed(2)}
                                    </span>
                                </p>
                                <p className="flex justify-between">
                                    <span>IGV ({taxRate}%)</span>
                                    <span className="font-semibold text-slate-800">
                                        {(total - subtotal).toFixed(2)}
                                    </span>
                                </p>
                                <p className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                                    <span>Total</span>
                                    <span className="text-blue-700">
                                        {currency} {total.toFixed(2)}
                                    </span>
                                </p>
                            </div>

                        </div>

                        {/* Pie fijo: los botones no desaparecen al desplazarse. */}
                        {/* Botones de Acción */}
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 shadow-[0_-8px_28px_-20px_rgba(15,23,42,0.3)] sm:px-8">
                            <button
                                type="button"
                                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                Cerrar
                            </button>
                            <button
                                disabled={pending}
                                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                {pending ? "Guardando..." : "Guardar borrador"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}