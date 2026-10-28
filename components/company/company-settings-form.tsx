"use client";

import { useState, useTransition, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
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
    const [form, setForm] = useState(initialData);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    function submit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canEdit || pending) return;

        setMessage("");

        startTransition(async () => {
            const result = await saveCompanySettings(form);

            setSuccess(result.ok);
            setMessage(result.message);

            if (result.ok) router.refresh();
        });
    }

    const inputClass =
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

    return (
        <form onSubmit={submit} className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">
                    Configuración de cotizaciones
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Valores predeterminados para nuevas cotizaciones.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Moneda predeterminada
                    </label>
                    <select
                        value={form.defaultCurrency}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                defaultCurrency: e.target.value as "PEN" | "USD",
                            })
                        }
                        className={inputClass}
                    >
                        <option value="PEN">Soles (PEN)</option>
                        <option value="USD">Dólares (USD)</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        IGV predeterminado (%)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        value={String(form.defaultTaxRate)}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                defaultTaxRate: Number(e.target.value),
                            })
                        }
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Días de validez
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        step="1"
                        required
                        value={String(form.defaultValidityDays)}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                defaultValidityDays: Number(e.target.value),
                            })
                        }
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Prefijo de cotización
                    </label>
                    <input
                        type="text"
                        maxLength={10}
                        required
                        value={form.quotationPrefix}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                quotationPrefix: e.target.value.toUpperCase(),
                            })
                        }
                        placeholder="CT"
                        className={inputClass}
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium">
                        Términos y condiciones predeterminados
                    </label>
                    <textarea
                        rows={6}
                        maxLength={5000}
                        value={String(form.defaultTerms ?? "")}
                        disabled={!canEdit || pending}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                defaultTerms: e.target.value,
                            })
                        }
                        placeholder="Condiciones que aparecerán en las cotizaciones..."
                        className={inputClass}
                    />
                </div>
            </div>

            {message && (
                <p
                    role="status"
                    className={`text-sm ${success ? "text-emerald-600" : "text-red-600"
                        }`}
                >
                    {message}
                </p>
            )}

            {canEdit && (
                <div className="flex justify-end border-t border-slate-100 pt-5">
                    <button
                        type="submit"
                        disabled={pending}
                        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {pending ? "Guardando..." : "Guardar configuración"}
                    </button>
                </div>
            )}
        </form>
    );
}