import type { Currency, DurationType, RateUnit } from "@/app/generated/prisma/client";

export type Option = { id: string; name: string; description?: string | null; requiresVehicle?: boolean };
export type RateOption = {
    id: string;
    name: string;
    serviceId: string;
    vehicleModelId: string | null;
    unit: RateUnit;
    currency: Currency;
    price: number;
    durationType: DurationType | null;
};
export type CompanyDefaults = {
    defaultCurrency: "PEN" | "USD";
    defaultTaxRate: number;
    defaultValidityDays: number;
    defaultTerms: string;
};
export type Quote = {
    id: string;
    code: string;
    clientName: string;
    status: string;
    currency: string;
    total: string;
    exchangeRate: string;
    issueDate: string;
    expiryDate: string;
    notes: string | null;
    terms: string | null;
    taxRate: string;
    taxIncluded: boolean;
    clientId: string;
    items: {
        description: string;
        serviceId: string | null;
        vehicleModelId: string | null;
        serviceRateId?: string | null;
        unit: string;
        quantity: string;
        unitPrice: string;
        discountAmount: string;
        serviceStart?: string | null;
        serviceEnd?: string | null;
    }[];
};
export type Line = {
    description: string;
    serviceId: string;
    vehicleModelId: string;
    serviceRateId: string;
    unit: RateUnit;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    serviceStart: string;
    serviceEnd: string;
};

