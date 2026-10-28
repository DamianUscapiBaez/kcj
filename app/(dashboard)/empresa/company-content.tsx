import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import CompanyTabs from "@/components/company/company-tabs";

export default async function CompanyContent() {
    await connection();

    const { membership } = await requireSessionCompany();

    const company = await prisma.company.findUnique({
        where: {
            id: membership.companyId,
        },
        include: {
            settings: true,
            bankAccounts: {
                orderBy: {
                    bankName: "asc",
                },
            },
        },
    });

    if (!company) {
        return (
            <div className="p-8 text-red-600">
                No se encontró la empresa.
            </div>
        );
    }

    const canEdit =
        membership.role === "OWNER" ||
        membership.role === "ADMIN";

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
                    Administra los datos de tu empresa, las preferencias
                    de cotización y las cuentas bancarias.
                </p>
            </header>

            <CompanyTabs
                canEdit={canEdit}
                logoUrl={company.logoUrl}
                company={{
                    taxId: company.taxId,
                    legalName: company.legalName,
                    tradeName: company.tradeName ?? "",
                    address: company.address ?? "",
                    email: company.email ?? "",
                    phone: company.phone ?? "",
                }}
                settings={{
                    defaultCurrency:
                        company.settings?.defaultCurrency ?? "PEN",
                    defaultTaxRate: Number(
                        company.settings?.defaultTaxRate ?? 18
                    ),
                    defaultValidityDays:
                        company.settings?.defaultValidityDays ?? 7,
                    quotationPrefix:
                        company.settings?.quotationPrefix ?? "CT",
                    defaultTerms:
                        company.settings?.defaultTerms ?? "",
                }}
                accounts={company.bankAccounts.map((account) => ({
                    id: account.id,
                    bankName: account.bankName,
                    accountName: account.accountName ?? "",
                    accountNumber: account.accountNumber,
                    cci: account.cci ?? "",
                    currency: account.currency,
                    isDetraction: account.isDetraction,
                    isActive: account.isActive,
                }))}
            />
        </main>
    );
}