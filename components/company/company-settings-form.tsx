"use client";

import {
    useState,
    useTransition,
    type FormEvent,
} from "react";

import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FileText, Loader2, ShieldAlert } from "lucide-react";

import {
    saveCompanySettings,
    type CompanySettingsInput,
} from "@/app/actions/company-settings";

type Props = {
    initialData: CompanySettingsInput;
    canEdit: boolean;
};

export default function CompanySettingsForm({
    initialData,
    canEdit,
}: Props) {
    const router = useRouter();

    const [form, setForm] =
        useState<CompanySettingsInput>(initialData);

    const [pending, startTransition] = useTransition();

    function updateField<K extends keyof CompanySettingsInput>(
        field: K,
        value: CompanySettingsInput[K]
    ) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canEdit || pending) return;

        startTransition(async () => {
            try {
                const result = await saveCompanySettings(form);

                if (result.ok) {
                    await Swal.fire({
                        icon: "success",
                        title: "Configuración guardada",
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
                console.error(
                    "Error al guardar configuración:",
                    error
                );

                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "Ocurrió un error al guardar la configuración.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    const inputClass =
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

    return (
        <form
            onSubmit={submit}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-100"
        >
            {/* Encabezado con Icono */}
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
                    <FileText className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        Configuración de cotizaciones
                    </h2>
                    <p className="text-xs text-slate-500">
                        Define los valores predeterminados que utilizará KCJ al crear nuevas cotizaciones.
                    </p>
                </div>
            </div>

            {/* Campos del formulario */}
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">

                {/* IGV */}
                <div>
                    <label
                        htmlFor="defaultTaxRate"
                        className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase"
                    >
                        IGV predeterminado (%) <span className="text-red-500">*</span>
                    </label>

                    <input
                        id="defaultTaxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        value={String(form.defaultTaxRate)}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            updateField(
                                "defaultTaxRate",
                                e.target.value
                            )
                        }
                        className={inputClass}
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                        Porcentaje aplicado por defecto a las nuevas cotizaciones.
                    </p>
                </div>

                {/* Vigencia */}
                <div>
                    <label
                        htmlFor="defaultValidityDays"
                        className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase"
                    >
                        Días de validez <span className="text-red-500">*</span>
                    </label>

                    <input
                        id="defaultValidityDays"
                        type="number"
                        min="1"
                        max="365"
                        step="1"
                        required
                        value={String(form.defaultValidityDays)}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            updateField(
                                "defaultValidityDays",
                                e.target.value
                            )
                        }
                        className={inputClass}
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                        Vigencia inicial de cada cotización.
                    </p>
                </div>

                {/* Prefijo */}
                <div className="md:col-span-2">
                    <label
                        htmlFor="quotationPrefix"
                        className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase"
                    >
                        Prefijo de cotización <span className="text-red-500">*</span>
                    </label>

                    <input
                        id="quotationPrefix"
                        type="text"
                        maxLength={12}
                        required
                        value={form.quotationPrefix}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            updateField(
                                "quotationPrefix",
                                e.target.value.toUpperCase()
                            )
                        }
                        placeholder="COT"
                        className={inputClass}
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                        Ejemplo: COT-2026-0001. Solo letras, números y guiones.
                    </p>
                </div>

                {/* Términos */}
                <div className="md:col-span-2">
                    <label
                        htmlFor="defaultTerms"
                        className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase"
                    >
                        Términos y condiciones predeterminados
                    </label>

                    <textarea
                        id="defaultTerms"
                        rows={6}
                        maxLength={5000}
                        value={String(form.defaultTerms ?? "")}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            updateField(
                                "defaultTerms",
                                e.target.value
                            )
                        }
                        placeholder="Escribe las condiciones que aparecerán en las cotizaciones..."
                        className={inputClass}
                    />

                    <div className="mt-1.5 flex justify-between gap-3">
                        <p className="text-xs text-slate-500">
                            Condiciones sugeridas para nuevas cotizaciones.
                        </p>

                        <span className="text-xs tabular-nums text-slate-400">
                            {String(form.defaultTerms ?? "").length}/5000
                        </span>
                    </div>
                </div>
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
                            {pending ? "Guardando..." : "Guardar configuración"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 border border-amber-200/60">
                            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <span>No tienes permisos para editar la configuración de cotizaciones.</span>
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}