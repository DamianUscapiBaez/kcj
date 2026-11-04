"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
    Plus,
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
import type { Option, RateOption, CompanyDefaults, Quote, Line } from "./quotation-types";
import QuotationList from "./quotation-list";

type RateUnit = RateOption["unit"];
type DurationType = NonNullable<RateOption["durationType"]>;

const empty = (): Line => ({
    description: "",
    serviceId: "",
    vehicleModelId: "",
    serviceRateId: "",
    unit: "SERVICE",
    quantity: 1,
    unitPrice: 0,
    discountAmount: 0,
    serviceStart: "",
    serviceEnd: "",
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
    const [currency, setCurrency] = useState<"PEN" | "USD">("USD");
    const [exchangeRate, setExchangeRate] = useState(0);
    const converted = (price: number, from: "PEN" | "USD", to: "PEN" | "USD") => from === to ? price : to === "PEN" ? price * exchangeRate : price / exchangeRate;
    const [taxRate, setTaxRate] = useState(18);
    const [taxIncluded, setTaxIncluded] = useState(false);
    const [expiryDate, setExpiryDate] = useState("");
    const [notes, setNotes] = useState("");
    const [terms, setTerms] = useState("");
    const [items, setItems] = useState<Line[]>([empty()]);
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

    const canEdit = role === "ADMIN" || role === "SALES";

    function defaultExpiryDate() {
        const today = new Date();
        const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + defaults.defaultValidityDays));
        return date.toISOString().slice(0, 10);
    }

    function begin(q?: Quote) {
        setEditId(q?.id ?? null);
        setClientId(q?.clientId ?? clients[0]?.id ?? "");
        setCurrency(q ? (q.currency === "USD" ? "USD" : "PEN") : "USD");
        setExchangeRate(q ? Number(q.exchangeRate || 0) : 0);
        setTaxRate(q ? Number(q.taxRate) : defaults.defaultTaxRate);
        setTaxIncluded(q?.taxIncluded ?? false);
        setExpiryDate(q?.expiryDate.slice(0, 10) ?? defaultExpiryDate());
        setNotes(q?.notes ?? "");
        setTerms(q?.terms ?? defaults.defaultTerms);
        setItems(
            q?.items.map((x) => ({
                ...x,
                serviceId: x.serviceId ?? "",
                vehicleModelId: x.vehicleModelId ?? "",
                serviceRateId: x.serviceRateId ?? "",
                unit: x.unit as Line["unit"],
                quantity: Number(x.quantity),
                unitPrice: Number(x.unitPrice),
                discountAmount: Number(x.discountAmount),
                serviceStart: x.serviceStart?.slice(0, 10) ?? "",
                serviceEnd: x.serviceEnd?.slice(0, 10) ?? "",
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

    const rateUnitLabel: Record<RateUnit, string> = {
        DAY: "Por día", TRIP: "Por viaje",
        SERVICE: "Por servicio", MONTH: "Por mes", HOUR: "Por hora",
    };

    // Las fechas son fechas calendario, no instantes con zona horaria.
    function dateParts(value: string) {
        const parts = value.split("-").map(Number);
        if (parts.length !== 3 || parts.some((x) => !Number.isInteger(x))) return null;
        const [y, m, d] = parts;
        const ms = Date.UTC(y, m - 1, d);
        if (new Date(ms).toISOString().slice(0, 10) !== value) return null;
        return { y, m, d, ms };
    }

    function quantityForLine(line: Line): number | null {
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

    // El usuario selecciona Servicio -> Tarifa. El modelo se hereda de ServiceRate.
    function ratesForService(serviceId: string) {
        return rates.filter((r) => r.serviceId === serviceId);
    }

    function durationLabel(durationType: DurationType | null): string {
        if (durationType === "LESS_THAN_MONTH") return "Menos de 30 días";
        if (durationType === "GREATER_THAN_MONTH") return "30 días o más";
        return "Sin restricción de duración";
    }

    function isDurationCompatible(rate: RateOption, line: Line) {
        if (!rate.durationType) return true;
        const days = calculateQuantity("DAY", line.serviceStart, line.serviceEnd);
        if (days === null) return true; // La validación de fechas ocurre al guardar.
        return rate.durationType === "LESS_THAN_MONTH" ? days < 30 : days >= 30;
    }

    function chooseService(index: number, serviceId: string) {
        const service = services.find((s) => s.id === serviceId);
        setItems((previous) => previous.map((line, i) => i !== index ? line : ({
            ...empty(), serviceId, description: service?.name ?? "",
            serviceStart: line.serviceStart, serviceEnd: line.serviceEnd,
        })));
    }

    function selectRate(index: number, rateId: string) {
        const rate = rates.find((r) => r.id === rateId);
        if (!rate) return;
        setItems((previous) => previous.map((line, i) => {
            if (i !== index || line.serviceId !== rate.serviceId) return line;
            const next = {
                ...line, serviceRateId: rate.id,
                vehicleModelId: rate.vehicleModelId ?? "",
                unit: rate.unit,
                description: [services.find(s => s.id === rate.serviceId)?.name, rate.name].filter(Boolean).join(" · "),
                unitPrice: converted(rate.price, rate.currency, currency),
            };
            return { ...next, quantity: quantityForLine(next) ?? (rate.unit === "DAY" || rate.unit === "MONTH" ? 1 : line.quantity) };
        }));
    }

    function changeDates(index: number, field: "serviceStart" | "serviceEnd", value: string) {
        setItems((previous) => previous.map((line, i) => {
            if (i !== index) return line;
            const next = { ...line, [field]: value };
            return { ...next, quantity: quantityForLine(next) ?? 1 };
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
        if (items.some((line) => (["DAY", "MONTH"] as string[]).includes(line.unit) &&
            quantityForLine(line) === null)) {
            void Swal.fire({ icon: "warning", title: "Fechas inválidas", text: "Indica fechas de inicio y fin válidas. El fin debe ser posterior al inicio." });
            return;
        }
        if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
            void Swal.fire({ icon: "warning", title: "Tipo de cambio inválido", text: "Ingresa soles por 1 dólar." });
            return;
        }
        if (items.some((line) => !line.serviceRateId || !rates.find(r => r.id === line.serviceRateId && r.serviceId === line.serviceId))) {
            void Swal.fire({ icon: "warning", title: "Selecciona una tarifa", text: "Todas las líneas deben tener una tarifa registrada." });
            return;
        }
        if (items.some((line) => { const rate = rates.find(r => r.id === line.serviceRateId); return rate && !isDurationCompatible(rate, line); })) {
            void Swal.fire({ icon: "warning", title: "Duración incompatible", text: "Selecciona una tarifa cuya duración coincida con las fechas del servicio." });
            return;
        }
        if (items.some((line) => line.discountAmount > line.quantity * line.unitPrice)) {
            void Swal.fire({ icon: "warning", title: "Descuento inválido", text: "El descuento no puede superar el importe de la línea." });
            return;
        }
        const quotationItems = items.filter(
            (line): line is Line & { unit: Exclude<RateUnit, "HOUR"> } => line.unit !== "HOUR"
        );
        if (quotationItems.length !== items.length) {
            void Swal.fire({ icon: "warning", title: "Unidad no compatible", text: "Las cotizaciones no admiten tarifas por hora. Selecciona otra tarifa." });
            return;
        }
        start(async () => {
            const r = await saveQuotation(editId, {
                clientId,
                currency,
                exchangeRate,
                taxRate,
                taxIncluded,
                expiryDate,
                notes,
                terms,
                items: quotationItems,
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

    return (
        <section className="space-y-6">
            <QuotationList
                quotes={quotes}
                canEdit={canEdit}
                onCreate={() => begin()}
                onEdit={begin}
                onCopyLink={copyReviewLink}
                onMarkSent={markSent}
                onAccept={(id) => decide(id, "ACCEPTED")}
                onReject={(id) => decide(id, "REJECTED")}
                onCancel={annul}
                onDelete={remove}
            />
            {/* Modal de Creación / Edición */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[6px] sm:p-6">
                    <form
                        onSubmit={save}
                        className="flex h-[min(92dvh,920px)] w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_28px_90px_-25px_rgba(15,23,42,0.55)] sm:rounded-[28px]"
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
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-color:#cbd5e1_transparent] scrollbar-thin sm:px-8 sm:py-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
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
                                    <label htmlFor="quotation-currency" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Monedas de visualización</label>
                                    <div id="quotation-currency" className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">USD (US$) · Equivalente en soles (S/)</div>
                                    <p className="mt-2 text-xs text-slate-500">Los precios se muestran en ambas monedas. El tipo de cambio se registra para esta cotización.</p>
                                    <label className="mt-3 grid gap-1 text-xs font-bold text-slate-600">Tipo de cambio (S/ por US$ 1)
                                        <input type="number" min="0.000001" step="0.0001" value={exchangeRate} onChange={e => { const fx = Number(e.target.value); setExchangeRate(fx); setItems(prev => prev.map(line => { const rate = rates.find(r => r.id === line.serviceRateId); return { ...line, unitPrice: rate ? (rate.currency === currency ? rate.price : currency === "PEN" ? rate.price * fx : fx > 0 ? rate.price / fx : 0) : 0 }; })); }} className="rounded-lg border border-blue-200 bg-white p-2.5 text-sm" />
                                    </label>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                                    <BadgeCheck className="h-3.5 w-3.5" /> IGV {taxRate}% automático
                                </span>
                            </div>

                            {/* Selección comercial: servicio + vehículo + modalidad. Precio automático. */}
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><Calculator className="h-4 w-4 text-blue-600" /> Detalle de servicios</h3>
                                    <span className="text-xs text-slate-500">Selecciona el servicio y después una de sus tarifas. El vehículo y el precio vienen incluidos en la tarifa.</span>
                                </div>
                                {items.map((line, index) => {
                                    const selectedRate = rates.find((r) => r.id === line.serviceRateId);
                                    const availableRates = ratesForService(line.serviceId);
                                    const vehicle = selectedRate?.vehicleModelId ? vehicles.find(v => v.id === selectedRate.vehicleModelId) : null;
                                    const hasDates = line.unit === "DAY" || line.unit === "MONTH";
                                    const count = quantityForLine(line);
                                    const durationValid = !selectedRate || isDurationCompatible(selectedRate, line);
                                    return (
                                        <div key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Servicio {index + 1}</span>
                                                <button type="button" title="Quitar servicio" aria-label="Quitar servicio" disabled={items.length === 1}
                                                    onClick={() => setItems((xs) => xs.filter((_, j) => j !== index))}
                                                    className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">1. Servicio
                                                    <select required value={line.serviceId} onChange={(e) => chooseService(index, e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none">
                                                        <option value="">Seleccionar servicio</option>
                                                        {services.filter((s) => rates.some((r) => r.serviceId === s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </label>
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">2. Tarifario del servicio
                                                    <select required value={line.serviceRateId} disabled={!line.serviceId} onChange={(e) => selectRate(index, e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-50">
                                                        <option value="">{line.serviceId ? "Seleccionar tarifa" : "Primero selecciona el servicio"}</option>
                                                        {availableRates.map((r) => {
                                                            const model = r.vehicleModelId ? vehicles.find(v => v.id === r.vehicleModelId)?.name ?? "Modelo" : "Sin vehículo";
                                                            return <option key={r.id} value={r.id}>{r.name} · {model} · {durationLabel(r.durationType)} · {r.currency === "USD" ? "US$" : "S/"} {r.price.toFixed(2)}</option>;
                                                        })}
                                                    </select>
                                                </label>
                                            </div>
                                            {selectedRate && (
                                                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-700">
                                                    <p className="font-semibold text-blue-900">Datos de la tarifa seleccionada</p>
                                                    <p className="mt-1">Vehículo: <strong>{vehicle?.name ?? "No aplica"}</strong> · Duración: <strong>{durationLabel(selectedRate.durationType)}</strong></p>
                                                    <p className="mt-1">Precio unitario: <strong>{selectedRate.currency === "USD" ? "US$" : "S/"} {selectedRate.price.toFixed(2)}</strong> / {rateUnitLabel[selectedRate.unit]}</p>
                                                </div>
                                            )}
                                            {line.serviceId && availableRates.length === 0 && (
                                                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Este servicio no tiene tarifas activas. Configúralas desde Servicios → Administrar tarifas.</p>
                                            )}
                                            {!durationValid && (
                                                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">La duración elegida no corresponde al tipo de esta tarifa. Selecciona otra tarifa del servicio o ajusta las fechas.</p>
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
                                                    <p className="text-xs text-blue-800 sm:col-span-2">
                                                        {count === null ? "Completa el inicio y fin para calcular la cantidad." : `${count} ${line.unit === "DAY" ? (count === 1 ? "día" : "días") : line.unit === "MONTH" ? (count === 1 ? "mes" : "meses") : "unidades"} calculados automáticamente.`}
                                                        {line.unit === "MONTH" ? " Los meses parciales se cobran como mes completo." : " Se incluyen las fechas de inicio y fin."}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Cantidad ({rateUnitLabel[line.unit]})
                                                    <input required type="number" min="0.01" step={hasDates ? "1" : "0.01"} readOnly={hasDates} value={line.quantity} onChange={(e) => update(index, "quantity", e.target.value)}
                                                        className={`rounded-xl border border-slate-200 p-3 text-sm font-medium ${hasDates ? "bg-slate-100 text-slate-600" : "bg-white"}`} />
                                                </label>
                                                <div className="grid gap-1.5 text-xs font-semibold text-slate-600">Precio unitario
                                                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-800">US$ {(currency === "USD" ? line.unitPrice : line.unitPrice / exchangeRate).toFixed(2)} / S/ {(currency === "PEN" ? line.unitPrice : line.unitPrice * exchangeRate).toFixed(2)}</div>
                                                </div>
                                                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Descuento
                                                    <input type="number" min="0" step="0.01" value={line.discountAmount} onChange={(e) => update(index, "discountAmount", e.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" />
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700">
                                                <div>Total sin IGV ($): US$ {(currency === "USD" ? Math.max(0, line.quantity * line.unitPrice - line.discountAmount) : Math.max(0, line.quantity * line.unitPrice - line.discountAmount) / exchangeRate).toFixed(2)}</div>
                                                <div>Total sin IGV (S/): S/ {(currency === "PEN" ? Math.max(0, line.quantity * line.unitPrice - line.discountAmount) : Math.max(0, line.quantity * line.unitPrice - line.discountAmount) * exchangeRate).toFixed(2)}</div>
                                            </div>
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
                                <p className="text-xs text-slate-500">Equivalente: US$ {(currency === "USD" ? total : total / exchangeRate).toFixed(2)} · S/ {(currency === "PEN" ? total : total * exchangeRate).toFixed(2)}</p>
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