import "server-only";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { catalogs, type CatalogKey } from "@/lib/catalog-config";
export { catalogs };
export type { CatalogKey };
export async function catalogData(kind: CatalogKey) {
 const { membership } = await requireSessionCompany(); const companyId = membership.companyId;
 const [services, vehicles] = await Promise.all([prisma.service.findMany({where:{companyId,isActive:true},orderBy:{name:'asc'}}),prisma.vehicleType.findMany({where:{companyId,isActive:true},orderBy:{name:'asc'}})]);
 let records: Record<string,unknown>[]=[];
 switch(kind){
 case 'clientes': records=await prisma.client.findMany({where:{companyId},orderBy:{createdAt:'desc'},take:200});break;
 case 'servicios': records=await prisma.service.findMany({where:{companyId},orderBy:{name:'asc'},take:200});break;
 case 'vehiculos': records=await prisma.vehicleType.findMany({where:{companyId},orderBy:{name:'asc'},take:200});break;
 case 'tarifas': records=await prisma.serviceRate.findMany({where:{companyId},orderBy:{name:'asc'},take:200});break;
 }
 return {records:JSON.parse(JSON.stringify(records)) as Record<string,string|number|boolean|null>[], services:services.map(x=>({id:x.id,name:x.name})), vehicles:vehicles.map(x=>({id:x.id,name:x.name})),role:membership.role};
}
