"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    initialLogoUrl: string | null;
    canEdit: boolean;
};

export default function CompanyLogo({
    initialLogoUrl,
    canEdit,
}: Props) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    async function upload(file: File) {
        if (!canEdit || loading) return;

        if (file.size > 2 * 1024 * 1024) {
            setIsError(true);
            setMessage("El archivo no debe superar los 2 MB.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("logo", file);

            const response = await fetch("/api/company/logo", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.message || "Error al subir.");
            }

            setLogoUrl(result.logoUrl);
            setIsError(false);
            setMessage(result.message);
            router.refresh();
        } catch (error) {
            setIsError(true);
            setMessage(
                error instanceof Error
                    ? error.message
                    : "No se pudo subir el logo."
            );
        } finally {
            setLoading(false);

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    async function remove() {
        if (!canEdit || loading || !logoUrl) return;

        if (!window.confirm("¿Deseas eliminar el logo de la empresa?")) {
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const response = await fetch("/api/empresa/logo", {
                method: "DELETE",
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.message || "Error al eliminar.");
            }

            setLogoUrl(null);
            setIsError(false);
            setMessage(result.message);
            router.refresh();
        } catch (error) {
            setIsError(true);
            setMessage(
                error instanceof Error
                    ? error.message
                    : "No se pudo eliminar el logo."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
                Logo de la empresa
            </h2>

            <p className="mt-1 text-sm text-slate-500">
                PNG, JPG o WebP. Tamaño máximo: 2 MB.
            </p>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-32 w-40 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt="Logo de la empresa"
                            className="max-h-full max-w-full object-contain p-3"
                        />
                    ) : (
                        <span className="text-sm text-slate-400">
                            Sin logo
                        </span>
                    )}
                </div>

                <div className="space-y-3">
                    {canEdit && (
                        <>
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                disabled={loading}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void upload(file);
                                }}
                                className="hidden"
                            />

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => inputRef.current?.click()}
                                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading
                                        ? "Procesando..."
                                        : logoUrl
                                            ? "Cambiar logo"
                                            : "Subir logo"}
                                </button>

                                {logoUrl && (
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={remove}
                                        className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        Eliminar logo
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {message && (
                        <p
                            role="status"
                            className={`text-sm ${isError ? "text-red-600" : "text-emerald-600"
                                }`}
                        >
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}