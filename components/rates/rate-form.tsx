"use client";
import {Info} from "lucide-react";
import {ChoiceSelect,Field} from "./form-controls";
import {inputClass,UNIT_LABELS,UNITS} from "./constants";
import type {Choice,VehicleChoice,RateFormData,Unit} from "./types";
type Props={form:RateFormData;onChange:(next:RateFormData)=>void;services:Choice[];vehicles:VehicleChoice[];units:Unit[];editing:boolean};
export default function RateForm({form,onChange,services,vehicles,units,editing}:Props){
 const set=(key:keyof RateFormData,value:string)=>onChange({...form,[key]:value});
 const service=services.find(s=>s.id===form.serviceId);
 const requiresVehicle=service?.requiresVehicle??false;
 const allowed=UNITS.filter(u=>units.includes(u));
 const displayed:Unit[]=form.unit==="HOUR"&&editing?["HOUR",...allowed]:allowed.length?allowed:UNITS;
 return <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2">
  <div className="min-w-0 md:col-span-2"><Field title="Nombre *"><input required maxLength={160} className={inputClass} placeholder="Ej. Alquiler de camioneta" value={form.name} onChange={e=>set("name",e.target.value)}/></Field></div>
  <div className="min-w-0 md:col-span-2"><Field title="Descripción"><textarea rows={3} className={inputClass} placeholder="Detalles de la tarifa..." value={form.description} onChange={e=>set("description",e.target.value)}/></Field></div>
  <div className="min-w-0"><ChoiceSelect title="Servicio *" value={form.serviceId} onChange={v=>onChange({...form,serviceId:v,vehicleModelId:""})} items={services}/></div>
  {(requiresVehicle||!!form.vehicleModelId)&&<div className="min-w-0"><ChoiceSelect title={requiresVehicle?"Modelo de vehículo *":"Modelo de vehículo (opcional)"} value={form.vehicleModelId} onChange={v=>set("vehicleModelId",v)} optional={!requiresVehicle} items={vehicles.map(v=>({id:v.id,name:`${v.brand} ${v.name}`,isActive:v.isActive&&v.vehicleType.isActive}))}/></div>}
  <div className="min-w-0"><Field title="Duración del contrato"><select className={inputClass} value={form.durationType} onChange={e=>set("durationType",e.target.value)}><option value="">Sin condición</option><option value="LESS_THAN_MONTH">Menor a un mes</option><option value="GREATER_THAN_MONTH">Mayor a un mes</option></select></Field></div>
  <div className="min-w-0"><Field title="Unidad de cobro *"><select required className={inputClass} value={form.unit} onChange={e=>set("unit",e.target.value)}>{displayed.map(u=><option key={u} value={u} disabled={u==="HOUR"}>{UNIT_LABELS[u]}{u==="HOUR"?" (histórico)":""}</option>)}</select></Field></div>
  <div className="min-w-0"><Field title="Precio (USD) *"><input required inputMode="decimal" className={inputClass} placeholder="180.00" value={form.price} onChange={e=>set("price",e.target.value)}/></Field></div>
  <div className="md:col-span-2 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-900"><Info size={17} className="shrink-0"/><span>Moneda base: <b>USD</b> · Cobro por <b>{UNIT_LABELS[form.unit]?.toLowerCase()}</b>.</span></div>
 </div>;
}
