"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
    CreditCard,
    Plus,
    Loader2,
    ShieldAlert,
    Building,
    CheckCircle2,
    XCircle,
    Trash2,
    Pencil,
    Power
} from "lucide-react";

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
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export default function CompanyBankAccounts({
    accounts,
    canEdit,
}: Props) {
    const router = useRouter();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<BankAccountInput>(EMPTY);
    const [showForm, setShowForm] = useState(false);
    const [pending, startTransition] = useTransition();

    function openCreate() {
        setEditingId(null);
        setForm({ ...EMPTY });
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
        setShowForm(true);
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending || !canEdit) return;

        startTransition(async () => {
            try {
                const result = await saveBankAccount(editingId, form);

                if (result.ok) {
                    await Swal.fire({
                        icon: "success",
                        title: editingId ? "Cuenta actualizada" : "Cuenta creada",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                        timer: 1800,
                        showConfirmButton: false,
                    });

                    setShowForm(false);
                    setEditingId(null);
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
                console.error("Error al guardar cuenta bancaria:", error);
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "Ocurrió un problema al guardar la cuenta bancaria.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    function toggle(account: BankAccount) {
        if (pending || !canEdit) return;

        startTransition(async () => {
            try {
                const result = await toggleBankAccount(
                    account.id,
                    account.isActive
                );

                if (result.ok) {
                    await Swal.fire({
                        icon: "success",
                        title: account.isActive ? "Cuenta desactivada" : "Cuenta activada",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    router.refresh();
                } else {
                    await Swal.fire({
                        icon: "error",
                        title: "No se pudo cambiar el estado",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                    });
                }
            } catch (error) {
                console.error("Error al cambiar estado:", error);
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "Ocurrió un problema al actualizar la cuenta.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    async function remove(account: BankAccount) {
        if (pending || !canEdit) return;

        const confirmation = await Swal.fire({
            title: `¿Eliminar cuenta de ${account.bankName}?`,
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirmation.isConfirmed) return;

        startTransition(async () => {
            try {
                const result = await deleteBankAccount(account.id);

                if (result.ok) {
                    await Swal.fire({
                        icon: "success",
                        title: "Cuenta eliminada",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    router.refresh();
                } else {
                    await Swal.fire({
                        icon: "error",
                        title: "No se pudo eliminar",
                        text: result.message,
                        confirmButtonColor: "#2563eb",
                    });
                }
            } catch (error) {
                console.error("Error al eliminar cuenta:", error);
                await Swal.fire({
                    icon: "error",
                    title: "Error inesperado",
                    text: "Ocurrió un problema al eliminar la cuenta.",
                    confirmButtonColor: "#2563eb",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            {/* Cabecera Principal */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Cuentas bancarias
                        </h2>
                        <p className="text-xs text-slate-500">
                            Administra las cuentas para tus cotizaciones.
                        </p>
                    </div>
                </div>

                {canEdit && !showForm && (
                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={pending}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva cuenta
                    </button>
                )}
            </div>

            {/* Formulario desplegable */}
            {showForm && canEdit && (
                <form
                    onSubmit={submit}
                    className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-xl shadow-blue-50/50"
                >
                    <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/40 px-6 py-4">
                        <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                            <Building className="h-4 w-4 text-blue-600" />
                            <span>{editingId ? "Editar cuenta bancaria" : "Registrar nueva cuenta bancaria"}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            disabled={pending}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase">
                                Banco <span className="text-red-500">*</span>
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
                                disabled={pending}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase">
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
                                disabled={pending}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase">
                                Número de cuenta <span className="text-red-500">*</span>
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
                                disabled={pending}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase">
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
                                disabled={pending}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-600 uppercase">
                                Moneda <span className="text-red-500">*</span>
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
                                disabled={pending}
                            >
                                <option value="PEN">Soles (PEN)</option>
                                <option value="USD">Dólares (USD)</option>
                            </select>
                        </div>

                        <div className="flex flex-col justify-center gap-3 pt-2">
                            <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isDetraction}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            isDetraction: e.target.checked,
                                        })
                                    }
                                    disabled={pending}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Cuenta de detracciones
                            </label>

                            <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            isActive: e.target.checked,
                                        })
                                    }
                                    disabled={pending}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Cuenta activa
                            </label>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => setShowForm(false)}
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
                            {pending ? "Guardando..." : "Guardar cuenta"}
                        </button>
                    </div>
                </form>
            )}

            {/* Listado de Cuentas */}
            {accounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-slate-800">
                        Todavía no hay cuentas bancarias registradas.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Añade una cuenta para poder seleccionarla en tus documentos y cotizaciones.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-base">
                                            {account.bankName}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-500 font-medium">
                                            {account.accountName || "Sin titular registrado"}
                                        </p>
                                    </div>

                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${account.isActive
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                : "bg-slate-100 text-slate-600 border border-slate-200/60"
                                            }`}
                                    >
                                        {account.isActive ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                        ) : (
                                            <XCircle className="h-3.5 w-3.5" />
                                        )}
                                        {account.isActive ? "Activa" : "Inactiva"}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-slate-500 text-xs uppercase tracking-wider">Cuenta ({account.currency}):</span>
                                        <span className="font-mono font-semibold text-slate-900">{account.accountNumber}</span>
                                    </div>

                                    {account.cci && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-500 text-xs uppercase tracking-wider">CCI:</span>
                                            <span className="font-mono text-xs font-medium text-slate-700">{account.cci}</span>
                                        </div>
                                    )}

                                    {account.isDetraction && (
                                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200/60">
                                            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                                            <span>Cuenta de detracciones</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {canEdit && (
                                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => openEdit(account)}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => toggle(account)}
                                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${account.isActive
                                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                            }`}
                                    >
                                        <Power className="h-3.5 w-3.5" />
                                        {account.isActive ? "Desactivar" : "Activar"}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => remove(account)}
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
    );
}