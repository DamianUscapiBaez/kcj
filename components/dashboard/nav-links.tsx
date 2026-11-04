"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    LayoutDashboard,
    Building2,
    FileText,
    Users,
    Wrench,
    Truck,
    DollarSign,
    type LucideIcon,
} from "lucide-react";

// ==========================================
// TIPOS
// ==========================================

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

// ==========================================
// NAVEGACIÓN PRINCIPAL
// ==========================================

const MAIN_LINKS: NavItem[] = [
    {
        href: "/dashboard",
        label: "Resumen",
        icon: LayoutDashboard,
    },
    {
        href: "/empresa",
        label: "Empresa",
        icon: Building2,
    },
    {
        href: "/cotizaciones",
        label: "Cotizaciones",
        icon: FileText,
    },
    {
        href: "/clientes",
        label: "Clientes",
        icon: Users,
    },
];

// ==========================================
// MÓDULOS / CATÁLOGOS DIRECTOS
// ==========================================

const CATALOG_LINKS: NavItem[] = [
    {
        href: "/servicios",
        label: "Servicios",
        icon: Wrench,
    },
    {
        href: "/vehiculos",
        label: "Vehículos",
        icon: Truck,
    },
    {
        href: "/tarifas",
        label: "Tarifas",
        icon: DollarSign,
    },
];

// ==========================================
// UTILIDADES
// ==========================================

function isActivePath(
    pathname: string,
    href: string
) {
    return (
        pathname === href ||
        pathname.startsWith(`${href}/`)
    );
}

// ==========================================
// COMPONENTE
// ==========================================

export default function NavLinks() {
    const pathname = usePathname();

    const linkBase =
        "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200";

    return (
        <nav
            aria-label="Navegación principal"
            className="flex flex-col gap-1.5 px-3 py-4"
        >
            {/* ======================================
                MENÚ PRINCIPAL
            ====================================== */}

            {MAIN_LINKS.map((link) => {
                const Icon = link.icon;
                const active = isActivePath(pathname, link.href);

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`${linkBase} ${active
                                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                            }`}
                    >
                        <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${active
                                    ? "text-white"
                                    : "text-slate-400 group-hover:text-slate-600"
                                }`}
                        />
                        <span>{link.label}</span>
                    </Link>
                );
            })}

            {/* ======================================
                SEPARADOR
            ====================================== */}

            <div className="my-3 border-t border-slate-100" />

            <p className="mb-2 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Catálogos
            </p>

            {/* ======================================
                CATÁLOGOS DIRECTOS
            ====================================== */}

            {CATALOG_LINKS.map((link) => {
                const Icon = link.icon;
                const active = isActivePath(pathname, link.href);

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`${linkBase} ${active
                                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                            }`}
                    >
                        <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${active
                                    ? "text-white"
                                    : "text-slate-400 group-hover:text-slate-600"
                                }`}
                        />
                        <span>{link.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}