import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import {
    Users,
    FileText,
    Layers,
    DollarSign,
    ArrowRight,
    Inbox,
    Building2
} from "lucide-react";

export default async function DashboardContent() {
    await connection();

    const { session, membership } = await requireSessionCompany();
    const companyId = membership.companyId;

    const [clients, quotes, services, rates, recent] = await Promise.all([
        prisma.client.count({ where: { companyId, isActive: true } }),
        prisma.quotation.count({ where: { companyId } }),
        prisma.service.count({ where: { companyId, isActive: true } }),
        prisma.serviceRate.count({ where: { companyId, isActive: true } }),
        prisma.quotation.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
                id: true,
                code: true,
                clientName: true,
                status: true,
                total: true,
                currency: true,
            },
        }),
    ]);

    const stats = [
        {
            label: "Clientes activos",
            value: clients,
            icon: Users,
            href: "/clientes",
            color: "bg-blue-50 text-blue-600 ring-blue-50/50"
        },
        {
            label: "Cotizaciones",
            value: quotes,
            icon: FileText,
            href: "/cotizaciones",
            color: "bg-indigo-50 text-indigo-600 ring-indigo-50/50"
        },
        {
            label: "Servicios activos",
            value: services,
            icon: Layers,
            href: "/servicios",
            color: "bg-emerald-50 text-emerald-600 ring-emerald-50/50"
        },
        {
            label: "Tarifas vigentes",
            value: rates,
            icon: DollarSign,
            href: "/tarifas",
            color: "bg-amber-50 text-amber-600 ring-amber-50/50"
        },
    ];

    return (
        <section className="space-y-8">
            {/* Cabecera de Bienvenida */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <span className="inline-block text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
                        Panel General
                    </span>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                        Bienvenido, {session.user.name}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Gestiona las operaciones y el rendimiento comercial de{" "}
                        <span className="font-semibold text-slate-700">
                            {membership.company.tradeName ?? membership.company.legalName}
                        </span>.
                    </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">
                        {membership.company.legalName}
                    </span>
                </div>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <Link
                            href={s.href}
                            key={s.label}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-100 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                                    {s.label}
                                </span>
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-4 ${s.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="mt-4 flex items-baseline justify-between">
                                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                                    {s.value}
                                </p>
                            </div>

                            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
                                <span>Ver registros</span>
                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Tabla de Actividad Reciente */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Cotizaciones recientes
                        </h2>
                        <p className="text-xs text-slate-500">
                            Actividad comercial más reciente registrada en el sistema.
                        </p>
                    </div>

                    <Link
                        href="/cotizaciones"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        <span>Ver todas</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <tr>
                                {["Código", "Cliente", "Estado", "Importe"].map((x) => (
                                    <th className="px-6 py-3.5" key={x}>
                                        {x}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recent.map((q) => (
                                <tr className="group transition-colors hover:bg-slate-50/80" key={q.id}>
                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                                        {q.code}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {q.clientName}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200/60">
                                            {q.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                                        {q.currency} {q.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {!recent.length && (
                                <tr>
                                    <td className="px-6 py-16 text-center" colSpan={4}>
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3">
                                            <Inbox className="h-6 w-6" />
                                        </div>
                                        <p className="font-semibold text-slate-800">
                                            Aún no hay cotizaciones registradas.
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Crea tu primera cotización para verla reflejada aquí.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}