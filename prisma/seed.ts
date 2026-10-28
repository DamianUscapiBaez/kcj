import "dotenv/config";
import { PrismaClient, Prisma, Currency, RateUnit, QuotationStatus, CompanyRole } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (process.env.NODE_ENV === "production") {
    throw new Error("El seed de demostración no debe ejecutarse en producción.");
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Falta DATABASE_URL.");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const D = (value: string | number) => new Prisma.Decimal(value);
const date = (value: string) => new Date(`${value}T12:00:00.000Z`);
const demo = "demo.cotizaciones.test";

async function main() {
    const companies = await Promise.all([
        prisma.company.upsert({
            where: { taxId: "20604022593" },
            update: {},
            create: {
                taxId: "20604022593", legalName: "INVERSIONES GENERALES SUMAQ ILLARY H Y M SAC",
                tradeName: "SUMAQ ILLARY", address: "Wichaypampa S/N, Challhuahuacho, Cotabambas, Apurímac",
                email: "Planeamiento@sumaqillary.com", phone: "957078886",
            },
        }),
        prisma.company.upsert({
            where: { taxId: "20999999991" }, update: {},
            create: { taxId: "20999999991", legalName: "TRANSPORTES DEMO ANDINOS SAC", tradeName: "Andinos Demo", email: `contacto@${demo}` },
        }),
    ]);
    const [mainCompany, secondCompany] = companies;

    for (const company of companies) {
        await prisma.companySettings.upsert({
            where: { companyId: company.id }, update: {},
            create: { companyId: company.id, defaultCurrency: "PEN", defaultTaxRate: D(18), defaultValidityDays: 7, quotationPrefix: "CT", defaultTerms: "Cotización válida por 7 días. Precios sujetos a confirmación." },
        });
    }

    const users: Array<Awaited<ReturnType<typeof prisma.user.upsert>>> = [];
    for (const [name, email] of [
        ["Administrador Demo", `admin@${demo}`], ["Vendedor Demo", `ventas@${demo}`], ["Administrador Andinos", `andinos@${demo}`],
    ]) {
        users.push(await prisma.user.upsert({ where: { email }, update: {}, create: { name, email, passwordHash: null } }));
    }
    for (const [companyId, userId, role] of [
        [mainCompany.id, users[0].id, CompanyRole.OWNER],
        [mainCompany.id, users[1].id, CompanyRole.SALES],
        [secondCompany.id, users[2].id, CompanyRole.OWNER],
    ] as const) {
        await prisma.companyUser.upsert({ where: { companyId_userId: { companyId, userId } }, update: { role }, create: { companyId, userId, role } });
    }

    const clientDefs = [
        ["20600694996", "K.C.J. PERU S.A.C", "Apurímac - Cotabambas - Coyllurqui"],
        ["20999990001", "MINERA DEMO SUR SAC", "Cusco"],
        ["20999990002", "CONSTRUCTORA DEMO ALTIPLANO SAC", "Arequipa"],
        ["20999990003", "LOGÍSTICA DEMO CUSCO SAC", "Cusco"],
        ["20999990004", "SERVICIOS DEMO APURÍMAC EIRL", "Apurímac"],
        ["20999990005", "CONSORCIO DEMO VIAL SAC", "Lima"],
        ["20999990006", "PROYECTOS DEMO ANDINOS SAC", "Cusco"],
        ["20999990007", "INGENIERÍA DEMO PERÚ SAC", "Lima"],
    ] as const;
    const clients = [];
    for (let i = 0; i < clientDefs.length; i++) {
        const [documentNumber, legalName, address] = clientDefs[i];
        const companyId = i < 6 ? mainCompany.id : secondCompany.id;
        const client = await prisma.client.upsert({
            where: { companyId_documentType_documentNumber: { companyId, documentType: "RUC", documentNumber } },
            update: {}, create: { companyId, documentType: "RUC", documentNumber, legalName, address, email: `cliente${i + 1}@${demo}`, phone: `9000000${String(i + 1).padStart(2, "0")}` },
        });
        clients.push(client);
        const existing = await prisma.clientContact.findFirst({ where: { clientId: client.id, name: `Contacto Demo ${i + 1}` } });
        if (!existing) await prisma.clientContact.create({ data: { clientId: client.id, name: `Contacto Demo ${i + 1}`, email: `contacto${i + 1}@${demo}`, isPrimary: true } });
    }

    const vehicles = [];
    for (const name of ["Camioneta 4x4", "Toyota Fortuner", "Van", "Minibús", "Bus", "Camioneta pickup"]) {
        vehicles.push(await prisma.vehicleType.upsert({ where: { companyId_name: { companyId: mainCompany.id, name } }, update: {}, create: { companyId: mainCompany.id, name } }));
    }
    const serviceDefs = [
        ["CONDUCTOR", "Conductor homologado"], ["ALQ-CAM", "Alquiler de camioneta"],
        ["ALQ-VAN", "Alquiler de van"], ["ALQ-MINI", "Alquiler de minibús"],
        ["ALQ-BUS", "Alquiler de bus"], ["TRASLADO", "Traslado de personal"],
    ] as const;
    const services = [];
    for (const [code, name] of serviceDefs) {
        services.push(await prisma.service.upsert({ where: { companyId_code: { companyId: mainCompany.id, code } }, update: {}, create: { companyId: mainCompany.id, code, name, description: `${name} (demostración)` } }));
    }

    const rateDefs: Array<[number, number | null, string, RateUnit, Currency, string]> = [
        [0, 0, "Conductor homologado / día", "DAY", "USD", "70"],
        [0, null, "Conductor homologado / hora", "HOUR", "USD", "12"],
        [1, 0, "Camioneta 4x4 / día", "DAY", "USD", "130"],
        [1, 1, "Fortuner / día", "DAY", "USD", "170"],
        [1, 5, "Pickup / día", "DAY", "USD", "140"],
        [2, 2, "Van / día", "DAY", "USD", "210"],
        [2, 2, "Van / viaje", "TRIP", "PEN", "450"],
        [3, 3, "Minibús / día", "DAY", "USD", "290"],
        [3, 3, "Minibús / viaje", "TRIP", "PEN", "650"],
        [4, 4, "Bus / día", "DAY", "USD", "400"],
        [4, 4, "Bus / viaje", "TRIP", "PEN", "950"],
        [5, null, "Traslado de personal / servicio", "SERVICE", "PEN", "300"],
    ];
    const rates: Array<Awaited<ReturnType<typeof prisma.serviceRate.create>>> = [];
    for (const [si, vi, name, unit, currency, price] of rateDefs) {
        const existing = await prisma.serviceRate.findFirst({ where: { companyId: mainCompany.id, name } });
        rates.push(existing ?? await prisma.serviceRate.create({ data: { companyId: mainCompany.id, serviceId: services[si].id, vehicleTypeId: vi === null ? null : vehicles[vi].id, name, unit, currency, price: D(price), isActive: true } }));
    }

    const bankDefs = [
        { bankName: "BBVA", accountNumber: "0011-0976-0200077862", cci: "011-976-000200077862-87", currency: Currency.PEN },
        { bankName: "BBVA", accountNumber: "0011-0976-0200129315", cci: "011-976-000200129315-84", currency: Currency.USD },
        { bankName: "Banco de la Nación", accountNumber: "00-180-009221", currency: Currency.PEN, isDetraction: true },
    ];
    for (const b of bankDefs) {
        const existing = await prisma.companyBankAccount.findFirst({ where: { companyId: mainCompany.id, bankName: b.bankName, accountNumber: b.accountNumber } });
        if (!existing) await prisma.companyBankAccount.create({ data: { companyId: mainCompany.id, ...b } });
    }

    const quotes: Array<{ number: number; clientIndex: number; status: QuotationStatus; currency: Currency; taxRate: string; items: Array<[number, string, string]> }> = [
        { number: 1, clientIndex: 0, status: "SENT", currency: "USD", taxRate: "0", items: [[0, "3", "70"]] },
        { number: 2, clientIndex: 1, status: "ACCEPTED", currency: "USD", taxRate: "18", items: [[2, "2", "130"], [0, "2", "70"]] },
        { number: 3, clientIndex: 2, status: "DRAFT", currency: "PEN", taxRate: "18", items: [[6, "1", "450"], [11, "1", "300"]] },
        { number: 4, clientIndex: 3, status: "REJECTED", currency: "USD", taxRate: "0", items: [[7, "2", "290"]] },
        { number: 5, clientIndex: 4, status: "SENT", currency: "PEN", taxRate: "18", items: [[8, "1", "650"], [11, "2", "300"]] },
        { number: 6, clientIndex: 5, status: "DRAFT", currency: "USD", taxRate: "18", items: [[9, "1", "400"]] },
    ];
    for (const q of quotes) {
        const year = 2026;
        const code = `CT${String(year).slice(-2)}-${String(q.number).padStart(4, "0")}`;
        const client = clients[q.clientIndex];
        const subtotal = q.items.reduce((sum, [, quantity, price]) => sum.plus(D(quantity).mul(D(price))), D(0));
        const taxAmount = subtotal.mul(D(q.taxRate)).div(100).toDecimalPlaces(2);
        const existing = await prisma.quotation.findUnique({ where: { companyId_code: { companyId: mainCompany.id, code } } });
        if (existing) continue;
        // Transacción: si falla un detalle, no queda una cotización incompleta.
        await prisma.$transaction(async (tx) => {
            // Usamos solo claves foráneas escalares, sin mezclar `connect`.
            const quotation = await tx.quotation.create({
                data: {
                    companyId: mainCompany.id,
                    clientId: client.id,
                    createdById: users[0].id,
                    year,
                    number: q.number,
                    code,
                    status: q.status,
                    issueDate: date("2026-10-25"),
                    expiryDate: date("2026-11-01"),
                    currency: q.currency,
                    taxRate: D(q.taxRate),
                    taxIncluded: false,
                    subtotal,
                    taxAmount,
                    total: subtotal.plus(taxAmount),
                    paymentTerms: "Crédito 30 días",
                    terms: "Cotización válida por 7 días. Condiciones sujetas a confirmación.",
                    clientDocument: client.documentNumber,
                    clientName: client.legalName,
                    clientAddress: client.address,
                    sellerName: "Vendedor Demo",
                    route: "Ruta interna",
                    shift: "TD",
                    issuedAt: q.status === "DRAFT" ? null : new Date(),
                },
            });

            await tx.quotationItem.createMany({
                data: q.items.map(([rateIndex, quantity, price], index) => {
                    const rate = rates[rateIndex];
                    return {
                        quotationId: quotation.id,
                        companyId: mainCompany.id,
                        serviceId: rate.serviceId,
                        vehicleTypeId: rate.vehicleTypeId,
                        serviceRateId: rate.id,
                        position: index + 1,
                        description: rate.name,
                        vehicleDescription: rate.name,
                        unit: rate.unit,
                        quantity: D(quantity),
                        unitPrice: D(price),
                        discountAmount: D(0),
                        lineTotal: D(quantity).mul(D(price)),
                    };
                }),
            });

            await tx.quotationStatusHistory.create({
                data: {
                    quotationId: quotation.id,
                    changedById: users[0].id,
                    fromStatus: null,
                    toStatus: q.status,
                    note: "Registro de demostración",
                },
            });
        });
    }
    const seq = await prisma.quotationSequence.findUnique({ where: { companyId_year: { companyId: mainCompany.id, year: 2026 } } });
    if (!seq || seq.lastNumber < 6) await prisma.quotationSequence.upsert({ where: { companyId_year: { companyId: mainCompany.id, year: 2026 } }, create: { companyId: mainCompany.id, year: 2026, lastNumber: 6 }, update: { lastNumber: 6 } });
    console.log("Seeder completado: 2 empresas, 3 usuarios, 8 clientes, 6 vehículos, 6 servicios, 12 tarifas, 6 cotizaciones.");
    console.log("Usuarios sin contraseña. Asígnala con: SEED_PASSWORD=... npx tsx prisma/set-password.ts <correo>");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
