import type {Unit,RateFormData} from "./types";
export const UNIT_LABELS:Record<Unit,string>={DAY:"Día",TRIP:"Viaje",SERVICE:"Servicio",MONTH:"Mes",HOUR:"Hora"};
export const UNITS:Unit[]=["DAY","TRIP","SERVICE","MONTH"];
export const inputClass="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";
export const buttonClass="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";
export const emptyRate=():RateFormData=>({name:"",description:"",serviceId:"",vehicleModelId:"",durationType:"",unit:"DAY",price:""});
