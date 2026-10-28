import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import QuotationClient from "@/components/quotations/quotation-client";

async function Content() {
  await connection();
  const { membership } = await requireSessionCompany();
  const companyId = membership.companyId;
  const [quotes, clients, services, vehicles, serviceRates, settings] = await Promise.all([
    prisma.quotation.findMany({ where: { companyId }, include: { items: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.client.findMany({ where: { companyId, isActive: true }, select: { id: true, legalName: true }, orderBy: { legalName: "asc" } }),
    prisma.service.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true, description: true }, orderBy: { name: "asc" } }),
    prisma.vehicleType.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.serviceRate.findMany({ where: { companyId, isActive: true, service: { isActive: true } }, orderBy: { name: "asc" } }),
    prisma.companySettings.findUnique({ where: { companyId } }),
  ]);

  return (
    <QuotationClient
      quotes={JSON.parse(JSON.stringify(quotes))}
      clients={clients.map((c) => ({ id: c.id, name: c.legalName }))}
      services={services}
      vehicles={vehicles}
      rates={serviceRates.map((r) => ({
        id: r.id, name: r.name, serviceId: r.serviceId, vehicleTypeId: r.vehicleTypeId,
        unit: r.unit, currency: r.currency, price: Number(r.price),
        validFrom: r.validFrom?.toISOString().slice(0, 10) ?? null,
        validUntil: r.validUntil?.toISOString().slice(0, 10) ?? null,
      }))}
      defaults={{
        defaultCurrency: settings?.defaultCurrency ?? "PEN",
        defaultTaxRate: Number(settings?.defaultTaxRate ?? 18),
        defaultValidityDays: settings?.defaultValidityDays ?? 7,
        defaultTerms: settings?.defaultTerms ?? "",
      }}
      role={membership.role}
    />
  );
}

export default function Page() {
  return <Suspense fallback={<div className="panel p-8">Cargando cotizaciones...</div>}><Content /></Suspense>;
}
