import { connection } from "next/server";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireSessionCompany } from "@/lib/permissions";

const ROLE_LABELS = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  SALES: "Ventas",
  VIEWER: "Solo lectura",
} as const;

async function logout() {
  "use server";
  await signOut({ redirect: false });
  redirect("/login");
}

export default async function SidebarUser() {
  await connection();
  const { session, membership } = await requireSessionCompany();

  return (
    <div className="border-t border-slate-200 p-4">
      <p className="truncate text-sm font-medium text-slate-900">{session.user.name}</p>
      <p className="truncate text-xs text-slate-500">
        {membership.company.tradeName ?? membership.company.legalName} · {ROLE_LABELS[membership.role]}
      </p>
      <form action={logout} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
