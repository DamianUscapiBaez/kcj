"use client";

import { viewStyles } from "../ui/view-styles";
import {
    useEffect,
    useState,
    useTransition,
    useRef,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

import {
    CarFront,
    Layers3,
    Plus,
    Search,
    Pencil,
    Power,
    PowerOff,
    X,
    Save,
    LoaderCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import {
    saveVehicleType,
    saveVehicleModel,
    setVehicleTypeActive,
    setVehicleModelActive,
} from "@/app/actions/vehicles";

type VehicleTypeRow = {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    _count: { models: number };
};

type VehicleModelRow = {
    id: string;
    vehicleTypeId: string;
    brand: string;
    name: string;
    description: string | null;
    capacity: number | null;
    isActive: boolean;
    vehicleType: {
        name: string;
        isActive: boolean;
    };
};

type AvailableType = {
    id: string;
    name: string;
    isActive: boolean;
};

type Tab = "models" | "types";

type Props = {
    tab: Tab;
    query: string;
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
    types: VehicleTypeRow[];
    models: VehicleModelRow[];
    availableTypes: AvailableType[];
    canEdit: boolean;
};

type TypeForm = {
    name: string;
    description: string;
};

type ModelForm = {
    vehicleTypeId: string;
    brand: string;
    name: string;
    description: string;
    capacity: string;
};

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const labelClass = "block space-y-1.5";

const primaryButton =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

function emptyTypeForm(): TypeForm {
    return { name: "", description: "" };
}

function emptyModelForm(): ModelForm {
    return {
        vehicleTypeId: "",
        brand: "",
        name: "",
        description: "",
        capacity: "",
    };
}

function Status({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
        >
            {active ? "Activo" : "Inactivo"}
        </span>
    );
}

export default function VehiclesClient({
    tab,
    query,
    currentPage,
    totalPages,
    totalRecords,
    pageSize,
    types,
    models,
    availableTypes,
    canEdit,
}: Props) {
    const router = useRouter();

    const [search, setSearch] = useState(query);
    const [pending, startTransition] = useTransition();
    const submittingRef = useRef(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [typeForm, setTypeForm] = useState<TypeForm>(emptyTypeForm);
    const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);

    useEffect(() => {
        if (!modalOpen) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !pending) {
                setModalOpen(false);
                setEditingId(null);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [modalOpen, pending]);

    function makeUrl(
        nextTab: Tab,
        page: number,
        nextQuery: string
    ) {
        const params = new URLSearchParams();

        params.set("tab", nextTab);

        if (page > 1) {
            params.set("page", String(page));
        }

        if (nextQuery.trim()) {
            params.set("q", nextQuery.trim());
        }

        return `/vehiculos?${params.toString()}`;
    }

    function changeTab(nextTab: Tab) {
        if (nextTab === tab) return;

        setSearch("");
        router.push(makeUrl(nextTab, 1, ""));
    }

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.push(makeUrl(tab, 1, search));
    }

    function clearSearch() {
        setSearch("");
        router.push(makeUrl(tab, 1, ""));
    }

    function openCreate() {
        if (!canEdit || pending) return;

        setEditingId(null);
        setTypeForm(emptyTypeForm());
        setModelForm({
            ...emptyModelForm(),
            vehicleTypeId:
                availableTypes.find((item) => item.isActive)?.id ?? "",
        });
        setModalOpen(true);
    }

    function openEditType(item: VehicleTypeRow) {
        if (!canEdit || pending) return;

        setEditingId(item.id);
        setTypeForm({
            name: item.name,
            description: item.description ?? "",
        });
        setModalOpen(true);
    }

    function openEditModel(item: VehicleModelRow) {
        if (!canEdit || pending) return;

        setEditingId(item.id);
        setModelForm({
            vehicleTypeId: item.vehicleTypeId,
            brand: item.brand,
            name: item.name,
            description: item.description ?? "",
            capacity:
                item.capacity === null ? "" : String(item.capacity),
        });
        setModalOpen(true);
    }

    function closeModal() {
        if (pending) return;
        setModalOpen(false);
        setEditingId(null);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canEdit || pending || submittingRef.current) return;

        if (
            tab === "models" &&
            modelForm.capacity.trim() !== "" &&
            (!Number.isSafeInteger(Number(modelForm.capacity)) ||
                Number(modelForm.capacity) <= 0 ||
                Number(modelForm.capacity) > 2147483647)
        ) {
            void Swal.fire({
                icon: "warning",
                title: "Capacidad inválida",
                text: "La capacidad debe ser un número entero positivo.",
                confirmButtonColor: "#2563eb",
            });
            return;
        }

        submittingRef.current = true;
        startTransition(async () => {
            try {
                const result =
                    tab === "types"
                        ? await saveVehicleType(editingId, {
                            name: typeForm.name,
                            description: typeForm.description || null,
                        })
                        : await saveVehicleModel(editingId, {
                            vehicleTypeId: modelForm.vehicleTypeId,
                            brand: modelForm.brand,
                            name: modelForm.name,
                            description: modelForm.description || null,
                            capacity: modelForm.capacity.trim()
                                ? Number(modelForm.capacity)
                                : null,
                        });

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
                setEditingId(null);
                router.refresh();

                await Swal.fire({
                    icon: "success",
                    title: "Operación completada",
                    text: result.message,
                    timer: 1700,
                    showConfirmButton: false,
                });
            } catch {
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "No se pudo guardar el registro.",
                    confirmButtonColor: "#2563eb",
                });
            } finally {
                submittingRef.current = false;
            }
        });
    }

    async function handleToggle(
        item: { id: string; name: string; isActive: boolean },
        kind: Tab
    ) {
        if (!canEdit || pending) return;

        const nextActive = !item.isActive;

        const confirmation = await Swal.fire({
            icon: "question",
            title: nextActive
                ? "¿Activar registro?"
                : "¿Desactivar registro?",
            text: `${item.name}: ${nextActive
                ? "volverá a estar disponible."
                : "dejará de estar disponible para nuevas selecciones."
                }`,
            showCancelButton: true,
            confirmButtonText: nextActive
                ? "Sí, activar"
                : "Sí, desactivar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: nextActive ? "#059669" : "#d97706",
        });

        if (!confirmation.isConfirmed) return;

        startTransition(async () => {
            try {
                const result =
                    kind === "types"
                        ? await setVehicleTypeActive(item.id, nextActive)
                        : await setVehicleModelActive(item.id, nextActive);

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
                    title: "Estado actualizado",
                    text: result.message,
                    timer: 1500,
                    showConfirmButton: false,
                });
            } catch {
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "No se pudo actualizar el estado.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    const firstItem =
        totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;

    const lastItem = Math.min(
        currentPage * pageSize,
        totalRecords
    );

    const pageNumbers = Array.from(
        { length: totalPages },
        (_, index) => index + 1
    ).filter(
        (page) =>
            page === 1 ||
            page === totalPages ||
            Math.abs(page - currentPage) <= 2
    );

    return (
        <section className={viewStyles.page}>
            {/* ENCABEZADO */}
            <div className={viewStyles.header}>
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Catálogos comerciales
                    </span>

                    <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                        <CarFront className="h-7 w-7 text-blue-600" />
                        Vehículos
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Gestiona los tipos y modelos utilizados en tus
                        tarifas y cotizaciones.
                    </p>
                </div>

                {canEdit && (
                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={pending}
                        className={primaryButton}
                    >
                        <Plus className="h-4 w-4" />
                        {tab === "types" ? "Nuevo tipo" : "Nuevo modelo"}
                    </button>
                )}
            </div>

            {/* PESTAÑAS */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => changeTab("models")}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === "models"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                >
                    <CarFront className="h-4 w-4" />
                    Modelos
                </button>

                <button
                    type="button"
                    onClick={() => changeTab("types")}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === "types"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                >
                    <Layers3 className="h-4 w-4" />
                    Tipos de vehículo
                </button>
            </div>

            {/* TABLA */}
            <div className={viewStyles.panel}>
                <div className={viewStyles.toolbar}>
                    <form
                        onSubmit={submitSearch}
                        className="flex w-full gap-2 sm:max-w-lg"
                    >
                        <div className="relative min-w-0 flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder={
                                    tab === "types"
                                        ? "Buscar tipos..."
                                        : "Buscar marca, modelo o tipo..."
                                }
                                className={`${inputClass} pl-10`}
                            />
                        </div>

                        <button
                            type="submit"
                            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                        >
                            Buscar
                        </button>

                        {query && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="rounded-xl border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"
                            >
                                Limpiar
                            </button>
                        )}
                    </form>

                    <span className="whitespace-nowrap text-sm text-slate-500">
                        {totalRecords}{" "}
                        {tab === "types" ? "tipos" : "modelos"}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className={viewStyles.table}>
                        <thead className={viewStyles.tableHead}>
                            {tab === "types" ? (
                                <tr>
                                    <th className="px-5 py-4">Tipo</th>
                                    <th className="px-5 py-4">Descripción</th>
                                    <th className="px-5 py-4">Modelos</th>
                                    <th className="px-5 py-4">Estado</th>
                                    {canEdit && (
                                        <th className="px-5 py-4 text-right">
                                            Acciones
                                        </th>
                                    )}
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-5 py-4">Marca</th>
                                    <th className="px-5 py-4">Modelo</th>
                                    <th className="px-5 py-4">Tipo</th>
                                    <th className="px-5 py-4">Capacidad</th>
                                    <th className="px-5 py-4">Estado</th>
                                    {canEdit && (
                                        <th className="px-5 py-4 text-right">
                                            Acciones
                                        </th>
                                    )}
                                </tr>
                            )}
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {tab === "types" &&
                                types.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4 font-semibold text-slate-800">
                                            {item.name}
                                        </td>
                                        <td className="max-w-xs px-5 py-4 text-slate-500">
                                            {item.description || "—"}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {item._count.models}
                                        </td>
                                        <td className="px-5 py-4">
                                            <Status active={item.isActive} />
                                        </td>
                                        {canEdit && (
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        disabled={pending}
                                                        onClick={() =>
                                                            openEditType(item)
                                                        }
                                                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title={
                                                            item.isActive
                                                                ? "Desactivar"
                                                                : "Activar"
                                                        }
                                                        disabled={pending}
                                                        onClick={() =>
                                                            handleToggle(
                                                                item,
                                                                "types"
                                                            )
                                                        }
                                                        className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                                                    >
                                                        {item.isActive ? (
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

                            {tab === "models" &&
                                models.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4 font-semibold text-slate-800">
                                            {item.brand}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="block font-semibold text-slate-800">
                                                {item.name}
                                            </span>
                                            {item.description && (
                                                <span className="block max-w-xs truncate text-xs text-slate-500">
                                                    {item.description}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {item.vehicleType.name}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {item.capacity === null
                                                ? "—"
                                                : `${item.capacity} pasajeros`}
                                        </td>
                                        <td className="px-5 py-4">
                                            <Status active={item.isActive} />
                                        </td>
                                        {canEdit && (
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        disabled={pending}
                                                        onClick={() =>
                                                            openEditModel(item)
                                                        }
                                                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title={
                                                            item.isActive
                                                                ? "Desactivar"
                                                                : "Activar"
                                                        }
                                                        disabled={pending}
                                                        onClick={() =>
                                                            handleToggle(
                                                                item,
                                                                "models"
                                                            )
                                                        }
                                                        className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                                                    >
                                                        {item.isActive ? (
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

                            {(tab === "types"
                                ? types.length === 0
                                : models.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={tab === "types" ? (canEdit ? 5 : 4) : (canEdit ? 6 : 5)}
                                            className="px-6 py-14 text-center text-slate-500"
                                        >
                                            No se encontraron registros.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAGINACIÓN */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-slate-500">
                    Mostrando {firstItem} - {lastItem} de {totalRecords}
                </span>

                <nav
                    aria-label="Paginación de vehículos"
                    className="flex flex-wrap items-center gap-2"
                >
                    {currentPage > 1 ? (
                        <Link
                            href={makeUrl(tab, currentPage - 1, query)}
                            scroll={false}
                            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                            aria-label="Página anterior"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    ) : (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-300">
                            <ChevronLeft className="h-4 w-4" />
                        </span>
                    )}

                    {pageNumbers.map((page, index) => (
                        <div key={page} className="flex items-center gap-2">
                            {index > 0 &&
                                page - pageNumbers[index - 1] > 1 && (
                                    <span className="text-slate-400">...</span>
                                )}

                            <Link
                                href={makeUrl(tab, page, query)}
                                scroll={false}
                                aria-current={
                                    page === currentPage ? "page" : undefined
                                }
                                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold ${page === currentPage
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                {page}
                            </Link>
                        </div>
                    ))}

                    {currentPage < totalPages ? (
                        <Link
                            href={makeUrl(tab, currentPage + 1, query)}
                            scroll={false}
                            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                            aria-label="Página siguiente"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    ) : (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                        </span>
                    )}
                </nav>
            </div>

            {/* MODAL */}
            {modalOpen && canEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <form
                        onSubmit={handleSubmit}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="vehicle-modal-title"
                        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                            <div>
                                <h2
                                    id="vehicle-modal-title"
                                    className="text-xl font-bold text-slate-900"
                                >
                                    {editingId ? "Editar" : "Nuevo"}{" "}
                                    {tab === "types"
                                        ? "tipo de vehículo"
                                        : "modelo de vehículo"}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Completa los datos del catálogo.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={pending}
                                aria-label="Cerrar"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 p-6">
                            {tab === "types" ? (
                                <>
                                    <label className={labelClass}>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Nombre del tipo *
                                        </span>
                                        <input
                                            required
                                            maxLength={120}
                                            value={typeForm.name}
                                            onChange={(event) =>
                                                setTypeForm((previous) => ({
                                                    ...previous,
                                                    name: event.target.value,
                                                }))
                                            }
                                            placeholder="Ej. Camioneta 4x4"
                                            className={inputClass}
                                        />
                                    </label>

                                    <label className={labelClass}>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Descripción
                                        </span>
                                        <textarea
                                            rows={3}
                                            value={typeForm.description}
                                            onChange={(event) =>
                                                setTypeForm((previous) => ({
                                                    ...previous,
                                                    description:
                                                        event.target.value,
                                                }))
                                            }
                                            className={`${inputClass} resize-y`}
                                            placeholder="Descripción opcional"
                                        />
                                    </label>
                                </>
                            ) : (
                                <>
                                    <label className={labelClass}>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Tipo de vehículo *
                                        </span>
                                        <select
                                            required
                                            value={modelForm.vehicleTypeId}
                                            onChange={(event) =>
                                                setModelForm((previous) => ({
                                                    ...previous,
                                                    vehicleTypeId:
                                                        event.target.value,
                                                }))
                                            }
                                            className={inputClass}
                                        >
                                            <option value="">
                                                Seleccionar tipo
                                            </option>
                                            {availableTypes
                                                .filter(
                                                    (item) =>
                                                        item.isActive ||
                                                        item.id ===
                                                        modelForm.vehicleTypeId
                                                )
                                                .map((item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                        disabled={!item.isActive}
                                                    >
                                                        {item.name}
                                                        {!item.isActive
                                                            ? " (Inactivo)"
                                                            : ""}
                                                    </option>
                                                ))}
                                        </select>
                                        {availableTypes.every(
                                            (item) => !item.isActive
                                        ) && (
                                                <span className="text-xs text-amber-700">
                                                    Primero registra o activa un
                                                    tipo de vehículo.
                                                </span>
                                            )}
                                    </label>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className={labelClass}>
                                            <span className="text-sm font-semibold text-slate-700">
                                                Marca *
                                            </span>
                                            <input
                                                required
                                                maxLength={100}
                                                value={modelForm.brand}
                                                onChange={(event) =>
                                                    setModelForm((previous) => ({
                                                        ...previous,
                                                        brand: event.target.value,
                                                    }))
                                                }
                                                placeholder="Ej. Toyota"
                                                className={inputClass}
                                            />
                                        </label>

                                        <label className={labelClass}>
                                            <span className="text-sm font-semibold text-slate-700">
                                                Modelo *
                                            </span>
                                            <input
                                                required
                                                maxLength={120}
                                                value={modelForm.name}
                                                onChange={(event) =>
                                                    setModelForm((previous) => ({
                                                        ...previous,
                                                        name: event.target.value,
                                                    }))
                                                }
                                                placeholder="Ej. Hilux"
                                                className={inputClass}
                                            />
                                        </label>
                                    </div>

                                    <label className={labelClass}>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Capacidad de pasajeros
                                        </span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={2147483647}
                                            step={1}
                                            value={modelForm.capacity}
                                            onChange={(event) =>
                                                setModelForm((previous) => ({
                                                    ...previous,
                                                    capacity: event.target.value,
                                                }))
                                            }
                                            placeholder="Ej. 5"
                                            className={inputClass}
                                        />
                                    </label>

                                    <label className={labelClass}>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Descripción
                                        </span>
                                        <textarea
                                            rows={3}
                                            value={modelForm.description}
                                            onChange={(event) =>
                                                setModelForm((previous) => ({
                                                    ...previous,
                                                    description:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="Características del modelo"
                                            className={`${inputClass} resize-y`}
                                        />
                                    </label>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
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
                                className={primaryButton}
                            >
                                {pending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {pending ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
