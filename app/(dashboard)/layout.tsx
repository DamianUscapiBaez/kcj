import { Suspense } from "react";
import NavLinks from "@/components/dashboard/nav-links";
import SidebarUser from "@/components/dashboard/sidebar-user";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#f5f7fb] md:flex">
            <aside className="flex flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
                <div className="px-6 pt-7 pb-4">
                    <p className="text-lg font-black tracking-tight text-blue-800">KCJ</p>
                    <p className="mt-1 text-xs tracking-widest text-slate-400">COTIZACIONES PRO</p>
                </div>
                <NavLinks />
                <div className="hidden flex-1 md:block" />
                <Suspense fallback={<div className="p-4 text-xs text-slate-400">Cargando usuario...</div>}>
                    <SidebarUser />
                </Suspense>
            </aside>
            <main className="min-w-0 flex-1 px-4 py-7 sm:px-8">
                <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
        </div>
    );
}
