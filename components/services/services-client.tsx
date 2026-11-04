
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import type { ServiceType } from "@/app/generated/prisma/client";

import {
    Plus,
    Search,
    X,
    Pencil,
    Power,
    PowerOff,
    Save,
    LoaderCircle,
    Wrench,
} from "lucide-react";

import {
    saveService,
    setServiceActive,
} from "@/app/actions/services";

export type ServiceRow = {
    id: string;
    code: string;
    name: string;
    type: ServiceType;
    description: string | null;
    isActive: boolean;
    requiresVehicle: boolean;
    _count: { rates: number };
};

type Props = {
    services: ServiceRow[];
    canEdit: boolean;
};

type ServiceForm = {
    code: string;
    name: string;
    type: ServiceType;
    description: string;
    requiresVehicle: boolean;
};

const SERVICE_TYPES: {
    value: ServiceType;
    label: string;
}[] = [
        {
            value: "VEHICLE_RENTAL",
            label: "Alquiler de vehículos",
        },
        {
            value: "TRANSPORT",
            label: "Transporte",
        },
        {
            value: "DRIVER",
            label: "Servicio de conductor",
        },
        {
            value: "OTHER",
            label: "Otros servicios",
        },
    ];

const EMPTY_FORM: ServiceForm = {
    code: "",
    name: "",
    type: "OTHER",
    description: "",
    requiresVehicle: false,
};

function getServiceTypeLabel(type: ServiceType) {
    return (
        SERVICE_TYPES.find((item) => item.value === type)?.label ??
        type
    );
}

