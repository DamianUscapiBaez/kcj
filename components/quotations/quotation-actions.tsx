
"use client";

import {
    FileDown,
    Pencil,
    Send,
    CircleCheck,
    CircleX,
    Ban,
    Trash2,
    Link2,
    LoaderCircle,
} from "lucide-react";

type Props = {
    pdfUrl: string;

    onEdit?: () => void;
    onCopyLink?: () => void;
    onMarkSent?: () => void;
    onAccept?: () => void;
    onReject?: () => void;
    onCancel?: () => void;
    onDelete?: () => void;

    canEdit?: boolean;
    canCopyLink?: boolean;
    canMarkSent?: boolean;
    canAccept?: boolean;
    canReject?: boolean;
    canCancel?: boolean;
    canDelete?: boolean;

    isCopyingLink?: boolean;
};

export default function QuotationActions({
    pdfUrl,
    onEdit,
    onCopyLink,
    onMarkSent,
    onAccept,
    onReject,
    onCancel,
    onDelete,

    canEdit = false,
    canCopyLink = false,
    canMarkSent = false,
    canAccept = false,
    canReject = false,
    canCancel = false,
    canDelete = false,

    isCopyingLink = false,
}: Props) {
    const base =
        "group relative inline-flex h-9 w-9 items-center " +
        "justify-center rounded-lg border border-transparent " +
        "transition-all duration-200 hover:scale-105 " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 " +
        "focus-visible:outline-blue-500 disabled:cursor-not-allowed " +
        "disabled:opacity-50";

    const tooltip =
        "pointer-events-none absolute bottom-full left-1/2 z-50 " +
        "mb-2 -translate-x-1/2 whitespace-nowrap rounded-md " +
        "bg-slate-900 px-2.5 py-1.5 text-xs font-medium " +
        "text-white opacity-0 shadow-lg transition-opacity " +
        "group-hover:opacity-100 group-focus-visible:opacity-100";

    return (
        <div className="flex items-center gap-1.5">

            {/* 1. VER PDF */}
            <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ver PDF de cotización"
                className={`${base} text-blue-600 hover:bg-blue-50`}
            >
                <FileDown size={18} />
                <span className={tooltip}>Ver PDF + QR</span>
            </a>

            {/* 2. EDITAR BORRADOR */}
            {canEdit && onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label="Editar cotización"
                    className={`${base} text-amber-600 hover:bg-amber-50`}
                >
                    <Pencil size={18} />
                    <span className={tooltip}>Editar cotización</span>
                </button>
            )}

            {/* 3. COPIAR ENLACE DE REVISIÓN */}
            {canCopyLink && onCopyLink && (
                <button
                    type="button"
                    onClick={onCopyLink}
                    disabled={isCopyingLink}
                    aria-busy={isCopyingLink}
                    aria-label={
                        isCopyingLink
                            ? "Generando enlace de revisión"
                            : "Copiar enlace de revisión"
                    }
                    className={`${base} text-indigo-600 hover:bg-indigo-50`}
                >
                    {isCopyingLink ? (
                        <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                        <Link2 size={18} />
                    )}

                    <span className={tooltip}>
                        {isCopyingLink
                            ? "Generando enlace..."
                            : "Copiar enlace"}
                    </span>
                </button>
            )}

            {/* 4. MARCAR COMO ENVIADA */}
            {/* {canMarkSent && onMarkSent && (
                <button
                    type="button"
                    onClick={onMarkSent}
                    aria-label="Marcar como enviada"
                    className={`${base} text-sky-600 hover:bg-sky-50`}
                >
                    <Send size={18} />
                    <span className={tooltip}>Marcar como enviada</span>
                </button>
            )} */}

            {/* 5. ACEPTAR MANUALMENTE */}
            {canAccept && onAccept && (
                <button
                    type="button"
                    onClick={onAccept}
                    aria-label="Marcar como aceptada"
                    className={`${base} text-emerald-600 hover:bg-emerald-50`}
                >
                    <CircleCheck size={18} />
                    <span className={tooltip}>Aceptar cotización</span>
                </button>
            )}

            {/* 6. RECHAZAR MANUALMENTE */}
            {canReject && onReject && (
                <button
                    type="button"
                    onClick={onReject}
                    aria-label="Marcar como rechazada"
                    className={`${base} text-rose-600 hover:bg-rose-50`}
                >
                    <CircleX size={18} />
                    <span className={tooltip}>Rechazar cotización</span>
                </button>
            )}

            {/* 7. ANULAR COTIZACIÓN */}
            {canCancel && onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Anular cotización"
                    className={`${base} text-orange-600 hover:bg-orange-50`}
                >
                    <Ban size={18} />
                    <span className={tooltip}>Anular cotización</span>
                </button>
            )}

            {/* 8. ELIMINAR BORRADOR */}
            {canDelete && onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    aria-label="Eliminar borrador"
                    className={`${base} text-red-600 hover:bg-red-50`}
                >
                    <Trash2 size={18} />
                    <span className={tooltip}>Eliminar borrador</span>
                </button>
            )}
        </div>
    );
}
