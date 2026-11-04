/** Sistema visual compartido KCJ — Tailwind CSS (tema claro). */
export const viewStyles = {
  page: "space-y-6",
  header: "flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between",
  eyebrow: "text-xs font-bold uppercase tracking-wider text-blue-600",
  title: "mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl",
  subtitle: "mt-2 text-sm text-slate-500",
  primaryButton: "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
  panel: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
  toolbar: "flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
  table: "w-full text-left text-sm",
  tableHead: "border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600",
  search: "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
  metric: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
} as const;
