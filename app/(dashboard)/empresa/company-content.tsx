
import { connection } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";

import CompanyTabs from "@/components/company/company-tabs";

export default async function CompanyContent() {
    await connection();

    // ==========================================
    // 1. SESIÓN Y EMPRESA ACTIVA
    // ==========================================

    const { membership } = await requireSessionCompany();

    // ==========================================
    // 2. CONSULTAR DATOS DE LA EMPRESA
    // ==========================================

    const company = await prisma.company.findUnique({
        where: {
            id: membership.companyId,
        },

        include: {
            settings: true,

            phones: {
                orderBy: [
                    { position: "asc" },
                    { label: "asc" },
                ],
            },

            emails: {
                orderBy: [
                    { position: "asc" },
                    { label: "asc" },
                ],
            },

            bankAccounts: {
                orderBy: [
                    { position: "asc" },
                    { bankName: "asc" },
                ],
            },
        },
    });

    if (!company) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                No se encontró la empresa.
            </div>
        );
    }

    // ==========================================
    // 3. PERMISOS
    // ==========================================

    // Solo ADMIN puede modificar la configuración.
    const canEdit = membership.role === "ADMIN";

    // ==========================================
    // 4. FORMULARIO DE EMPRESA
    // ==========================================

    const companyData = {
        taxId: company.taxId,
        legalName: company.legalName,
        tradeName: company.tradeName ?? "",
        address: company.address ?? "",
    };

    // ==========================================
    // 5. CONFIGURACIÓN DE COTIZACIONES
    // ==========================================

    const settingsData = {
        defaultTaxRate: Number(
            company.settings?.defaultTaxRate ?? 18
        ),

        defaultValidityDays:
            company.settings?.defaultValidityDays ?? 7,

        quotationPrefix:
            company.settings?.quotationPrefix ?? "COT",

        defaultTerms:
            company.settings?.defaultTerms ?? "",
    };

    // ==========================================
    // 6. TELÉFONOS
    // ==========================================

    const phonesData = company.phones.map((phone) => ({
        id: phone.id,
        label: phone.label,
        number: phone.number,
        isPrimary: phone.isPrimary,
        isActive: phone.isActive,
        position: phone.position,
    }));

    // ==========================================
    // 7. CORREOS ELECTRÓNICOS
    // ==========================================

    const emailsData = company.emails.map((email) => ({
        id: email.id,
        label: email.label,
        email: email.email,
        isPrimary: email.isPrimary,
        isActive: email.isActive,
        position: email.position,
    }));

    // ==========================================
    // 8. CUENTAS BANCARIAS
    // ==========================================

    const accountsData = company.bankAccounts.map(
        (account) => ({
            id: account.id,
            bankName: account.bankName,
            accountName: account.accountName ?? "",
            accountNumber: account.accountNumber,
            cci: account.cci ?? "",
            currency: account.currency,
            isDetraction: account.isDetraction,
            isActive: account.isActive,
        })
    );

    // ==========================================
    // 9. INTERFAZ
    // ==========================================

    return (
        <main className="mx-auto max-w-6xl space-y-6 p-6">
            <header>
                <p className="text-sm font-semibold text-blue-600">
                    Configuración
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    Mi empresa
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Administra la información de KCJ, los teléfonos,
                    correos electrónicos, las preferencias de
                    cotización y las cuentas bancarias.
                </p>
            </header>

            <CompanyTabs
                company={companyData}
                logoUrl={company.logoUrl}
                settings={settingsData}
                phones={phonesData}
                emails={emailsData}
                accounts={accountsData}
                canEdit={canEdit}
            />
        </main>
    );
}
