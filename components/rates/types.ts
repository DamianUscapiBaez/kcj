export type DurationChoice = "LESS_THAN_MONTH" | "GREATER_THAN_MONTH" | "";
export type Unit = "DAY" | "TRIP" | "SERVICE" | "MONTH" | "HOUR";
export type Rate = { id: string; serviceId: string; vehicleModelId: string | null; durationType: DurationChoice; name: string; description: string | null; unit: Unit; currency: string; price: string; isActive: boolean; service: {name:string}; vehicleModel: {brand:string;name:string}|null };
export type Choice = {id:string;name:string;isActive:boolean;requiresVehicle?:boolean};
export type VehicleChoice = Choice & {brand:string;vehicleType:{isActive:boolean}};
export type Props = {initialServiceId?:string;query:string;page:number;totalPages:number;totalRecords:number;pageSize:number;canEdit:boolean;rates:Rate[];services:Choice[];vehicles:VehicleChoice[];units:Unit[]};
export type RateFormData = {name:string;description:string;serviceId:string;vehicleModelId:string;durationType:DurationChoice;unit:Unit;price:string};
