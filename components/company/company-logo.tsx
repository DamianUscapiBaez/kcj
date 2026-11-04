"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Image as ImageIcon, Upload, Trash2, Loader2, ShieldAlert } from "lucide-react";

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

    async function upload(file: File) {
        if (!canEdit || loading) return;

        if (file.size > 2 * 1024 * 1024) {
            void Swal.fire({
                icon: "warning",
                title: "Archivo demasiado pesado",
                text: "El archivo no debe superar los 2 MB.",
                confirmButtonColor: "#2563eb",
            });
            return;
        }

        setLoading(true);

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

            await Swal.fire({
                icon: "success",
                title: "Logo actualizado",
                text: result.message || "El logo se ha actualizado correctamente.",
                confirmButtonColor: "#2563eb",
                timer: 1800,
                showConfirmButton: false,
            });

            router.refresh();
        } catch (error) {
            console.error("Error al subir logo:", error);
            await Swal.fire({
                icon: "error",
                title: "No se pudo subir",
                text: error instanceof Error ? error.message : "Ocurrió un problema al subir el logo.",
                confirmButtonColor: "#2563eb",
            });
        } finally {
            setLoading(false);

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    async function remove() {
        if (!canEdit || loading || !logoUrl) return;

        const confirmation = await Swal.fire({
            title: "¿Eliminar el logo de la empresa?",
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirmation.isConfirmed) return;

        setLoading(true);

        try {
            const response = await fetch("/api/empresa/logo", {
                method: "DELETE",
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.message || "Error al eliminar.");
            }

            setLogoUrl(null);

            await Swal.fire({
                icon: "success",
                title: "Logo eliminado",
                text: result.message || "El logo ha sido eliminado correctamente.",
                confirmButtonColor: "#2563eb",
                timer: 1500,
                showConfirmButton: false,
            });

            router.refresh();
        } catch (error) {
            console.error("Error al eliminar logo:", error);
            await Swal.fire({
                icon: "error",
                title: "No se pudo eliminar",
                text: error instanceof Error ? error.message : "Ocurrió un problema al eliminar el logo.",
                confirmButtonColor: "#2563eb",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-100">
            {/* Cabecera */}
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
                    <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        Logo de la empresa
                    </h2>
                    <p className="text-xs text-slate-500">
                        PNG, JPG o WebP. Tamaño máximo: 2 MB.
                    </p>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    {/* Contenedor de la imagen */}
                    <div className="flex h-32 w-40 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt="Logo de la empresa"
                                className="max-h-full max-w-full object-contain p-3"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                                <ImageIcon className="h-6 w-6" />
                                <span className="text-xs font-medium">Sin logo</span>
                            </div>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="space-y-4 flex-1">
                        {canEdit ? (
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
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
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
                                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Eliminar logo
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 border border-amber-200/60 max-w-md">
                                <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                <span>No tienes permisos para modificar el logo de la empresa.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}