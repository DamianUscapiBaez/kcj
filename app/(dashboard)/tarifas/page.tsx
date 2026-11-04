import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { RateUnit, Prisma } from "@/app/generated/prisma/client";
import RatesClient from "@/components/rates/rates-client";

type Params = {page?:string|string[];q?:string|string[];serviceId?:string|string[]};
const first=(v?:string|string[])=>Array.isArray(v)?v[0]:v;
const PAGE_SIZE=10;
async function Content({searchParams}:{searchParams:Promise<Params>}){
 const params=await searchParams;
 const raw=first(params.page)??"1";
 const requested=/^\d+$/.test(raw)?Math.max(1,Number(raw)||1):1;
 const q=(first(params.q)??"").trim().slice(0,120);
 const requestedServiceId=first(params.serviceId)??"";
 const {membership}=await requireSessionCompany();
 const companyId=membership.companyId;
 const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const serviceId=uuidPattern.test(requestedServiceId)?requestedServiceId:"";
 const search=q?{contains:q,mode:"insensitive" as const}:undefined;
 const where:Prisma.ServiceRateWhereInput={companyId,...(serviceId?{serviceId}:{}),...(search?{OR:[{name:search},{description:search},{service:{is:{name:search}}},{vehicleModel:{is:{name:search}}},{vehicleModel:{is:{brand:search}}}]}:{})};
 const [count,services,vehicles]=await Promise.all([
  prisma.serviceRate.count({where}),
  prisma.service.findMany({where:{companyId},select:{id:true,name:true,isActive:true,requiresVehicle:true},orderBy:{name:"asc"}}),
  prisma.vehicleModel.findMany({where:{companyId},select:{id:true,brand:true,name:true,isActive:true,vehicleType:{select:{isActive:true}}},orderBy:[{brand:"asc"},{name:"asc"}]}),
 ]);
 const totalPages=Math.max(1,Math.ceil(count/PAGE_SIZE));
 const page=Math.min(requested,totalPages);
 const rates=await prisma.serviceRate.findMany({where,select:{id:true,serviceId:true,vehicleModelId:true,durationType:true,name:true,description:true,unit:true,currency:true,price:true,isActive:true,service:{select:{name:true}},vehicleModel:{select:{brand:true,name:true}}},orderBy:[{name:"asc"},{id:"asc"}],skip:(page-1)*PAGE_SIZE,take:PAGE_SIZE});
 return <RatesClient key={`${q}:${serviceId}`} initialServiceId={serviceId} query={q} page={page} totalPages={totalPages} totalRecords={count} pageSize={PAGE_SIZE} canEdit={membership.role==="ADMIN"} rates={rates.map(rate=>({ ...rate, durationType: rate.durationType ?? "", price:rate.price.toString() }))} services={services} vehicles={vehicles} units={[RateUnit.DAY,RateUnit.TRIP,RateUnit.SERVICE,RateUnit.MONTH]}/>;
}
export default function RatesPage({searchParams}:{searchParams:Promise<Params>}){return <Suspense fallback={<div className="rounded-xl bg-white p-8 text-slate-500">Cargando tarifas...</div>}><Content searchParams={searchParams}/></Suspense>}
