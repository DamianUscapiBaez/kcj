"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
    Phone as PhoneIcon,
    Plus,
    Loader2,
    CheckCircle2,
    XCircle,
    Trash2,
    Pencil,
    PhoneCall
} from "lucide-react";

import {
    saveCompanyPhone,
    deleteCompanyPhone,
    type CompanyPhoneInput,
} from "@/app/actions/company-phones";

type Phone = CompanyPhoneInput & {
    id: string;
    position: number;
};

type Props = {
    phones: Phone[];
    canEdit: boolean;
};

const emptyForm: CompanyPhoneInput = {
    label: "",
    number: "",
    isPrimary: false,
    isActive: true,
};

type PhoneForm = CompanyPhoneInput & { id?: string };

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export default function CompanyPhones({ phones, canEdit }: Props) {
    const router = useRouter();
    const [form, setForm] = useState<PhoneForm>(emptyForm);
    const [editing, setEditing] = useState(false);
    const [pending, startTransition] = useTransition();

    function openNew() {
        setForm(emptyForm);
        setEditing(true);
    }

    function openEdit(phone: Phone) {
        setForm({
            id: phone.id,
            label: phone.label,
            number: phone.number,
            isPrimary: phone.isPrimary,
            isActive: phone.isActive,
        });
        setEditing(true);
    }

    function save() {
        if (pending) return;

        startTransition(async () => {
            try {
                const { id, ...phoneInput } = form;
                const result = await saveCompanyPhone(id ?? null, phoneInput);

                if (!result.ok) {
                    await Swal.fire({
                        icon: "error",
                        title: "No se pudo guardar",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                    });
                    return;
                }

                setEditing(false);
                setForm(emptyForm);
                router.refresh();

                await Swal.fire({
                    icon: "success",
                    title: "Teléfono guardado",
                    text: result.message,
                    timer: 1500,
                    showConfirmButton: false,
                });
            } catch {
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "No se pudo completar la operación.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    async function remove(id: string) {
        const confirm = await Swal.fire({
            title: "¿Eliminar teléfono?",
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirm.isConfirmed) return;

        startTransition(async () => {
            try {
                const result = await deleteCompanyPhone(id);

                if (result.ok) {
                    router.refresh();
                    await Swal.fire({
                        icon: "success",
                        title: "Teléfono eliminado",
                        text: result.message,
                        timer: 1500,
                        showConfirmButton: false,
                    });
                } else {
                    await Swal.fire({
                        icon: "error",
                        title: "No se pudo eliminar",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                    });
                }
            } catch {
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "Ocurrió un problema al eliminar el teléfono.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-100">
            {/* Cabecera unificada */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
                        <PhoneIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Teléfonos de la empresa
                        </h2>
                        <p className="text-xs text-slate-500">
                            Administra los números de contacto para documentos y cotizaciones.
                        </p>
                    </div>
                </div>

                {canEdit && !editing && (
                    <button
                        type="button"
                        onClick={openNew}
                        disabled={pending}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Agregar teléfono
                    </button>
                )}
            </div>

            <div className="p-6 space-y-6">
                {/* Formulario de creación / edición */}
                {editing && canEdit && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            save();
                        }}
                        className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-xl shadow-blue-50/50"
                    >
                        <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/40 px-6 py-4">
                            <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                                <PhoneCall className="h-4 w-4 text-blue-600" />
                                <span>{form.id ? "Editar teléfono" : "Registrar nuevo teléfono"}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                disabled={pending}
                                className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase">
                                    Etiqueta <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    maxLength={100}
                                    value={form.label}
                                    onChange={(e) =>
                                        setForm({ ...form, label: e.target.value })
                                    }
                                    placeholder="Ventas, oficina, administración..."
                                    className={inputClass}
                                    disabled={pending}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase">
                                    Número telefónico <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    minLength={6}
                                    maxLength={40}
                                    type="tel"
                                    value={form.number}
                                    onChange={(e) =>
                                        setForm({ ...form, number: e.target.value })
                                    }
                                    placeholder="+51 999 999 999"
                                    className={inputClass}
                                    disabled={pending}
                                />
                            </div>
                        </div>

                        <div className="px-6 pb-2 flex flex-wrap gap-6">
                            <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isPrimary}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            isPrimary: e.target.checked,
                                        })
                                    }
                                    disabled={pending}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Teléfono principal
                            </label>

                            <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            isActive: e.target.checked,
                                            isPrimary: e.target.checked ? form.isPrimary : false,
                                        })
                                    }
                                    disabled={pending}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Activo
                            </label>
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                disabled={pending}
                                onClick={() => setEditing(false)}
                                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={pending}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {pending ? "Guardando..." : "Guardar teléfono"}
                            </button>
                        </div>
                    </form>
                )}

                {/* Listado de teléfonos */}
                {phones.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3">
                            <PhoneIcon className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-slate-800">
                            Todavía no hay teléfonos registrados.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Agrega números de teléfono para que tus clientes puedan contactarte.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {phones.map((phone) => (
                            <div
                                key={phone.id}
                                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-slate-900 text-base">
                                                {phone.label}
                                            </h3>
                                            {phone.isPrimary && (
                                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
                                                    Principal
                                                </span>
                                            )}
                                        </div>

                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${phone.isActive
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                    : "bg-slate-100 text-slate-600 border border-slate-200/60"
                                                }`}
                                        >
                                            {phone.isActive ? (
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            ) : (
                                                <XCircle className="h-3.5 w-3.5" />
                                            )}
                                            {phone.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                    </div>

                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                        <p className="font-mono font-semibold text-slate-800 text-sm">
                                            {phone.number}
                                        </p>
                                    </div>
                                </div>

                                {canEdit && (
                                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                        <button
                                            type="button"
                                            disabled={pending}
                                            onClick={() => openEdit(phone)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            disabled={pending}
                                            onClick={() => remove(phone.id)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors ml-auto disabled:opacity-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}