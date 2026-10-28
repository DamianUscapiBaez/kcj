"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    saveBankAccount,
    toggleBankAccount,
    deleteBankAccount,
    type BankAccountInput,
} from "@/app/actions/company-bank-accounts";

type BankAccount = BankAccountInput & {
    id: string;
};

type Props = {
    accounts: BankAccount[];
    canEdit: boolean;
};

const EMPTY: BankAccountInput = {
    bankName: "",
    accountName: "",
    accountNumber: "",
    cci: "",
    currency: "PEN",
    isDetraction: false,
    isActive: true,
};

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

export default function CompanyBankAccounts({
    accounts,
    canEdit,
}: Props) {
    const router = useRouter();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<BankAccountInput>(EMPTY);
    const [showForm, setShowForm] = useState(false);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    function openCreate() {
        setEditingId(null);
        setForm({ ...EMPTY });
        setMessage("");
        setShowForm(true);
    }

    function openEdit(account: BankAccount) {
        setEditingId(account.id);
        setForm({
            bankName: account.bankName,
            accountName: account.accountName,
            accountNumber: account.accountNumber,
            cci: account.cci,
            currency: account.currency,
            isDetraction: account.isDetraction,
            isActive: account.isActive,
        });
        setMessage("");
        setShowForm(true);
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending || !canEdit) return;

        startTransition(async () => {
            const result = await saveBankAccount(editingId, form);

            setSuccess(result.ok);
            setMessage(result.message);

            if (result.ok) {
                setShowForm(false);
                setEditingId(null);
                router.refresh();
            }
        });
    }

    function toggle(account: BankAccount) {
        if (pending || !canEdit) return;

        startTransition(async () => {
            const result = await toggleBankAccount(
                account.id,
                account.isActive
            );

            setSuccess(result.ok);
            setMessage(result.message);

            if (result.ok) router.refresh();
        });
    }

    function remove(account: BankAccount) {
        if (pending || !canEdit) return;

        if (
            !window.confirm(
                `¿Eliminar la cuenta de ${account.bankName}?`
            )
        ) {
            return;
        }

        startTransition(async () => {
            const result = await deleteBankAccount(account.id);

            setSuccess(result.ok);
            setMessage(result.message);

            if (result.ok) router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Cuentas bancarias
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Administra las cuentas para tus cotizaciones.
                    </p>
                </div>

                {canEdit && (
                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={pending}
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        + Nueva cuenta
                    </button>
                )}
            </div>

            {message && (
                <p
                    role="status"
                    className={`rounded-xl p-3 text-sm ${success
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                >
                    {message}
                </p>
            )}

            {showForm && canEdit && (
                <form
                    onSubmit={submit}
                    className="space-y-5 rounded-xl border border-blue-200 bg-blue-50/30 p-5"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">
                            {editingId ? "Editar cuenta" : "Nueva cuenta"}
                        </h3>

                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            disabled={pending}
                            className="text-sm text-slate-500 hover:text-slate-900"
                        >
                            Cerrar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Banco *
                            </label>
                            <input
                                required
                                maxLength={100}
                                className={inputClass}
                                value={form.bankName}
                                onChange={(e) =>
                                    setForm({ ...form, bankName: e.target.value })
                                }
                                placeholder="BCP, Interbank, BBVA..."
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Titular de la cuenta
                            </label>
                            <input
                                maxLength={200}
                                className={inputClass}
                                value={form.accountName}
                                onChange={(e) =>
                                    setForm({ ...form, accountName: e.target.value })
                                }
                                placeholder="Razón social o titular"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Número de cuenta *
                            </label>
                            <input
                                required
                                maxLength={60}
                                className={inputClass}
                                value={form.accountNumber}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        accountNumber: e.target.value,
                                    })
                                }
                                placeholder="Número de cuenta bancaria"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                CCI
                            </label>
                            <input
                                maxLength={60}
                                className={inputClass}
                                value={form.cci}
                                onChange={(e) =>
                                    setForm({ ...form, cci: e.target.value })
                                }
                                placeholder="Código de cuenta interbancaria"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Moneda
                            </label>
                            <select
                                className={inputClass}
                                value={form.currency}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        currency: e.target.value as "PEN" | "USD",
                                    })
                                }
                            >
                                <option value="PEN">Soles (PEN)</option>
                                <option value="USD">Dólares (USD)</option>
                            </select>
                        </div>

                        <div className="flex flex-col justify-center gap-3">
                            <label className="flex items-center gap-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isDetraction}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            isDetraction: e.target.checked,
                                        })
                                    }
                                />
                                Cuenta de detracciones
                            </label>

                            <label className="flex items-center gap-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            isActive: e.target.checked,
                                        })
                                    }
                                />
                                Cuenta activa
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => setShowForm(false)}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={pending}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {pending ? "Guardando..." : "Guardar cuenta"}
                        </button>
                    </div>
                </form>
            )}

            {accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
                    <p className="font-medium text-slate-700">
                        Todavía no hay cuentas bancarias.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        Registra una cuenta para utilizarla en tus cotizaciones.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            className="rounded-xl border border-slate-200 bg-white p-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        {account.bankName}
                                    </h3>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {account.accountName || "Sin titular registrado"}
                                    </p>
                                </div>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${account.isActive
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    {account.isActive ? "Activa" : "Inactiva"}
                                </span>
                            </div>

                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                                <p>
                                    <span className="font-medium">Cuenta:</span>{" "}
                                    {account.accountNumber}
                                </p>

                                {account.cci && (
                                    <p>
                                        <span className="font-medium">CCI:</span>{" "}
                                        {account.cci}
                                    </p>
                                )}

                                <p>
                                    <span className="font-medium">Moneda:</span>{" "}
                                    {account.currency}
                                </p>

                                {account.isDetraction && (
                                    <p className="text-amber-700">
                                        Cuenta de detracciones
                                    </p>
                                )}
                            </div>

                            {canEdit && (
                                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => openEdit(account)}
                                        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => toggle(account)}
                                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                                    >
                                        {account.isActive ? "Desactivar" : "Activar"}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => remove(account)}
                                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}