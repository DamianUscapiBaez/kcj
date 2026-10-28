"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        redirect: false,
      });
      if (result?.error) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Correo electrónico</label>
        <input id="email" name="email" type="email" autoComplete="email" required
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-600" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-600" />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
