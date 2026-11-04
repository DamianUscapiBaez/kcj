import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaClient, Prisma, Currency, RateUnit, CompanyRole, QuotationStatus, DurationType, ServiceType, DocumentType } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seed de DEMOSTRACION para el schema.prisma actualizado.
if (process.env.NODE_ENV === "production") throw new Error("Seed de demostracion bloqueado en produccion");
if (process.env.SEED_DEMO !== "YES") throw new Error("Confirma con SEED_DEMO=YES para ejecutar el seed de demostracion");
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const D = (v: string | number | Prisma.Decimal) => new Prisma.Decimal(v);
const money = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const day = (s: string) => new Date(`${s}T12:00:00.000Z`);
const domain = "demo.cotizaciones.test";

async function main() {
    const demoTaxId = process.env.SEED_COMPANY_TAX_ID;
    if (!demoTaxId) throw new Error("Define SEED_COMPANY_TAX_ID para una empresa de pruebas, nunca la empresa real");
    if (!process.env.SEED_COMPANY_TAX_ID?.startsWith("209999")) throw new Error("Usa un RUC ficticio que empiece por 209999 para evitar datos reales");
    const company = await prisma.company.upsert({
        where: { taxId: demoTaxId },
        update: {}, // No sobrescribir los datos de una empresa ya registrada
        create: { taxId: demoTaxId, legalName: "KCJ DEMO S.A.C.", tradeName: "KCJ DEMO", address: "Apurimac - Cotabambas - Coyllurqui (dato de demostracion)" },
    });

    await prisma.companySettings.upsert({
        where: { companyId: company.id },
        update: { defaultTaxRate: D("18.00"), defaultValidityDays: 7, quotationPrefix: "COT" },
        create: { companyId: company.id, defaultTaxRate: D("18.00"), defaultValidityDays: 7, quotationPrefix: "COT", defaultTerms: "Cotizacion valida por 7 dias. Tarifas sujetas a confirmacion." },
    });

    for (const [label, number, position] of [["Ventas", "900000001", 1], ["Administracion", "900000002", 2], ["Oficina", "084000000", 3]] as const) {
        await prisma.companyPhone.upsert({ where: { companyId_number: { companyId: company.id, number } }, update: {}, create: { companyId: company.id, label, number, position, isPrimary: position === 1 } });
    }

    for (const [label, email, position] of [["Ventas", `ventas@${domain}`, 1], ["Administracion", `administracion@${domain}`, 2], ["Contabilidad", `contabilidad@${domain}`, 3]] as const) {
        await prisma.companyEmail.upsert({ where: { companyId_email: { companyId: company.id, email } }, update: {}, create: { companyId: company.id, label, email, position, isPrimary: position === 1 } });
    }

    const bankExists = await prisma.companyBankAccount.findFirst({ where: { companyId: company.id, bankName: "Banco Demo", accountNumber: "000-0000000000" } });
    if (!bankExists) await prisma.companyBankAccount.create({ data: { companyId: company.id, bankName: "Banco Demo", accountNumber: "000-0000000000", currency: Currency.PEN } });

    const password = process.env.SEED_PASSWORD;
    if (!password || password.length < 12) throw new Error("Define SEED_PASSWORD con al menos 12 caracteres para los usuarios demo");
    const passwordHash = await hash(password);

    const userDefs = [
        { name: "Administrador Demo", email: `admin@${domain}`, role: CompanyRole.ADMIN },
        { name: "Ventas Demo", email: `ventas@${domain}`, role: CompanyRole.SALES },
    ];
    const users: Awaited<ReturnType<typeof prisma.user.upsert>>[] = [];
    for (const u of userDefs) {
        const user = await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { name: u.name, email: u.email, passwordHash } });
        await prisma.companyUser.upsert({ where: { companyId_userId: { companyId: company.id, userId: user.id } }, update: { role: u.role }, create: { companyId: company.id, userId: user.id, role: u.role } });
        users.push(user);
    }

    const clients: Awaited<ReturnType<typeof prisma.client.upsert>>[] = [];
    for (const [i, name, city] of [
        [1, "MINERA DEMO SUR S.A.C.", "Cusco"],
        [2, "CONSTRUCTORA DEMO ANDINA S.A.C.", "Apurimac"],
        [3, "TRANSPORTES DEMO PERU S.A.C.", "Arequipa"],
    ] as const) {
        const documentNumber = `2099999000${i}`;
        const client = await prisma.client.upsert({
            where: { companyId_documentType_documentNumber: { companyId: company.id, documentType: DocumentType.RUC, documentNumber } },
            update: { legalName: name, phone: `90000010${i}`, email: `cliente${i}@${domain}`, address: `${city}, Peru` },
            create: { companyId: company.id, documentType: DocumentType.RUC, documentNumber, legalName: name, phone: `90000010${i}`, email: `cliente${i}@${domain}`, address: `${city}, Peru` },
        });

        const contactName = `Contacto Demo ${i}`;
        const existingContact = await prisma.clientContact.findFirst({ where: { clientId: client.id, name: contactName }, select: { id: true } });

        if (existingContact) {
            await prisma.clientContact.update({ where: { id: existingContact.id }, data: { position: "Logistica", phone: `90000020${i}`, email: `contacto${i}@${domain}`, isPrimary: true } });
        } else {
            await prisma.clientContact.create({ data: { clientId: client.id, name: contactName, position: "Logistica", phone: `90000020${i}`, email: `contacto${i}@${domain}`, isPrimary: true } });
        }
        clients.push(client);
    }

    const type = await prisma.vehicleType.upsert({ where: { companyId_name: { companyId: company.id, name: "Camioneta 4x4" } }, update: {}, create: { companyId: company.id, name: "Camioneta 4x4" } });
    const models: Awaited<ReturnType<typeof prisma.vehicleModel.upsert>>[] = [];
    for (const name of ["Hilux 4x4", "Fortuner 4x4"]) {
        models.push(await prisma.vehicleModel.upsert({ where: { companyId_brand_name: { companyId: company.id, brand: "Toyota", name } }, update: {}, create: { companyId: company.id, vehicleTypeId: type.id, brand: "Toyota", name } }));
    }

    const service = await prisma.service.upsert({
        where: { companyId_code: { companyId: company.id, code: "ALQ-CAM" } },
        update: { requiresVehicle: true },
        create: { companyId: company.id, code: "ALQ-CAM", name: "Alquiler de camioneta", type: ServiceType.VEHICLE_RENTAL, requiresVehicle: true },
    });
    // Un servicio sin vehículo también tiene su propio tarifario.
    const radioService = await prisma.service.upsert({
        where: { companyId_code: { companyId: company.id, code: "ALQ-RADIO" } },
        update: { requiresVehicle: false },
        create: { companyId: company.id, code: "ALQ-RADIO", name: "Alquiler de radio base", type: ServiceType.OTHER, requiresVehicle: false },
    });

    // Tarifas USD por día. Bambas/Operaciones son parte del nombre y descripción.
    // [índice modelo, zona, tipo de duración, precio diario USD]
    const tariffRows = [
        [0, "Bambas", DurationType.LESS_THAN_MONTH, "180"],
        [0, "Bambas", DurationType.GREATER_THAN_MONTH, "140"],
        [0, "Operaciones", DurationType.LESS_THAN_MONTH, "185"],
        [0, "Operaciones", DurationType.GREATER_THAN_MONTH, "145"],
        [1, "Bambas", DurationType.LESS_THAN_MONTH, "180"],
        [1, "Bambas", DurationType.GREATER_THAN_MONTH, "145"],
        [1, "Operaciones", DurationType.LESS_THAN_MONTH, "185"],
        [1, "Operaciones", DurationType.GREATER_THAN_MONTH, "150"],
    ] as const;

    const rates: Awaited<ReturnType<typeof prisma.serviceRate.create>>[] = [];
    for (const [modelIndex, zona, durationType, price] of tariffRows) {
        const bandName = durationType === DurationType.LESS_THAN_MONTH ? "Menor a 30 días" : "30 días o más";
        const name = `${models[modelIndex].name} - ${zona} - ${bandName}`;
        const description = `Alquiler de ${models[modelIndex].brand} ${models[modelIndex].name} para ${zona}, ${bandName.toLowerCase()}.`;
        const existing = await prisma.serviceRate.findFirst({
            where: { companyId: company.id, serviceId: service.id, name },
        });
        const data = {
            serviceId: service.id,
            vehicleModelId: models[modelIndex].id,
            durationType,
            name,
            description,
            unit: RateUnit.DAY,
            currency: Currency.USD,
            price: D(price),
            isActive: true,
        };
        const rate = existing
            ? await prisma.serviceRate.update({ where: { id: existing.id }, data })
            : await prisma.serviceRate.create({ data: { companyId: company.id, ...data } });
        rates.push(rate);
    }

    // Un servicio independiente de radio base sin vehículo ni condición de duración.
    const radioName = "Radio base - tarifa diaria";
    const radioExisting = await prisma.serviceRate.findFirst({
        where: { companyId: company.id, serviceId: radioService.id, name: radioName },
    });
    const radioData = {
        serviceId: radioService.id,
        vehicleModelId: null,
        durationType: null,
        name: radioName,
        description: "Alquiler diario de radio base, sin vehículo.",
        price: D("39.50"),
        unit: RateUnit.DAY,
        currency: Currency.USD,
        isActive: true,
    };
    if (radioExisting) {
        await prisma.serviceRate.update({ where: { id: radioExisting.id }, data: radioData });
    } else {
        await prisma.serviceRate.create({ data: { companyId: company.id, ...radioData } });
    }

    const quotes: Array<{ number: number; clientIndex: number; status: QuotationStatus; exchangeRate: string; lines: Array<{ rate: typeof rates[number]; quantity: string; units?: number }> }> = [
        { number: 1, clientIndex: 0, status: QuotationStatus.DRAFT, exchangeRate: "3.55", lines: [{ rate: rates[0], quantity: "5", units: 1 }] },
        { number: 2, clientIndex: 1, status: QuotationStatus.SENT, exchangeRate: "3.60", lines: [{ rate: rates[2], quantity: "10", units: 2 }] },
        { number: 3, clientIndex: 2, status: QuotationStatus.ACCEPTED, exchangeRate: "3.50", lines: [{ rate: rates[1], quantity: "35", units: 1 }] },
    ];

    for (const q of quotes) {
        const year = 2026;
        const code = `COT-${year}-${String(q.number).padStart(4, "0")}`;
        const existing = await prisma.quotation.findUnique({ where: { companyId_code: { companyId: company.id, code } } });
        if (existing) continue;

        const fx = D(q.exchangeRate);
        const lines = q.lines.map(({ rate, quantity, units }, idx) => {
            const sourceUnitPrice = D(rate.price);
            // La tarifa y la cotización están expresadas en USD.
            const unitPrice = sourceUnitPrice.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
            const billableQuantity = D(quantity).mul(units ?? 1);
            return {
                companyId: company.id,
                serviceId: rate.serviceId,
                vehicleModelId: rate.vehicleModelId,
                serviceRateId: rate.id,
                durationType: rate.durationType,
                position: idx + 1,
                description: rate.name,
                unit: rate.unit,
                requestedUnits: units,
                // Cantidad facturable = días × número de vehículos.
                quantity: billableQuantity,
                sourceCurrency: rate.currency,
                sourceUnitPrice,
                unitPrice,
                lineTotal: money(unitPrice.mul(billableQuantity))
            };
        });

        const subtotal = money(lines.reduce((acc, l) => acc.plus(l.lineTotal), D(0)));
        const taxAmount = money(subtotal.mul(D("0.18")));

        await prisma.$transaction(async tx => {
            await tx.quotation.create({
                data: {
                    company: { connect: { id: company.id } },
                    client: { connect: { id_companyId: { id: clients[q.clientIndex].id, companyId: company.id } } },
                    createdBy: { connect: { id: users[0].id } },
                    year,
                    number: q.number,
                    code,
                    status: q.status,
                    issueDate: day("2026-10-29"),
                    expiryDate: day("2026-11-05"),
                    currency: Currency.USD,
                    exchangeRate: fx,
                    exchangeRateNote: "Tipo de cambio manual de demostracion",
                    taxRate: D("18.00"),
                    taxIncluded: false,
                    subtotal,
                    taxAmount,
                    total: money(subtotal.plus(taxAmount)),
                    clientDocument: clients[q.clientIndex].documentNumber,
                    clientName: clients[q.clientIndex].legalName,
                    clientAddress: clients[q.clientIndex].address,
                    sellerName: users[0].name,
                    companySnapshot: {
                        legalName: company.legalName,
                        tradeName: company.tradeName,
                        taxId: company.taxId,
                        note: "Datos de demostracion",
                    },
                    terms: "Precios sujetos a confirmacion. Documento de demostracion.",
                    issuedAt: q.status === "DRAFT" ? null : day("2026-10-29"),
                    items: {
                        create: lines.map((line) => ({
                            position: line.position,
                            description: line.description,
                            unit: line.unit,
                            requestedUnits: line.requestedUnits,
                            quantity: line.quantity,
                            sourceCurrency: line.sourceCurrency,
                            sourceUnitPrice: line.sourceUnitPrice,
                            unitPrice: line.unitPrice,
                            lineTotal: line.lineTotal,
                            service: line.serviceId ? { connect: { id_companyId: { id: line.serviceId, companyId: company.id } } } : undefined,
                            vehicleModel: line.vehicleModelId ? { connect: { id_companyId: { id: line.vehicleModelId, companyId: company.id } } } : undefined,
                            serviceRate: line.serviceRateId ? { connect: { id_companyId: { id: line.serviceRateId, companyId: company.id } } } : undefined,
                            durationType: line.durationType,
                        })),
                    },
                    statusHistory: {
                        create: {
                            changedBy: { connect: { id: users[0].id } },
                            fromStatus: null,
                            toStatus: q.status,
                            note: "Cotizacion demo",
                        },
                    },
                },
            });
        });
    }

    // Nunca reducir el consecutivo si ya existen cotizaciones posteriores.
    const sequence = await prisma.quotationSequence.upsert({
        where: { companyId_year: { companyId: company.id, year: 2026 } },
        create: { companyId: company.id, year: 2026, lastNumber: 3 },
        update: {},
    });
    if (sequence.lastNumber < 3) {
        await prisma.quotationSequence.update({ where: { companyId_year: { companyId: company.id, year: 2026 } }, data: { lastNumber: 3 } });
    }
    console.log("Seed terminado con éxito: Tarifas USD por día sin desglose, condiciones guardadas directamente en durationType.");
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => prisma.$disconnect());