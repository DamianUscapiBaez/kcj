
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import VehiclesClient from "@/components/vehicles/vehicles-client";

const PAGE_SIZE = 10;

type SearchParams = {
    tab?: string | string[];
    page?: string | string[];
    q?: string | string[];
};

type PageProps = {
    searchParams: Promise<SearchParams>;
};

function single(value?: string | string[]) {
    return Array.isArray(value) ? value[0] : value;
}

function getPage(value?: string | string[]) {
    const raw = single(value);

    if (!raw || !/^\d+$/.test(raw)) return 1;

    const page = Number(raw);

    return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

async function VehiclesContent({
    searchParams,
}: {
    searchParams: PageProps["searchParams"];
}) {
    const params = await searchParams;

    const tab = single(params.tab) === "types" ? "types" : "models";
    const requestedPage = getPage(params.page);
    const query = (single(params.q) ?? "").trim().slice(0, 120);

    const { membership } = await requireSessionCompany();
    const companyId = membership.companyId;

    const typeWhere = {
        companyId,
        ...(tab === "types" && query
            ? {
                OR: [
                    { name: { contains: query, mode: "insensitive" as const } },
                    {
                        description: {
                            contains: query,
                            mode: "insensitive" as const,
                        },
                    },
                ],
            }
            : {}),
    };

    const modelWhere = {
        companyId,
        ...(tab === "models" && query
            ? {
                OR: [
                    { name: { contains: query, mode: "insensitive" as const } },
                    { brand: { contains: query, mode: "insensitive" as const } },
                    {
                        vehicleType: {
                            name: {
                                contains: query,
                                mode: "insensitive" as const,
                            },
                        },
                    },
                ],
            }
            : {}),
    };

    const totalRecords =
        tab === "types"
            ? await prisma.vehicleType.count({ where: typeWhere })
            : await prisma.vehicleModel.count({ where: modelWhere });

    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
    const currentPage = Math.min(requestedPage, totalPages);
    const skip = (currentPage - 1) * PAGE_SIZE;

    const [types, models, availableTypes] = await Promise.all([
        tab === "types"
            ? prisma.vehicleType.findMany({
                where: typeWhere,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    isActive: true,
                    _count: {
                        select: { models: true },
                    },
                },
                orderBy: [{ name: "asc" }, { id: "asc" }],
                skip,
                take: PAGE_SIZE,
            })
            : Promise.resolve([]),

        tab === "models"
            ? prisma.vehicleModel.findMany({
                where: modelWhere,
                select: {
                    id: true,
                    vehicleTypeId: true,
                    brand: true,
                    name: true,
                    description: true,
                    capacity: true,
                    isActive: true,
                    vehicleType: {
                        select: {
                            name: true,
                            isActive: true,
                        },
                    },
                },
                orderBy: [
                    { brand: "asc" },
                    { name: "asc" },
                    { id: "asc" },
                ],
                skip,
                take: PAGE_SIZE,
            })
            : Promise.resolve([]),

        prisma.vehicleType.findMany({
            where: { companyId },
            select: {
                id: true,
                name: true,
                isActive: true,
            },
            orderBy: { name: "asc" },
        }),
    ]);

    return (
        <VehiclesClient
            tab={tab}
            query={query}
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={PAGE_SIZE}
            types={types}
            models={models}
            availableTypes={availableTypes}
            canEdit={membership.role === "ADMIN"}
        />
    );
}

export default function VehiclesPage({
    searchParams,
}: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    Cargando vehículos...
                </div>
            }
        >
            <VehiclesContent searchParams={searchParams} />
        </Suspense>
    );
}
