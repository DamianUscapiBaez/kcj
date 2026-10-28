"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
    LayoutDashboard,
    Building2,
    FileText,
    Users,
    Wrench,
    Truck,
    DollarSign,
} from "lucide-react";

const subscribe = () => () => { };
const getSnapshot = () => true;
const getServerSnapshot = () => false;

const LINKS = [
    { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
    { href: "/empresa", label: "Empresa", icon: Building2 },
    { href: "/cotizaciones", label: "Cotizaciones", icon: FileText },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/servicios", label: "Servicios", icon: Wrench },
    { href: "/vehiculos", label: "Vehículos", icon: Truck },
    { href: "/tarifas", label: "Tarifas", icon: DollarSign },
] as const;

export default function NavLinks() {
    const pathname = usePathname();
    const mounted = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );

    return (
        <nav
            aria-label="Principal"
            className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-col md:overflow-visible"
        >
            {LINKS.map((link) => {
                const active =
                    mounted &&
                    (pathname === link.href ||
                        pathname.startsWith(`${link.href}/`));

                const IconComponent = link.icon;

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`
                            flex items-center gap-3 whitespace-nowrap
                            rounded-xl px-4 py-3 text-sm font-semibold
                            transition-colors
                            ${active
                                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                : "text-slate-600 hover:bg-slate-100"
                            }
                        `}
                    >
                        <IconComponent className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                        <span>{link.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}