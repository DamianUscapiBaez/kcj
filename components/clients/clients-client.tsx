"use client";
import { viewStyles } from "../ui/view-styles";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import type { DocumentType } from "@/app/generated/prisma/client";
import type { ClientInput } from "@/app/actions/clients";

import { saveClient, setClientActive } from "@/app/actions/clients";

import {
    Users,
    Plus,
    Search,
    Pencil,
    Power,
    PowerOff,
    X,
    Save,
    LoaderCircle,
    Trash2,
    UserRound,
    Building2,
    Phone,
    Mail,
} from "lucide-react";

type ContactRow = {
    id: string;
    name: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    isPrimary: boolean;
};

export type ClientRow = {
    id: string;
    documentType: DocumentType;
    documentNumber: string;
    legalName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    isActive: boolean;
    contacts: ContactRow[];
};

type Props = {
    clients: ClientRow[];
    canEdit: boolean;
};

type ContactForm = {
    id?: string;
    name: string;
    position: string;
    phone: string;
    email: string;
    isPrimary: boolean;
};

type ClientForm = {
    documentType: DocumentType;
    documentNumber: string;
    legalName: string;
    phone: string;
    email: string;
    address: string;
    contacts: ContactForm[];
};

const DOCUMENT_TYPES: {
    value: DocumentType;
    label: string;
}[] = [
        { value: "RUC", label: "RUC" },
        { value: "DNI", label: "DNI" },
        { value: "CE", label: "Carné de extranjería" },
        { value: "PASSPORT", label: "Pasaporte" },
        { value: "OTHER", label: "Otro" },
    ];

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const labelClass = "block space-y-1.5";

function emptyForm(): ClientForm {
    return {
        documentType: "RUC",
        documentNumber: "",
        legalName: "",
        phone: "",
        email: "",
        address: "",
        contacts: [],
    };
}

