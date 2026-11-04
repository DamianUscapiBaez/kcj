
import { Suspense } from "react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import ClientsClient from "@/components/clients/clients-client";

const PAGE_SIZE = 10;

type PageProps = {
    searchParams: Promise<{
        page?: string | string[];
    }>;
};

function getPage(value?: string | string[]): number {
    const raw = Array.isArray(value) ? value[0] : value;

    if (!raw || !/^\d+$/.test(raw)) {
        return 1;
    }

    const page = Number(raw);

    return Number.isSafeInteger(page) && page > 0
        ? page
        : 1;
}

async function ClientsContent({
    searchParams,
}: {
    searchParams: PageProps["searchParams"];
}) {
    // Resolver searchParams dentro de Suspense
    const params = await searchParams;
    const requestedPage = getPage(params.page);

    // Obtener la empresa del usuario autenticado
    const { membership } = await requireSessionCompany();

    const where = {
        companyId: membership.companyId,
    };

    // Contar clientes de la empresa
    const totalClients = await prisma.client.count({
        where,
    });

    // Calcular total de páginas
    const totalPages = Math.max(
        1,
        Math.ceil(totalClients / PAGE_SIZE)
    );

    // Evitar páginas fuera del rango disponible
    const currentPage = Math.min(requestedPage, totalPages);

    // Consultar solamente los clientes de la página actual
    const clients = await prisma.client.findMany({
        where,
        select: {
            id: true,
            documentType: true,
            documentNumber: true,
            legalName: true,
            phone: true,
            email: true,
            address: true,
            isActive: true,

            contacts: {
                select: {
                    id: true,
                    name: true,
                    position: true,
                    phone: true,
                    email: true,
                    isPrimary: true,
                },
                orderBy: [
                    { isPrimary: "desc" },
                    { name: "asc" },
                ],
            },
        },
        orderBy: [
            { legalName: "asc" },
            { id: "asc" },
        ],
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
    });

    // Calcular rango de registros mostrados
    const firstItem =
        totalClients === 0
            ? 0
            : (currentPage - 1) * PAGE_SIZE + 1;

    const lastItem = Math.min(
        currentPage * PAGE_SIZE,
        totalClients
    );

    // Mostrar solamente páginas cercanas a la actual
    const pageNumbers = Array.from(
        { length: totalPages },
        (_, index) => index + 1
    ).filter(
        (page) =>
            page === 1 ||
            page === totalPages ||
            Math.abs(page - currentPage) <= 2
    );

    return (
        <div className="space-y-5">
            {/* LISTADO DE CLIENTES */}
            <ClientsClient
                clients={clients}
                canEdit={membership.role === "ADMIN"}
            />

            {/* PAGINACIÓN */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                {/* INFORMACIÓN */}
                <div className="text-sm text-slate-500">
                    Mostrando{" "}
                    <span className="font-semibold text-slate-800">
                        {firstItem}
                    </span>
                    {" - "}
                    <span className="font-semibold text-slate-800">
                        {lastItem}
                    </span>
                    {" de "}
                    <span className="font-semibold text-slate-800">
                        {totalClients}
                    </span>
                    {" clientes"}
                </div>

                {/* CONTROLES */}
                <nav
                    aria-label="Paginación de clientes"
                    className="flex flex-wrap items-center gap-2"
                >
                    {/* ANTERIOR */}
                    {currentPage > 1 ? (
                        <Link
                            href={`/clientes?page=${currentPage - 1}`}
                            scroll={false}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Anterior
                        </Link>
                    ) : (
                        <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                            Anterior
                        </span>
                    )}

                    {/* NÚMEROS DE PÁGINA */}
                    {pageNumbers.map((page, index) => {
                        const previous = pageNumbers[index - 1];

                        const showEllipsis =
                            previous !== undefined &&
                            page - previous > 1;

                        const isCurrent = page === currentPage;

                        return (
                            <div
                                key={page}
                                className="flex items-center gap-2"
                            >
                                {showEllipsis && (
                                    <span className="px-1 text-slate-400">
                                        ...
                                    </span>
                                )}

                                <Link
                                    href={`/clientes?page=${page}`}
                                    scroll={false}
                                    aria-current={
                                        isCurrent ? "page" : undefined
                                    }
                                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition ${isCurrent
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    {page}
                                </Link>
                            </div>
                        );
                    })}

                    {/* SIGUIENTE */}
                    {currentPage < totalPages ? (
                        <Link
                            href={`/clientes?page=${currentPage + 1}`}
                            scroll={false}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Siguiente
                        </Link>
                    ) : (
                        <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                            Siguiente
                        </span>
                    )}
                </nav>
            </div>
        </div>
    );
}

export default function ClientsPage({
    searchParams,
}: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    Cargando clientes...
                </div>
            }
        >
            <ClientsContent searchParams={searchParams} />
        </Suspense>
    );
}
