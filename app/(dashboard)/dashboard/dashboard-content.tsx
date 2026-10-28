import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";

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
        { label: "Clientes activos", value: clients, icon: "♙", href: "/clientes" },
        { label: "Cotizaciones", value: quotes, icon: "▤", href: "/cotizaciones" },
        { label: "Servicios activos", value: services, icon: "◇", href: "/servicios" },
        { label: "Tarifas vigentes", value: rates, icon: "＄", href: "/tarifas" },
    ];

    return (
        <section className="space-y-8">
            {/* Cabecera de Bienvenida */}
            <div>
                <p className="eyebrow">PANEL GENERAL</p>
                <h1 className="page-title">Bienvenido, {session.user.name}</h1>
                <p className="mt-2 text-slate-500">
                    Gestiona las operaciones de{" "}
                    {membership.company.tradeName ?? membership.company.legalName}.
                </p>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((s) => (
                    <Link
                        href={s.href}
                        key={s.label}
                        className="panel p-6 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-500">
                                {s.label}
                            </span>
                            <span className="rounded-xl bg-blue-50 px-3 py-2 text-xl text-blue-700">
                                {s.icon}
                            </span>
                        </div>
                        <p className="text-4xl font-extrabold tracking-tight text-slate-900">
                            {s.value}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-blue-600">
                            Ver registros →
                        </p>
                    </Link>
                ))}
            </div>

            {/* Tabla de Actividad Reciente */}
            <div className="panel">
                <div className="flex justify-between border-b border-slate-100 p-6">
                    <div>
                        <h2 className="text-lg font-bold">Cotizaciones recientes</h2>
                        <p className="text-sm text-slate-500">
                            Actividad comercial más reciente
                        </p>
                    </div>
                    <Link
                        href="/cotizaciones"
                        className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                        Ver todas →
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                {["Código", "Cliente", "Estado", "Importe"].map((x) => (
                                    <th className="px-6 py-3" key={x}>
                                        {x}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recent.map((q) => (
                                <tr className="hover:bg-slate-50/80 transition-colors" key={q.id}>
                                    <td className="px-6 py-4 font-bold text-blue-700">{q.code}</td>
                                    <td className="px-6 py-4">{q.clientName}</td>
                                    <td className="px-6 py-4">
                                        <span className="pill-gray">{q.status}</span>
                                    </td>
                                    <td className="px-6 py-4 font-semibold">
                                        {q.currency} {q.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {!recent.length && (
                                <tr>
                                    <td className="p-10 text-center text-slate-400" colSpan={4}>
                                        Aún no hay cotizaciones.
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