export default function ClientsClient({
    clients,
    canEdit,
}: Props) {
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState<ClientRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<ClientForm>(emptyForm);
    const [pending, startTransition] = useTransition();

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return clients;

        return clients.filter((client) =>
            [
                client.documentType,
                client.documentNumber,
                client.legalName,
                client.phone ?? "",
                client.email ?? "",
                client.address ?? "",
                ...client.contacts.flatMap((contact) => [
                    contact.name,
                    contact.position ?? "",
                    contact.phone ?? "",
                    contact.email ?? "",
                ]),
            ].some((value) => value.toLowerCase().includes(term))
        );
    }, [clients, search]);

    function openCreate() {
        if (!canEdit || pending) return;

        setEditing(null);
        setForm(emptyForm());
        setModalOpen(true);
    }

    function openEdit(client: ClientRow) {
        if (!canEdit || pending) return;

        setEditing(client);

        setForm({
            documentType: client.documentType,
            documentNumber: client.documentNumber,
            legalName: client.legalName,
            phone: client.phone ?? "",
            email: client.email ?? "",
            address: client.address ?? "",
            contacts: client.contacts.map((contact) => ({
                id: contact.id,
                name: contact.name,
                position: contact.position ?? "",
                phone: contact.phone ?? "",
                email: contact.email ?? "",
                isPrimary: contact.isPrimary,
            })),
        });

        setModalOpen(true);
    }

    function closeModal() {
        if (pending) return;

        setModalOpen(false);
        setEditing(null);
    }

    function updateField(
        field:
            | "documentNumber"
            | "legalName"
            | "phone"
            | "email"
            | "address",
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function addContact() {
        setForm((previous) => ({
            ...previous,
            contacts: [
                ...previous.contacts,
                {
                    name: "",
                    position: "",
                    phone: "",
                    email: "",
                    isPrimary: previous.contacts.length === 0,
                },
            ],
        }));
    }

    function updateContact(
        index: number,
        field: "name" | "position" | "phone" | "email",
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            contacts: previous.contacts.map((contact, i) =>
                i === index
                    ? { ...contact, [field]: value }
                    : contact
            ),
        }));
    }

    function setPrimaryContact(index: number) {
        setForm((previous) => ({
            ...previous,
            contacts: previous.contacts.map((contact, i) => ({
                ...contact,
                isPrimary: i === index,
            })),
        }));
    }

    function removeContact(index: number) {
        setForm((previous) => {
            const contacts = previous.contacts.filter(
                (_, i) => i !== index
            );

            if (
                contacts.length > 0 &&
                !contacts.some((contact) => contact.isPrimary)
            ) {
                contacts[0] = {
                    ...contacts[0],
                    isPrimary: true,
                };
            }

            return {
                ...previous,
                contacts,
            };
        });
    }

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!canEdit || pending) return;

        const isEditing = editing !== null;

        const input: ClientInput = {
            documentType: form.documentType,
            documentNumber: form.documentNumber.trim(),
            legalName: form.legalName.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
            contacts: form.contacts.map((contact) => ({
                id: contact.id,
                name: contact.name.trim(),
                position: contact.position.trim() || null,
                phone: contact.phone.trim() || null,
                email: contact.email.trim() || null,
                isPrimary: contact.isPrimary,
            })),
        };

        startTransition(async () => {
            try {
                const result = await saveClient(
                    editing?.id ?? null,
                    input
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
                        ? "Cliente actualizado"
                        : "Cliente registrado",
                    text: result.message,
                    timer: 1800,
                    showConfirmButton: false,
                });
            } catch {
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "No se pudo guardar el cliente.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    async function handleToggle(client: ClientRow) {
        if (!canEdit || pending) return;

        const active = !client.isActive;

        const confirmation = await Swal.fire({
            icon: "question",
            title: active
                ? "¿Activar cliente?"
                : "¿Desactivar cliente?",
            text: active
                ? "El cliente volverá a estar disponible."
                : "El cliente dejará de estar disponible para nuevas operaciones.",
            showCancelButton: true,
            confirmButtonText: active
                ? "Sí, activar"
                : "Sí, desactivar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: active
                ? "#059669"
                : "#d97706",
        });

        if (!confirmation.isConfirmed) return;

        startTransition(async () => {
            try {
                const result = await setClientActive(
                    client.id,
                    active
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
                    title: active
                        ? "Cliente activado"
                        : "Cliente desactivado",
                    text: result.message,
                    timer: 1600,
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

    return (
        <section className={viewStyles.page}>
            {/* ENCABEZADO */}
            <div className={viewStyles.header}>
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Gestión comercial
                    </span>

                    <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        <Users className="h-7 w-7 text-blue-600" />
                        Clientes
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Administra clientes y sus personas de contacto.
                    </p>
                </div>

                {canEdit && (
                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={pending}
                        className={viewStyles.primaryButton}
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo cliente
                    </button>
                )}
            </div>

            {/* TABLA */}
            <div className={viewStyles.panel}>
                <div className={viewStyles.toolbar}>
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Buscar clientes..."
                            aria-label="Buscar clientes"
                            className={`${inputClass} pl-10`}
                        />
                    </div>

                    <span className="text-sm font-medium text-slate-500">
                        {filtered.length}{" "}
                        {filtered.length === 1
                            ? "cliente"
                            : "clientes"}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className={viewStyles.table}>
                        <thead className={viewStyles.tableHead}>
                            <tr>
                                <th className="px-5 py-4">Documento</th>
                                <th className="px-5 py-4">Cliente</th>
                                <th className="px-5 py-4">Teléfono</th>
                                <th className="px-5 py-4">Correo</th>
                                <th className="px-5 py-4">Contactos</th>
                                <th className="px-5 py-4">Estado</th>
                                {canEdit && (
                                    <th className="px-5 py-4 text-right">
                                        Acciones
                                    </th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((client) => (
                                <tr
                                    key={client.id}
                                    className="transition hover:bg-slate-50"
                                >
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <span className="block font-semibold text-slate-800">
                                            {client.documentType}
                                        </span>
                                        <span className="text-slate-500">
                                            {client.documentNumber}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className="block font-semibold text-slate-800">
                                            {client.legalName}
                                        </span>
                                        <span className="block max-w-xs truncate text-xs text-slate-500">
                                            {client.address || "Sin dirección"}
                                        </span>
                                    </td>

                                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                        {client.phone || "—"}
                                    </td>

                                    <td className="px-5 py-4 text-slate-600">
                                        {client.email || "—"}
                                    </td>

                                    <td className="px-5 py-4 text-slate-600">
                                        {client.contacts.length}
                                    </td>

                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${client.isActive
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {client.isActive
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </td>

                                    {canEdit && (
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    title="Editar cliente"
                                                    aria-label={`Editar ${client.legalName}`}
                                                    onClick={() => openEdit(client)}
                                                    disabled={pending}
                                                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    title={
                                                        client.isActive
                                                            ? "Desactivar"
                                                            : "Activar"
                                                    }
                                                    aria-label={`${client.isActive
                                                            ? "Desactivar"
                                                            : "Activar"
                                                        } ${client.legalName}`}
                                                    onClick={() =>
                                                        handleToggle(client)
                                                    }
                                                    disabled={pending}
                                                    className={`rounded-lg p-2 disabled:opacity-50 ${client.isActive
                                                            ? "text-amber-600 hover:bg-amber-50"
                                                            : "text-emerald-600 hover:bg-emerald-50"
                                                        }`}
                                                >
                                                    {client.isActive ? (
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
                                        No se encontraron clientes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {modalOpen && canEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <form
                        onSubmit={handleSubmit}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="client-modal-title"
                        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
                            <div>
                                <h2
                                    id="client-modal-title"
                                    className="text-xl font-bold text-slate-900"
                                >
                                    {editing
                                        ? "Editar cliente"
                                        : "Nuevo cliente"}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Datos comerciales y personas de contacto
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={pending}
                                aria-label="Cerrar formulario"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-8 p-6">
                            {/* DATOS DEL CLIENTE */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    Datos del cliente
                                </h3>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className={labelClass}>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Tipo de documento *
                                        </span>

                                        <select
                                            required
                                            value={form.documentType}
                                            onChange={(event) => {
                                                const selected =
                                                    DOCUMENT_TYPES.find(
                                                        (item) =>
                                                            item.value ===
                                                            event.target.value
                                                    );

                                                if (selected) {
                                                    setForm((previous) => ({
                                                        ...previous,
                                                        documentType:
                                                            selected.value,
                                                    }));
                                                }
                                            }}
                                            className={inputClass}
                                        >
                                            {DOCUMENT_TYPES.map((item) => (
                                                <option
                                                    key={item.value}
                                                    value={item.value}
                                                >
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className={labelClass}>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Número de documento *
                                        </span>

                                        <input
                                            required
                                            maxLength={30}
                                            value={form.documentNumber}
                                            onChange={(event) =>
                                                updateField(
                                                    "documentNumber",
                                                    event.target.value
                                                )
                                            }
                                            placeholder={
                                                form.documentType === "RUC"
                                                    ? "11 dígitos"
                                                    : form.documentType === "DNI"
                                                        ? "8 dígitos"
                                                        : "Número de documento"
                                            }
                                            className={inputClass}
                                        />
                                    </label>
                                </div>

                                <label className={labelClass}>
                                    <span className="text-sm font-semibold text-slate-700">
                                        Razón social o nombre *
                                    </span>

                                    <input
                                        required
                                        maxLength={200}
                                        value={form.legalName}
                                        onChange={(event) =>
                                            updateField(
                                                "legalName",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Nombre o razón social"
                                        className={inputClass}
                                    />
                                </label>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className={labelClass}>
                                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <Phone className="h-4 w-4" />
                                            Teléfono
                                        </span>

                                        <input
                                            type="tel"
                                            maxLength={40}
                                            value={form.phone}
                                            onChange={(event) =>
                                                updateField(
                                                    "phone",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Teléfono de la empresa"
                                            className={inputClass}
                                        />
                                    </label>

                                    <label className={labelClass}>
                                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <Mail className="h-4 w-4" />
                                            Correo electrónico
                                        </span>

                                        <input
                                            type="email"
                                            maxLength={200}
                                            value={form.email}
                                            onChange={(event) =>
                                                updateField(
                                                    "email",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="correo@empresa.com"
                                            className={inputClass}
                                        />
                                    </label>
                                </div>

                                <label className={labelClass}>
                                    <span className="text-sm font-semibold text-slate-700">
                                        Dirección
                                    </span>

                                    <textarea
                                        rows={2}
                                        value={form.address}
                                        onChange={(event) =>
                                            updateField(
                                                "address",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Dirección fiscal o comercial"
                                        className={`${inputClass} resize-y`}
                                    />
                                </label>
                            </div>

                            {/* PERSONAS DE CONTACTO */}
                            <div className="space-y-4 border-t border-slate-200 pt-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                                            <UserRound className="h-5 w-5 text-blue-600" />
                                            Personas de contacto
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Puedes registrar varios contactos.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addContact}
                                        disabled={pending}
                                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Agregar contacto
                                    </button>
                                </div>

                                {form.contacts.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                        No hay personas de contacto registradas.
                                    </div>
                                )}

                                {form.contacts.map((contact, index) => (
                                    <div
                                        key={contact.id ?? `new-${index}`}
                                        className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-bold text-slate-800">
                                                Contacto {index + 1}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeContact(index)
                                                }
                                                disabled={pending}
                                                title="Eliminar contacto"
                                                className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className={labelClass}>
                                                <span className="text-sm font-semibold text-slate-700">
                                                    Nombre completo *
                                                </span>

                                                <input
                                                    required
                                                    maxLength={160}
                                                    value={contact.name}
                                                    onChange={(event) =>
                                                        updateContact(
                                                            index,
                                                            "name",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Nombre del contacto"
                                                    className={inputClass}
                                                />
                                            </label>

                                            <label className={labelClass}>
                                                <span className="text-sm font-semibold text-slate-700">
                                                    Cargo
                                                </span>

                                                <input
                                                    maxLength={100}
                                                    value={contact.position}
                                                    onChange={(event) =>
                                                        updateContact(
                                                            index,
                                                            "position",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Ej. Jefe de operaciones"
                                                    className={inputClass}
                                                />
                                            </label>

                                            <label className={labelClass}>
                                                <span className="text-sm font-semibold text-slate-700">
                                                    Teléfono
                                                </span>

                                                <input
                                                    type="tel"
                                                    maxLength={40}
                                                    value={contact.phone}
                                                    onChange={(event) =>
                                                        updateContact(
                                                            index,
                                                            "phone",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Número de contacto"
                                                    className={inputClass}
                                                />
                                            </label>

                                            <label className={labelClass}>
                                                <span className="text-sm font-semibold text-slate-700">
                                                    Correo electrónico
                                                </span>

                                                <input
                                                    type="email"
                                                    maxLength={200}
                                                    value={contact.email}
                                                    onChange={(event) =>
                                                        updateContact(
                                                            index,
                                                            "email",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="contacto@empresa.com"
                                                    className={inputClass}
                                                />
                                            </label>
                                        </div>

                                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                                            <input
                                                type="radio"
                                                name="primaryContact"
                                                checked={contact.isPrimary}
                                                onChange={() =>
                                                    setPrimaryContact(index)
                                                }
                                                className="h-4 w-4 accent-blue-600"
                                            />
                                            Contacto principal
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACCIONES */}
                        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
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
                                    : "Guardar cliente"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}