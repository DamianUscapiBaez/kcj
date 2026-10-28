import { Suspense } from "react";
import type { Metadata } from "next";
import LoginSession from "./login-session";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-7">
          <p className="text-sm font-semibold tracking-wide text-blue-700">KCJ</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-slate-500">Accede al sistema de cotizaciones.</p>
        </div>

        <Suspense fallback={<p className="text-sm text-slate-500">Verificando sesión...</p>}>
          <LoginSession />
        </Suspense>
      </div>
    </main>
  );
}
