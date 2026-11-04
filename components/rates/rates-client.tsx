"use client";
import { viewStyles } from "../ui/view-styles";
import {useState,useTransition,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import Swal from "sweetalert2";
import {Plus,Search,Tags} from "lucide-react";
import {saveServiceRate,setServiceRateActive} from "@/app/actions/rates";
import type {Props,Rate,RateFormData} from "./types";
import {emptyRate,inputClass,UNITS} from "./constants";
import RateForm from "./rate-form";
import RateModal from "./rate-modal";
import RatesTable from "./rates-table";
import Pagination from "./pagination";
const optional=(v:string)=>v.trim()||null;
export default function RatesClient({initialServiceId="",query,page,totalPages,totalRecords,pageSize,canEdit,rates,services,vehicles,units}:Props){
 const router=useRouter();const [search,setSearch]=useState(query);const [pending,startTransition]=useTransition();const [open,setOpen]=useState(false);const [editing,setEditing]=useState<string|null>(null);
 const [rateForm,setRateForm]=useState<RateFormData>(emptyRate);
 const url=(nextPage=1,nextQuery="")=>{const p=new URLSearchParams();if(initialServiceId)p.set("serviceId",initialServiceId);if(nextPage>1)p.set("page",String(nextPage));if(nextQuery.trim())p.set("q",nextQuery.trim());return `/tarifas?${p}`};
 const create=()=>{setEditing(null);setRateForm({...emptyRate(),serviceId:initialServiceId,unit:units.find(u=>u!=="HOUR")??"DAY"});setOpen(true)};
 const edit=(r:Rate)=>{setEditing(r.id);setRateForm({name:r.name,description:r.description??"",serviceId:r.serviceId,vehicleModelId:r.vehicleModelId??"",durationType:r.durationType,unit:r.unit,price:r.price});setOpen(true)};
 const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(pending||!canEdit)return;
  if(!/^\d{1,14}(?:\.\d{1,4})?$/.test(rateForm.price.trim())||Number(rateForm.price)<=0){void Swal.fire("Precio inválido","Ingresa un precio positivo con máximo cuatro decimales.","warning");return}
  const service=services.find(s=>s.id===rateForm.serviceId);
  if(!service?.isActive||(service.requiresVehicle&&!rateForm.vehicleModelId)){void Swal.fire("Datos incompletos","Selecciona un servicio activo y el vehículo cuando sea obligatorio.","warning");return}
  if(!UNITS.includes(rateForm.unit)&&!(editing&&rateForm.unit==="HOUR")){void Swal.fire("Unidad inválida","Selecciona una unidad de cobro válida.","warning");return}
  startTransition(async()=>{try{
   const result=await saveServiceRate(editing,{name:rateForm.name,description:optional(rateForm.description),serviceId:rateForm.serviceId,vehicleModelId:optional(rateForm.vehicleModelId),durationType:rateForm.durationType||null,unit:rateForm.unit,currency:"USD",price:rateForm.price.trim()});
   if(!result.ok){await Swal.fire("No se pudo guardar",result.message,"error");return}setOpen(false);router.refresh();await Swal.fire({icon:"success",title:result.message,timer:1300,showConfirmButton:false});
  }catch(error){console.error(error);await Swal.fire("Error","No se pudo guardar. Revisa las acciones del servidor.","error")}})
 };
 const toggle=async(item:Rate)=>{if(pending||!canEdit)return;const next=!item.isActive;const confirm=await Swal.fire({title:next?"¿Activar tarifa?":"¿Desactivar tarifa?",text:item.name,icon:"question",showCancelButton:true,confirmButtonText:"Confirmar",cancelButtonText:"Cancelar"});if(!confirm.isConfirmed)return;startTransition(async()=>{try{const r=await setServiceRateActive(item.id,next);if(!r.ok){await Swal.fire("No se pudo actualizar",r.message,"error");return}router.refresh();await Swal.fire({icon:"success",title:r.message,timer:1200,showConfirmButton:false})}catch(e){console.error(e);await Swal.fire("Error","No se pudo actualizar.","error")}})};
 return <section className={viewStyles.page}><header className={viewStyles.header}><div><h1 className={viewStyles.title}><Tags className="text-blue-600"/>Tarifas</h1><p className={viewStyles.subtitle}>Tarifas en USD según unidad de cobro.</p></div>{canEdit&&<button type="button" className={viewStyles.primaryButton} onClick={create} disabled={pending}><Plus size={17}/>Nueva tarifa</button>}</header>
 <div className={viewStyles.panel}><div className={viewStyles.toolbar}><form className="flex min-w-0 flex-1 flex-wrap gap-2" onSubmit={e=>{e.preventDefault();router.push(url(1,search))}}><div className="relative min-w-[180px] flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input className={`${inputClass} pl-10`} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/></div><button type="submit" className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white">Buscar</button>{query&&<button type="button" className="text-sm text-blue-600" onClick={()=>{setSearch("");router.push(url())}}>Limpiar</button>}</form><span className="text-sm text-slate-500">{totalRecords} registros</span></div><RatesTable rates={rates} canEdit={canEdit} pending={pending} onEdit={edit} onToggle={toggle}/></div>
 <Pagination page={page} totalPages={totalPages} totalRecords={totalRecords} pageSize={pageSize} makeUrl={p=>url(p,query)}/>
 {open&&<RateModal title={`${editing?"Editar":"Registrar"} tarifa`} pending={pending} onClose={()=>setOpen(false)} onSubmit={submit}><RateForm form={rateForm} onChange={setRateForm} services={services} vehicles={vehicles} units={units} editing={!!editing}/></RateModal>}
 </section>;
}
