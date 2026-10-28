"use client";

import { useState } from "react";
import CompanyForm from "@/components/company/company-form";
import CompanyLogo from "@/components/company/company-logo";
import CompanySettingsForm from "@/components/company/company-settings-form";
import CompanyBankAccounts from "@/components/company/company-bank-accounts";
import type { CompanyInput } from "@/app/actions/company";
import type { CompanySettingsInput } from "@/app/actions/company-settings";
import type { BankAccountInput } from "@/app/actions/company-bank-accounts";

type BankAccount = BankAccountInput & {
    id: string;
};

type Props = {
    company: CompanyInput;
    logoUrl: string | null;
    settings: CompanySettingsInput;
    accounts: BankAccount[];
    canEdit: boolean;
};

type Tab = "general" | "settings" | "banks";

const TABS: { id: Tab; label: string }[] = [
    { id: "general", label: "Información general" },
    { id: "settings", label: "Cotizaciones" },
    { id: "banks", label: "Cuentas bancarias" },
];

export default function CompanyTabs({
    company,
    logoUrl,
    settings,
    accounts,
    canEdit,
}: Props) {
    const [activeTab, setActiveTab] = useState<Tab>("general");

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto border-b border-slate-200">
                <div
                    role="tablist"
                    aria-label="Secciones de configuración"
                    className="flex min-w-max gap-2"
                >
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`panel-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${activeTab === tab.id
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <section
                id="panel-general"
                role="tabpanel"
                aria-labelledby="tab-general"
                hidden={activeTab !== "general"}
                className="space-y-6"
            >
                {activeTab === "general" && (
                    <>
                        <CompanyLogo
                            initialLogoUrl={logoUrl}
                            canEdit={canEdit}
                        />

                        <CompanyForm
                            initialData={company}
                            canEdit={canEdit}
                        />
                    </>
                )}
            </section>

            <section
                id="panel-settings"
                role="tabpanel"
                aria-labelledby="tab-settings"
                hidden={activeTab !== "settings"}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                {activeTab === "settings" && (
                    <CompanySettingsForm
                        initialData={settings}
                        canEdit={canEdit}
                    />
                )}
            </section>

            <section
                id="panel-banks"
                role="tabpanel"
                aria-labelledby="tab-banks"
                hidden={activeTab !== "banks"}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                {activeTab === "banks" && (
                    <CompanyBankAccounts
                        accounts={accounts}
                        canEdit={canEdit}
                    />
                )}
            </section>
        </div>
    );
}