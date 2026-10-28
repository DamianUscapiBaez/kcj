"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    updateCompany,
    type CompanyInput,
} from "@/app/actions/company";

type Props = {
    initialData: CompanyInput;
    canEdit: boolean;
};

export default function CompanyForm({
    initialData,
    canEdit,
}: Props) {
    const router = useRouter();

    const [form, setForm] = useState(initialData);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    function change(field: keyof CompanyInput, value: string) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canEdit || pending) return;

        setMessage("");

        startTransition(async () => {
            const result = await updateCompany(form);

            setSuccess(result.ok);
            setMessage(result.message);

            if (result.ok) {
                router.refresh();
            }
        });
    }

    const fields: {
        key: keyof CompanyInput;
        label: string;
        placeholder: string;
        type?: string;
        required?: boolean;
        full?: boolean;
    }[] = [
            {
                key: "taxId",
                label: "RUC",
                placeholder: "20123456789",
                required: true,
            },
            {
                key: "legalName",
                label: "Razón social",
                placeholder: "EMPRESA S.A.C.",
                required: true,
            },
            {
                key: "tradeName",
                label: "Nombre comercial",
                placeholder: "Nombre del negocio",
            },
            {
                key: "phone",
                label: "Teléfono",
                placeholder: "+51 999 999 999",
            },
            {
                key: "email",
                label: "Correo electrónico",
                placeholder: "contacto@empresa.com",
                type: "email",
            },
            {
                key: "address",
                label: "Dirección fiscal",
                placeholder: "Av. Principal 123, Cusco",
                full: true,
            },
        ];

    return (
        <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
            <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                    Información general
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Datos comerciales y de contacto.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                {fields.map((field) => (
                    <div
                        key={field.key}
                        className={field.full ? "md:col-span-2" : ""}
                    >
                        <label
                            htmlFor={field.key}
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            {field.label}
                            {field.required && (
                                <span className="ml-1 text-red-500">*</span>
                            )}
                        </label>

                        <input
                            id={field.key}
                            type={field.type ?? "text"}
                            value={form[field.key]}
                            onChange={(event) =>
                                change(field.key, event.target.value)
                            }
                            placeholder={field.placeholder}
                            required={field.required}
                            disabled={!canEdit || pending}
                            maxLength={
                                field.key === "taxId" ? 11 : undefined
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                        />
                    </div>
                ))}
            </div>

            <div className="border-t border-slate-100 px-6 py-5">
                {message && (
                    <p
                        role="status"
                        className={`mb-4 text-sm ${success ? "text-emerald-600" : "text-red-600"
                            }`}
                    >
                        {message}
                    </p>
                )}

                <div className="flex justify-end">
                    {canEdit ? (
                        <button
                            type="submit"
                            disabled={pending}
                            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {pending ? "Guardando..." : "Guardar cambios"}
                        </button>
                    ) : (
                        <p className="text-sm text-slate-500">
                            No tienes permisos para editar la empresa.
                        </p>
                    )}
                </div>
            </div>
        </form>
    );
}