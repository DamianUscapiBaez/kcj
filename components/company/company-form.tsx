"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Building2, Loader2, ShieldAlert } from "lucide-react";

import {
    updateCompany,
    type CompanyInput,
} from "@/app/actions/company";

type Props = {
    initialData: CompanyInput;
    canEdit: boolean;
};

type GeneralField = "taxId" | "legalName" | "tradeName" | "address";

type GeneralForm = Pick<CompanyInput, GeneralField>;

const fields: {
    key: GeneralField;
    label: string;
    placeholder: string;
    required?: boolean;
    full?: boolean;
    maxLength: number;
}[] = [
        {
            key: "taxId",
            label: "RUC",
            placeholder: "20123456789",
            required: true,
            maxLength: 11,
        },
        {
            key: "legalName",
            label: "Razón social",
            placeholder: "EMPRESA S.A.C.",
            required: true,
            maxLength: 200,
        },
        {
            key: "tradeName",
            label: "Nombre comercial",
            placeholder: "Nombre del negocio",
            full: true,
            maxLength: 200,
        },
        {
            key: "address",
            label: "Dirección fiscal",
            placeholder: "Av. Principal 123, Cusco",
            full: true,
            maxLength: 500,
        },
    ];

export default function CompanyForm({
    initialData,
    canEdit,
}: Props) {
    const router = useRouter();

    const [form, setForm] = useState<GeneralForm>({
        taxId: initialData.taxId,
        legalName: initialData.legalName,
        tradeName: initialData.tradeName ?? "",
        address: initialData.address ?? "",
    });

    const [pending, startTransition] = useTransition();

    function change(field: GeneralField, value: string) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canEdit || pending) return;

        if (!/^\d{11}$/.test(form.taxId.trim())) {
            void Swal.fire({
                icon: "warning",
                title: "RUC inválido",
                text: "El RUC debe contener exactamente 11 dígitos.",
                confirmButtonColor: "#2563eb",
            });
            return;
        }

        startTransition(async () => {
            try {
                const result = await updateCompany({
                    ...form
                });

                if (result.ok) {
                    await Swal.fire({
                        icon: "success",
                        title: "Cambios guardados",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                        timer: 1800,
                        showConfirmButton: false,
                    });

                    router.refresh();
                } else {
                    await Swal.fire({
                        icon: "error",
                        title: "No se pudo guardar",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                    });
                }
            } catch (error) {
                console.error("Error al actualizar empresa:", error);

                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "Ocurrió un problema al actualizar la empresa.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    return (
        <form
            onSubmit={submit}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-100"
        >
            {/* Encabezado */}
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
                    <Building2 className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        Información general
                    </h2>
                    <p className="text-xs text-slate-500">
                        Datos comerciales y fiscales de la empresa.
                    </p>
                </div>
            </div>

            {/* Campos del formulario */}
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                {fields.map((field) => (
                    <div
                        key={field.key}
                        className={field.full ? "md:col-span-2" : ""}
                    >
                        <label
                            htmlFor={field.key}
                            className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase"
                        >
                            {field.label}

                            {field.required && (
                                <span className="ml-1 text-red-500">
                                    *
                                </span>
                            )}
                        </label>

                        <input
                            id={field.key}
                            type="text"
                            value={form[field.key]}
                            onChange={(event) =>
                                change(field.key, event.target.value)
                            }
                            placeholder={field.placeholder}
                            required={field.required}
                            disabled={!canEdit || pending}
                            maxLength={field.maxLength}
                            inputMode={
                                field.key === "taxId"
                                    ? "numeric"
                                    : "text"
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                    </div>
                ))}
            </div>

            {/* Pie de formulario / Botón de acción */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="flex items-center justify-end">
                    {canEdit ? (
                        <button
                            type="submit"
                            disabled={pending}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                        >
                            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {pending ? "Guardando..." : "Guardar cambios"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 border border-amber-200/60">
                            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <span>No tienes permisos para editar la información de la empresa.</span>
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}