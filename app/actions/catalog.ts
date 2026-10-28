"use server";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CatalogKey } from "@/lib/catalog";
const nonempty=z.string().trim().min(1).max(200);
const optional=z.string().trim().max(2000).optional().default("");
const client=z.object({legalName:nonempty,documentType:z.enum(['RUC','DNI','CE','PASSPORT','OTHER']),documentNumber:nonempty,email:z.union([z.email(),z.literal('')]).default(''),phone:optional,address:optional});
const service=z.object({code:nonempty,name:nonempty,description:optional});
const vehicle=z.object({name:nonempty,description:optional});
const rate=z.object({name:nonempty,serviceId:z.uuid(),vehicleTypeId:z.union([z.uuid(),z.literal('')]),unit:z.enum(['HOUR','DAY','TRIP','SERVICE','MONTH']),currency:z.enum(['PEN','USD']),price:z.coerce.number().positive().max(999999999)});
export type ActionResult={ok:boolean;message:string};
export async function saveCatalog(kind:CatalogKey,id:string|null,data:Record<string,string>):Promise<ActionResult>{
 try {
 const {membership}=await requireSessionCompany(undefined,['OWNER','ADMIN','SALES']);const companyId=membership.companyId;
 switch(kind){
 case 'clientes':{const v=client.parse(data); if(id){await prisma.client.update({where:{id,companyId},data:v});}else{await prisma.client.create({data:{...v,companyId}});}break;}
 case 'servicios':{const v=service.parse(data);if(id){await prisma.service.update({where:{id,companyId},data:v});}else{await prisma.service.create({data:{...v,companyId}});}break;}
 case 'vehiculos':{const v=vehicle.parse(data);if(id){await prisma.vehicleType.update({where:{id,companyId},data:v});}else{await prisma.vehicleType.create({data:{...v,companyId}});}break;}
 case 'tarifas':{const v=rate.parse(data);const validService=await prisma.service.count({where:{id:v.serviceId,companyId,isActive:true}});const validVehicle=v.vehicleTypeId?await prisma.vehicleType.count({where:{id:v.vehicleTypeId,companyId,isActive:true}}):1;if(!validService||!validVehicle)return {ok:false,message:'Servicio o vehículo no autorizado.'};const payload={name:v.name,serviceId:v.serviceId,vehicleTypeId:v.vehicleTypeId||null,unit:v.unit,currency:v.currency,price:v.price};if(id){await prisma.serviceRate.update({where:{id,companyId},data:payload});}else{await prisma.serviceRate.create({data:{...payload,companyId}});}break;}
 default:return {ok:false,message:'Módulo inválido'};
 }
 revalidatePath('/'+kind);revalidatePath('/dashboard');return {ok:true,message:'Guardado correctamente.'};
 }catch(e){console.error('saveCatalog',e);return {ok:false,message:e instanceof z.ZodError?e.issues[0]?.message??'Datos inválidos':'No se pudo guardar. Revisa duplicados y datos.'};}
}
export async function toggleCatalog(kind:CatalogKey,id:string,active:boolean):Promise<ActionResult>{
 try{const {membership}=await requireSessionCompany(undefined,['OWNER','ADMIN','SALES']);const companyId=membership.companyId;
 switch(kind){case 'clientes':await prisma.client.update({where:{id,companyId},data:{isActive:active}});break;case 'servicios':await prisma.service.update({where:{id,companyId},data:{isActive:active}});break;case 'vehiculos':await prisma.vehicleType.update({where:{id,companyId},data:{isActive:active}});break;case 'tarifas':await prisma.serviceRate.update({where:{id,companyId},data:{isActive:active}});break;default:return {ok:false,message:'Módulo inválido'};}
 revalidatePath('/'+kind);revalidatePath('/dashboard');return {ok:true,message:active?'Registro reactivado.':'Registro desactivado.'};
 }catch{return {ok:false,message:'No se pudo actualizar el estado.'};}
}