export default function ServicesClient({
    services,
    canEdit,
}: Props) {
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState<ServiceRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<ServiceForm>({
        ...EMPTY_FORM,
    });
    const [pending, startTransition] = useTransition();

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return services;

        return services.filter((service) =>
            [
                service.code,
                service.name,
                getServiceTypeLabel(service.type),
                service.description ?? "",
            ].some((value) =>
                value.toLowerCase().includes(term)
            )
        );
    }, [services, search]);

    function openCreate() {
        if (!canEdit || pending) return;

        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setModalOpen(true);
    }

    function openEdit(service: ServiceRow) {
        if (!canEdit || pending) return;

        setEditing(service);
        setForm({
            code: service.code,
            name: service.name,
            type: service.type,
            description: service.description ?? "",
            requiresVehicle: service.requiresVehicle,
        });
        setModalOpen(true);
    }

    function closeModal() {
        if (pending) return;

        setModalOpen(false);
        setEditing(null);
    }

    function updateField(
        field: "code" | "name" | "description",
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!canEdit || pending) return;

        const isEditing = editing !== null;

        startTransition(async () => {
            try {
                const result = await saveService(
                    editing?.id ?? null,
                    {
                        code: form.code.trim(),
                        name: form.name.trim(),
                        type: form.type,
                        requiresVehicle: form.requiresVehicle,
                        description:
                            form.description.trim() || null,
                    }
                );

                if (!result.ok) {
                    await Swal.fire({
                        icon: "error",
                        title: "No se pudo guardar",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                    });
                    return;
                }

                setModalOpen(false);
                setEditing(null);
                router.refresh();

                await Swal.fire({
                    icon: "success",
                    title: isEditing
                        ? "Servicio actualizado"
                        : "Servicio registrado",
                    text: result.message,
                    timer: 1800,
                    showConfirmButton: false,
                });
            } catch {
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "No se pudo guardar el servicio.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    async function handleToggle(service: ServiceRow) {
        if (!canEdit || pending) return;

        const nextActive = !service.isActive;

        const confirmation = await Swal.fire({
            icon: "question",
            title: service.isActive
                ? "¿Desactivar servicio?"
                : "¿Activar servicio?",
            text: service.isActive
                ? "El servicio dejará de estar disponible para nuevas operaciones."
                : "El servicio volverá a estar disponible.",
            showCancelButton: true,
            confirmButtonText: service.isActive
                ? "Sí, desactivar"
                : "Sí, activar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: service.isActive
                ? "#d97706"
                : "#059669",
            cancelButtonColor: "#64748b",
            reverseButtons: true,
        });

        if (!confirmation.isConfirmed) return;

        startTransition(async () => {
            try {
                const result = await setServiceActive(
                    service.id,
                    nextActive
                );

                if (!result.ok) {
                    await Swal.fire({
                        icon: "error",
                        title: "No se pudo actualizar",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                    });
                    return;
                }

                router.refresh();

                await Swal.fire({
                    icon: "success",
                    title: nextActive
                        ? "Servicio activado"
                        : "Servicio desactivado",
                    text: result.message,
                    timer: 1600,
                    showConfirmButton: false,
                });
            } catch {
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "No se pudo cambiar el estado.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    return (
        <section className="space-y-6">
            {/* ENCABEZADO */}
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Gestión comercial
                    </span>

                    <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        <Wrench className="h-7 w-7 text-blue-600" />
                        Servicios
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Administra los servicios disponibles para las cotizaciones.
                    </p>
                </div>

                {canEdit && (
                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={pending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo servicio
                    </button>
                )}
            </div>

            {/* TABLA */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Buscar servicios..."
                            aria-label="Buscar servicios"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                    </div>

                    <span className="text-sm font-medium text-slate-500">
                        {filtered.length}{" "}
                        {filtered.length === 1
                            ? "servicio"
                            : "servicios"}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="px-5 py-4">Código</th>
                                <th className="px-5 py-4">Nombre</th>
                                <th className="px-5 py-4">Tipo</th>
                                <th className="px-5 py-4">Descripción</th>
                                <th className="px-5 py-4">Tarifario</th>
                                <th className="px-5 py-4">Estado</th>
                                {canEdit && (
                                    <th className="px-5 py-4 text-right">
                                        Acciones
                                    </th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((service) => (
                                <tr
                                    key={service.id}
                                    className="transition hover:bg-slate-50"
                                >
                                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                                        {service.code}
                                    </td>

                                    <td className="px-5 py-4 font-medium text-slate-800">
                                        {service.name}
                                    </td>

                                    <td className="px-5 py-4 text-slate-600">
                                        {getServiceTypeLabel(service.type)}
                                    </td>

                                    <td className="max-w-xs px-5 py-4 text-slate-500">
                                        <span className="block max-w-xs truncate">
                                            {service.description || "—"}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4"><Link href={`/tarifas?tab=rates&serviceId=${service.id}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">{service._count.rates} tarifas · Administrar</Link></td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${service.isActive
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {service.isActive
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </td>

                                    {canEdit && (
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    title="Editar servicio"
                                                    aria-label={`Editar ${service.name}`}
                                                    onClick={() =>
                                                        openEdit(service)
                                                    }
                                                    disabled={pending}
                                                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    title={
                                                        service.isActive
                                                            ? "Desactivar"
                                                            : "Activar"
                                                    }
                                                    aria-label={`${service.isActive
                                                            ? "Desactivar"
                                                            : "Activar"
                                                        } ${service.name}`}
                                                    onClick={() =>
                                                        handleToggle(service)
                                                    }
                                                    disabled={pending}
                                                    className={`rounded-lg p-2 disabled:opacity-50 ${service.isActive
                                                            ? "text-amber-600 hover:bg-amber-50"
                                                            : "text-emerald-600 hover:bg-emerald-50"
                                                        }`}
                                                >
                                                    {service.isActive ? (
                                                        <PowerOff className="h-4 w-4" />
                                                    ) : (
                                                        <Power className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}

                            {filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={canEdit ? 7 : 6}
                                        className="px-6 py-14 text-center text-slate-500"
                                    >
                                        No se encontraron servicios.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {modalOpen && canEdit && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <form
                        onSubmit={handleSubmit}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="service-modal-title"
                        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8"
                    >
                        <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                                    Gestión de servicios
                                </span>

                                <h2
                                    id="service-modal-title"
                                    className="mt-1 text-xl font-bold text-slate-900"
                                >
                                    {editing
                                        ? "Editar servicio"
                                        : "Nuevo servicio"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={pending}
                                aria-label="Cerrar formulario"
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-slate-700">
                                    Código *
                                </span>
                                <input
                                    required
                                    maxLength={40}
                                    value={form.code}
                                    onChange={(event) =>
                                        updateField(
                                            "code",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. ALQ-CAM"
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                                />
                            </label>

                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-slate-700">
                                    Nombre *
                                </span>
                                <input
                                    required
                                    maxLength={160}
                                    value={form.name}
                                    onChange={(event) =>
                                        updateField(
                                            "name",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Alquiler de camioneta"
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                                />
                            </label>

                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-slate-700">
                                    Tipo de servicio *
                                </span>

                                <select
                                    required
                                    value={form.type}
                                    onChange={(event) => {
                                        const selected = SERVICE_TYPES.find(
                                            (item) =>
                                                item.value === event.target.value
                                        );

                                        if (selected) {
                                            setForm((previous) => ({
                                                ...previous,
                                                type: selected.value,
                                            }));
                                        }
                                    }}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                                >
                                    {SERVICE_TYPES.map((item) => (
                                        <option
                                            key={item.value}
                                            value={item.value}
                                        >
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-slate-700">
                                    Descripción
                                </span>
                                <textarea
                                    rows={4}
                                    value={form.description}
                                    onChange={(event) =>
                                        updateField(
                                            "description",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Describe el servicio..."
                                    className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                                />
                            </label>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={pending}
                                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={pending}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {pending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}

                                {pending
                                    ? "Guardando..."
                                    : "Guardar servicio"}
                            </button>
                        </div>
                        <label className="my-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.requiresVehicle} onChange={e=>setForm(f=>({...f,requiresVehicle:e.target.checked}))} className="h-4 w-4 accent-blue-600"/>Este servicio requiere seleccionar modelo de vehículo en su tarifario</label>
                    </form>
                </div>
            )}
        </section>
    );
}
