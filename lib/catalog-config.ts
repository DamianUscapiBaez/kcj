export const catalogs = {
 clientes: { title: "Clientes", description: "Directorio comercial y datos de facturación.", fields: ["legalName","documentType","documentNumber","email","phone","address"], labels: ["Razón social / nombre","Tipo de documento","Número de documento","Correo","Teléfono","Dirección"] },
 servicios: { title: "Servicios", description: "Servicios disponibles para cotizar.", fields: ["code","name","description"], labels: ["Código","Nombre","Descripción"] },
 vehiculos: { title: "Tipos de vehículo", description: "Unidades que se pueden asignar a los servicios.", fields: ["name","description"], labels: ["Nombre","Descripción"] },
 tarifas: { title: "Tarifas", description: "Precios por servicio, vehículo y unidad.", fields: ["name","serviceId","vehicleTypeId","unit","currency","price"], labels: ["Nombre","Servicio","Vehículo (opcional)","Unidad","Moneda","Precio"] },
} as const;
export type CatalogKey = keyof typeof catalogs;
