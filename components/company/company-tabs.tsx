
"use client";

import { useState, type KeyboardEvent } from "react";

import {
    Building2,
    Phone,
    Mail,
    FileText,
    CreditCard,
    type LucideIcon,
} from "lucide-react";

import CompanyForm from "@/components/company/company-form";
import CompanyLogo from "@/components/company/company-logo";
import CompanySettingsForm from "@/components/company/company-settings-form";
import CompanyBankAccounts from "@/components/company/company-bank-accounts";
import CompanyPhones from "@/components/company/company-phones";
import CompanyEmails from "@/components/company/company-emails";

import type { CompanyInput } from "@/app/actions/company";
import type { CompanySettingsInput } from "@/app/actions/company-settings";
import type { BankAccountInput } from "@/app/actions/company-bank-accounts";

// ==========================================
// TIPOS
// ==========================================

type BankAccount = BankAccountInput & {
    id: string;
};

export type CompanyPhone = {
    id: string;
    label: string;
    number: string;
    isPrimary: boolean;
    isActive: boolean;
    position: number;
};

export type CompanyEmail = {
    id: string;
    label: string;
    email: string;
    isPrimary: boolean;
    isActive: boolean;
    position: number;
};

type Props = {
    company: CompanyInput;
    logoUrl: string | null;
    settings: CompanySettingsInput;
    accounts: BankAccount[];
    phones: CompanyPhone[];
    emails: CompanyEmail[];
    canEdit: boolean;
};

type Tab =
    | "general"
    | "phones"
    | "emails"
    | "settings"
    | "banks";

type TabItem = {
    id: Tab;
    label: string;
    icon: LucideIcon;
};

// ==========================================
// CONFIGURACIÓN DE PESTAÑAS
// ==========================================

const TABS: TabItem[] = [
    {
        id: "general",
        label: "Información general",
        icon: Building2,
    },
    {
        id: "phones",
        label: "Teléfonos",
        icon: Phone,
    },
    {
        id: "emails",
        label: "Correos electrónicos",
        icon: Mail,
    },
    {
        id: "settings",
        label: "Cotizaciones",
        icon: FileText,
    },
    {
        id: "banks",
        label: "Cuentas bancarias",
        icon: CreditCard,
    },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CompanyTabs({
    company,
    logoUrl,
    settings,
    accounts,
    phones,
    emails,
    canEdit,
}: Props) {
    const [activeTab, setActiveTab] =
        useState<Tab>("general");

    // Navegación accesible mediante teclado
    function handleTabKeyDown(
        event: KeyboardEvent<HTMLButtonElement>,
        currentTab: Tab
    ) {
        const currentIndex = TABS.findIndex(
            (tab) => tab.id === currentTab
        );

        let nextIndex = currentIndex;

        switch (event.key) {
            case "ArrowRight":
                nextIndex = (currentIndex + 1) % TABS.length;
                break;

            case "ArrowLeft":
                nextIndex =
                    (currentIndex - 1 + TABS.length) %
                    TABS.length;
                break;

            case "Home":
                nextIndex = 0;
                break;

            case "End":
                nextIndex = TABS.length - 1;
                break;

            default:
                return;
        }

        event.preventDefault();

        const nextTab = TABS[nextIndex].id;
        setActiveTab(nextTab);

        document.getElementById(`tab-${nextTab}`)?.focus();
    }

    return (
        <div className="space-y-6">

            {/* ======================================
                NAVEGACIÓN DE PESTAÑAS
            ====================================== */}

            <div className="overflow-x-auto pb-1">
                <div
                    role="tablist"
                    aria-label="Configuración de empresa"
                    className="flex min-w-max items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5"
                >
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                id={`tab-${tab.id}`}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`panel-${tab.id}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() =>
                                    setActiveTab(tab.id)
                                }
                                onKeyDown={(event) =>
                                    handleTabKeyDown(
                                        event,
                                        tab.id
                                    )
                                }
                                className={`
                                    inline-flex items-center
                                    justify-center gap-2
                                    whitespace-nowrap
                                    rounded-xl px-4 py-3
                                    text-sm font-semibold
                                    transition-all duration-200
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-blue-500
                                    ${isActive
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                                    }
                                `}
                            >
                                <Icon
                                    className={`h-4 w-4 ${isActive
                                            ? "text-blue-600"
                                            : "text-slate-400"
                                        }`}
                                />

                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ======================================
                INFORMACIÓN GENERAL
            ====================================== */}

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

            {/* ======================================
                TELÉFONOS DE EMPRESA
            ====================================== */}

            <section
                id="panel-phones"
                role="tabpanel"
                aria-labelledby="tab-phones"
                hidden={activeTab !== "phones"}
            >
                {activeTab === "phones" && (
                    <CompanyPhones
                        phones={phones}
                        canEdit={canEdit}
                    />
                )}
            </section>

            {/* ======================================
                CORREOS ELECTRÓNICOS
            ====================================== */}

            <section
                id="panel-emails"
                role="tabpanel"
                aria-labelledby="tab-emails"
                hidden={activeTab !== "emails"}
            >
                {activeTab === "emails" && (
                    <CompanyEmails
                        emails={emails}
                        canEdit={canEdit}
                    />
                )}
            </section>

            {/* ======================================
                CONFIGURACIÓN DE COTIZACIONES
            ====================================== */}

            <section
                id="panel-settings"
                role="tabpanel"
                aria-labelledby="tab-settings"
                hidden={activeTab !== "settings"}
            >
                {activeTab === "settings" && (
                    <CompanySettingsForm
                        initialData={settings}
                        canEdit={canEdit}
                    />
                )}
            </section>

            {/* ======================================
                CUENTAS BANCARIAS
            ====================================== */}

            <section
                id="panel-banks"
                role="tabpanel"
                aria-labelledby="tab-banks"
                hidden={activeTab !== "banks"}
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
