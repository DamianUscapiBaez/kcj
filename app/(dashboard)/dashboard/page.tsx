import { Suspense } from "react";
import type { Metadata } from "next";
import DashboardContent from "./dashboard-content";

export const metadata: Metadata = { title: "Dashboard" };

// Con `cacheComponents`, lo que lee sesión/BD es dinámico y debe ir dentro de <Suspense>.
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <section>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-500">Cargando estadísticas...</p>
        </section>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
