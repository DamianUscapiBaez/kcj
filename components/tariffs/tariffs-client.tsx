"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Plus, Search, Pencil, X, Save, Tags, DollarSign } from "lucide-react";
import { saveTariffPrices } from "@/app/actions/tariff-prices";

type Option = { id: string; name: string };
type Unit = "HOUR" | "DAY" | "TRIP" | "SERVICE" | "MONTH";
type Rate = { id: string; serviceId: string; vehicleTypeId: string | null; unit: Unit;
  currency: "PEN" | "USD"; price: string; isActive: boolean };
type Group = { key: string; penId: string | null; usdId: string | null; serviceId: string; vehicleTypeId: string; unit: Unit; pen: string; usd: string };
const units: { value: Unit; label: string }[] = [
  { value: "DAY", label: "Por día" }, { value: "MONTH", label: "Por mes" },
  { value: "HOUR", label: "Por hora" }, { value: "TRIP", label: "Por viaje" },
  { value: "SERVICE", label: "Por servicio" },
];
const empty = (): Group => ({ key: "", penId: null, usdId: null, serviceId: "", vehicleTypeId: "", unit: "DAY", pen: "", usd: "" });
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function TariffsClient({ services, vehicles, rates, canEdit }: {
  services: Option[]; vehicles: Option[]; rates: Rate[]; canEdit: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Group | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const rate of rates) {
      const key = JSON.stringify([rate.serviceId, rate.vehicleTypeId ?? "", rate.unit]);
      const group = map.get(key) ?? { key, penId: null, usdId: null, serviceId: rate.serviceId, vehicleTypeId: rate.vehicleTypeId ?? "",
        unit: rate.unit, pen: "", usd: "" };
      if (rate.isActive) {
        if (rate.currency === "PEN") { group.pen = rate.price; group.penId = rate.id; }
        else { group.usd = rate.price; group.usdId = rate.id; }
      }
      map.set(key, group);
    }
    return Array.from(map.values()).filter(g => g.penId || g.usdId);
  }, [rates]);

  const serviceName = (id: string) => services.find(x => x.id === id)?.name ?? "Servicio no disponible";
  const vehicleName = (id: string) => vehicles.find(x => x.id === id)?.name ?? (id ? "Vehículo no disponible" : "Sin vehículo");
  const unitName = (unit: Unit) => units.find(x => x.value === unit)?.label ?? unit;
  const filtered = groups.filter(g =>
    `${serviceName(g.serviceId)} ${vehicleName(g.vehicleTypeId)} ${unitName(g.unit)}`.toLowerCase().includes(search.toLowerCase()));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form || pending) return;
    const data = { serviceId: form.serviceId, vehicleTypeId: form.vehicleTypeId,
      unit: form.unit, pen: form.pen, usd: form.usd, penId: form.penId, usdId: form.usdId };
    startTransition(async () => {
      const result = await saveTariffPrices(data);
      if (result.ok) {
        setForm(null);
        router.refresh();
        await Swal.fire({ icon: "success", title: "Tarifa guardada", text: result.message,
          timer: 1700, showConfirmButton: false });
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo guardar", text: result.message });
      }
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Catálogo comercial</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Tarifas</h1>
          <p className="mt-1 text-sm text-slate-500">Precios independientes en soles y dólares para cada servicio.</p>
        </div>
        {canEdit && <button type="button" onClick={() => setForm(empty())}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
          <Plus size={17}/> Nueva tarifa
        </button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div className="relative w-full max-w-sm">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className={inputClass + " pl-10"} placeholder="Buscar servicio, vehículo..." value={search}
              onChange={e => setSearch(e.target.value)}/>
          </div>
          <span className="text-sm text-slate-500">{filtered.length} tarifas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-4">Servicio / vehículo</th><th className="px-5 py-4">Modalidad</th>
                <th className="px-5 py-4">Soles (PEN)</th><th className="px-5 py-4">Dólares (USD)</th>
                {canEdit && <th className="px-5 py-4 text-right">Acciones</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(g => <tr key={g.key} className="hover:bg-slate-50">
                <td className="px-5 py-4"><div className="font-semibold text-slate-900">{serviceName(g.serviceId)}</div>
                  <div className="mt-1 text-xs text-slate-500">{vehicleName(g.vehicleTypeId)}</div></td>
                <td className="px-5 py-4 text-slate-600">{unitName(g.unit)}</td>
                <td className="px-5 py-4 font-semibold text-slate-900">{g.pen ? `S/ ${Number(g.pen).toFixed(2)}` : "—"}</td>
                <td className="px-5 py-4 font-semibold text-slate-900">{g.usd ? `US$ ${Number(g.usd).toFixed(2)}` : "—"}</td>
                {canEdit && <td className="px-5 py-4 text-right">
                  <button type="button" onClick={() => setForm(g)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50">
                    <Pencil size={15}/> Editar
                  </button></td>}
              </tr>)}
              {!filtered.length && <tr><td colSpan={canEdit ? 5 : 4} className="p-12 text-center text-slate-400">
                No hay tarifas para mostrar.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {form && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
        <form onSubmit={submit} className="w-full max-w-xl space-y-5 rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Tags size={15}/> Catálogo de precios</div>
              <h2 className="text-xl font-bold text-slate-900">{form.key ? "Editar tarifa" : "Nueva tarifa"}</h2>
              <p className="mt-1 text-sm text-slate-500">Puedes modificar servicio, vehículo, modalidad y precios sin conversión automática.</p></div>
            <button type="button" aria-label="Cerrar" onClick={() => setForm(null)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">Servicio
            <select required className={inputClass} value={form.serviceId}
              onChange={e => setForm({ ...form, serviceId: e.target.value })}>
              <option value="">Seleccionar servicio</option>
              {services.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Vehículo (opcional)
              <select  className={inputClass} value={form.vehicleTypeId}
                onChange={e => setForm({ ...form, vehicleTypeId: e.target.value })}>
                <option value="">Sin vehículo</option>
                {vehicles.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Modalidad
              <select  className={inputClass} value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value as Unit })}>
                {units.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <DollarSign size={17} className="text-blue-600"/> Precios del servicio</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">Soles (PEN)
                <input type="number" min="0.01" step="0.01" placeholder="Ej. 650.00"
                  className={inputClass} value={form.pen} onChange={e => setForm({ ...form, pen: e.target.value })}/>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">Dólares (USD)
                <input type="number" min="0.01" step="0.01" placeholder="Ej. 170.00"
                  className={inputClass} value={form.usd} onChange={e => setForm({ ...form, usd: e.target.value })}/>
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-500">Deja vacío el precio que no uses. Al editar, vaciarlo desactiva esa moneda.</p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => setForm(null)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>
            <button disabled={pending} type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Save size={17}/>{pending ? "Guardando..." : "Guardar precios"}</button>
          </div>
        </form>
      </div>}
    </section>
  );
}
