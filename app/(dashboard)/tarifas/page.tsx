import { connection } from "next/server";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import TariffsClient from "@/components/tariffs/tariffs-client";

async function Content() {
  await connection();
  const { membership } = await requireSessionCompany();
  const companyId = membership.companyId;
  const [services, vehicles, rates] = await Promise.all([
    prisma.service.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.vehicleType.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.serviceRate.findMany({ where: { companyId }, select: {
      id: true, serviceId: true, vehicleTypeId: true, unit: true, currency: true,
      price: true, isActive: true,
    }, orderBy: { name: "asc" } }),
  ]);
  return <TariffsClient
    services={services} vehicles={vehicles}
    rates={rates.map(r => ({ ...r, price: r.price.toString() }))}
    canEdit={membership.role !== "VIEWER"}
  />;
}

export default function Page() {
  return <Suspense fallback={<div className="p-8 text-slate-500">Cargando tarifas...</div>}><Content /></Suspense>;
}
