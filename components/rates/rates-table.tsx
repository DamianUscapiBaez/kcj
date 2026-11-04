"use client";

import { viewStyles } from "../ui/view-styles";
import {Pencil,Power,PowerOff} from "lucide-react";
import type {Rate} from "./types";
import {UNIT_LABELS} from "./constants";
function Status({active}:{active:boolean}){return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{active?"Activo":"Inactivo"}</span>}
export default function RatesTable({rates,canEdit,pending,onEdit,onToggle}:{rates:Rate[];canEdit:boolean;pending:boolean;onEdit:(item:Rate)=>void;onToggle:(item:Rate)=>void}){
 const headings=["Tarifa / servicio","Vehículo","Precio / unidad","Estado"];
 return <div className="overflow-x-auto"><table className={`${viewStyles.table} min-w-[580px]`}><thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{headings.map(h=><th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}{canEdit&&<th className="px-4 py-3 text-right">Acciones</th>}</tr></thead><tbody className="divide-y divide-slate-100">
 {rates.map(r=><tr key={r.id}><td className="px-4 py-3"><b className="block">{r.name}</b><span className="text-slate-500">{r.service.name}</span>{r.description&&<small className="block text-slate-500">{r.description}</small>}</td><td className="px-4 py-3">{r.vehicleModel?`${r.vehicleModel.brand} ${r.vehicleModel.name}`:"—"}</td><td className="px-4 py-3"><b>{r.currency} {r.price}</b><small className="block">Por {UNIT_LABELS[r.unit]}</small></td><td className="px-4 py-3"><Status active={r.isActive}/></td>{canEdit&&<td className="px-4 py-3 text-right"><div className="inline-flex gap-3"><button type="button" disabled={pending} aria-label="Editar" className="text-blue-600" onClick={()=>onEdit(r)}><Pencil size={17}/></button><button type="button" disabled={pending} aria-label={r.isActive?"Desactivar":"Activar"} className="text-amber-600" onClick={()=>onToggle(r)}>{r.isActive?<PowerOff size={17}/>:<Power size={17}/>}</button></div></td>}</tr>)}
 {rates.length===0&&<tr><td colSpan={headings.length+(canEdit?1:0)} className="px-4 py-12 text-center text-slate-500">No se encontraron tarifas.</td></tr>}
 </tbody></table></div>;
}
