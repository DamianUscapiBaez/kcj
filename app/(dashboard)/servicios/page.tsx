
import { Suspense } from "react";
import { connection } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";

import ServicesClient from "@/components/services/services-client";

async function ServicesContent() {
    await connection();

    // Obtener usuario y empresa autorizada
    const { membership } = await requireSessionCompany();

    // Consultar los servicios de la empresa
    const services = await prisma.service.findMany({
        where: {
            companyId: membership.companyId,
        },
        select: {
            id: true,
            code: true,
            name: true,
            type: true,
            description: true,
            isActive: true,
            requiresVehicle: true,
            _count: { select: { rates: true } },
        },
        orderBy: {
            name: "asc",
        },
    });

    return (
        <ServicesClient
            services={services}
            canEdit={membership.role === "ADMIN"}
        />
    );
}

export default function ServicesPage() {
    return (
        <Suspense
            fallback={
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    Cargando servicios...
                </div>
            }
        >
            <ServicesContent />
        </Suspense>
    );
}
