"use client";

import { useMemo, useState, useTransition } from "react";
import { catalogs, type CatalogKey } from "@/lib/catalog-config";
import { saveCatalog, toggleCatalog } from "@/app/actions/catalog";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Plus, Search, X, Pencil, Power, PowerOff, Save, LoaderCircle, FileText } from "lucide-react";

type Row = Record<string, string | number | boolean | null>;
type Option = { id: string; name: string };

const choices: Record<string, { value: string; label: string }[]> = {
    documentType: ["RUC", "DNI", "CE", "PASSPORT", "OTHER"].map((x) => ({
        value: x,
        label: x,
    })),
    unit: ["HOUR", "DAY", "TRIP", "SERVICE", "MONTH"].map((x) => ({
        value: x,
        label: x,
    })),
    currency: [
        { value: "PEN", label: "Soles (PEN)" },
        { value: "USD", label: "Dólares (USD)" },
    ],
};

export default function CatalogClient({
    kind,
    records,
    services,
    vehicles,
    canEdit,
}: {
    kind: CatalogKey;
    records: Row[];
    services: Option[];
    vehicles: Option[];
    canEdit: boolean;
}) {
    const cfg = catalogs[kind];
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [edit, setEdit] = useState<Row | null | undefined>(undefined);
    const [form, setForm] = useState<Record<string, string>>({});
    const [message, setMessage] = useState("");
    const [pending, start] = useTransition();

    const filtered = useMemo(() => {
        return records.filter((r) =>
            cfg.fields.some((f) =>
                String(r[f] ?? "").toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [records, search, cfg.fields]);

    function open(r: Row | null) {
        setEdit(r);
        setMessage("");
        const d: Record<string, string> = {};

        cfg.fields.forEach((f) => {
            d[f] = r?.[f] == null ? "" : String(r[f]);
        });

        if (!r) {
            if (kind === "clientes") d.documentType = "RUC";
            if (kind === "tarifas") {
                d.unit = "SERVICE";
                d.currency = "PEN";
            }
        }
        setForm(d);
    }

    function submit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        start(async () => {
            try {
                const result = await saveCatalog(kind, edit?.id ? String(edit.id) : null, form);
                if (result.ok) {
                    setMessage("");
                    setEdit(undefined);
                    router.refresh();
                    await Swal.fire({ icon: "success", title: "Guardado correctamente", text: result.message, timer: 1900, showConfirmButton: false });
                } else {
                    setMessage(result.message);
                    await Swal.fire({ icon: "error", title: "No se pudo guardar", text: result.message, confirmButtonColor: "#2563eb" });
                }
            } catch {
                await Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo completar la operación.", confirmButtonColor: "#2563eb" });
            }
        });
    }

    async function toggle(r: Row) {
        if (pending) return;
        const active = r.isActive === true;
        const confirmation = await Swal.fire({
            title: active ? "¿Desactivar registro?" : "¿Activar registro?",
            text: active ? "El registro dejará de estar disponible para nuevas operaciones." : "El registro volverá a estar disponible.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: active ? "Sí, desactivar" : "Sí, activar",
            cancelButtonText: "Volver",
            confirmButtonColor: active ? "#d97706" : "#059669",
            cancelButtonColor: "#64748b",
            reverseButtons: true,
        });
        if (!confirmation.isConfirmed) return;
        start(async () => {
            try {
                const res = await toggleCatalog(kind, String(r.id), !active);
                if (res.ok) {
                    setMessage("");
                    router.refresh();
                    await Swal.fire({ icon: "success", title: active ? "Registro desactivado" : "Registro activado", text: res.message, timer: 1800, showConfirmButton: false });
                } else {
                    await Swal.fire({ icon: "error", title: "No se pudo actualizar", text: res.message, confirmButtonColor: "#2563eb" });
                }
            } catch {
                await Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo actualizar el registro.", confirmButtonColor: "#2563eb" });
            }
        });
    }

    function field(f: string, label: string) {
        const opts =
            f === "serviceId"
                ? services.map((x) => ({ value: x.id, label: x.name }))
                : f === "vehicleTypeId"
                    ? [
                        { value: "", label: "Sin vehículo" },
                        ...vehicles.map((x) => ({ value: x.id, label: x.name })),
                    ]
                    : choices[f];

        return (
            <label key={f} className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span>{label}</span>
                {opts ? (
                    <select
                        required={f !== "vehicleTypeId"}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={form[f] ?? ""}
                        onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))}
                    >
                        <option value="">Seleccionar...</option>
                        {opts.map((x) => (
                            <option key={x.value} value={x.value}>
                                {x.label}
                            </option>
                        ))}
                    </select>
                ) : f === "description" || f === "address" ? (
                    <textarea
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[90px]"
                        value={form[f] ?? ""}
                        onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))}
                    />
                ) : (
                    <input
                        required={([
                            "legalName",
                            "documentNumber",
                            "code",
                            "name",
                            "price",
                        ] as string[]).includes(f)}
                        type={
                            f === "price"
                                ? "number"
                                : f === "email"
                                    ? "email"
                                    : "text"
                        }
                        min={f === "price" ? "0.01" : undefined}
                        step={f === "price" ? "0.01" : undefined}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={form[f] ?? ""}
                        onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))}
                    />
                )}
            </label>
        );
    }

    return (
        <section className="space-y-6">
            {/* Cabecera Principal */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">GESTIÓN COMERCIAL</span>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">{cfg.title}</h1>
                    <p className="text-sm text-slate-500 mt-1">{cfg.description}</p>
                </div>
                {canEdit && (
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        onClick={() => open(null)}
                    >
                        <Plus className="h-4 w-4" /> Nuevo registro
                    </button>
                )}
            </div>

            {/* Contenedor de la Tabla */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4 sm:p-5">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            aria-label="Buscar registros"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            placeholder="Buscar registros..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-slate-500">
                        <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><strong className="text-slate-700">{filtered.length}</strong> {filtered.length === 1 ? "registro" : "registros"}</span>
                    </span>
                </div>


                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider font-semibold text-slate-600 border-b border-slate-200">
                            <tr>
                                {cfg.fields
                                    .map((f, index) => ({ field: f, label: cfg.labels[index] }))
                                    .filter(
                                        ({ field }) => !["description", "address", "vehicleTypeId"].includes(field)
                                    )
                                    .map(({ field, label }) => (
                                        <th className="px-5 py-3.5 whitespace-nowrap" key={field}>
                                            {label}
                                        </th>
                                    ))}
                                <th className="px-5 py-3.5 whitespace-nowrap">Estado</th>
                                {canEdit && <th className="px-5 py-3.5 whitespace-nowrap text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((r) => (
                                <tr
                                    key={String(r.id)}
                                    className="hover:bg-slate-50/80 transition-colors"
                                >
                                    {cfg.fields
                                        .filter(
                                            (f) => !["description", "address", "vehicleTypeId"].includes(f)
                                        )
                                        .map((f) => (
                                            <td key={f} className="px-5 py-4 text-slate-700 whitespace-nowrap">
                                                {f === "serviceId"
                                                    ? services.find((s) => s.id === r[f])?.name ?? "—"
                                                    : f === "price"
                                                        ? Number(r[f]).toFixed(2)
                                                        : String(r[f] ?? "—")}
                                            </td>
                                        ))}
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${r.isActive
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                : "bg-slate-100 text-slate-600 border border-slate-200"
                                                }`}
                                        >
                                            {r.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    {canEdit && (
                                        <td className="whitespace-nowrap px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button type="button" title="Editar" aria-label="Editar registro" disabled={pending} onClick={() => open(r)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50">
                                                    <Pencil className="h-[18px] w-[18px]" />
                                                </button>
                                                <button type="button" title={r.isActive ? "Desactivar" : "Activar"} aria-label={r.isActive ? "Desactivar registro" : "Activar registro"} disabled={pending} onClick={() => toggle(r)} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-2 disabled:opacity-50 ${r.isActive ? "text-amber-600 hover:bg-amber-50 focus-visible:outline-amber-500" : "text-emerald-600 hover:bg-emerald-50 focus-visible:outline-emerald-500"}`}>
                                                    {r.isActive ? <PowerOff className="h-[18px] w-[18px]" /> : <Power className="h-[18px] w-[18px]" />}
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {!filtered.length && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400">
                                        No se encontraron registros disponibles.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Creación / Edición */}
            {edit !== undefined && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setEdit(undefined);
                    }}
                >
                    <form
                        onSubmit={submit}
                        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <span className="text-xs font-bold tracking-wide text-blue-600 uppercase">FORMULARIO</span>
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                                    {edit ? "Editar Registro" : "Nuevo Registro"} · <span className="text-slate-600 font-normal">{cfg.title}</span>
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                onClick={() => setEdit(undefined)}
                                aria-label="Cerrar"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {cfg.fields.map((f, i) => field(f, cfg.labels[i]))}
                        </div>

                        {message && (
                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                                {message}
                            </div>
                        )}

                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                                onClick={() => setEdit(undefined)}
                            >
                                <span className="inline-flex items-center gap-2"><X className="h-4 w-4" /> Cancelar</span>
                            </button>
                            <button
                                disabled={pending}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {pending ? "Guardando..." : "Guardar cambios"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}