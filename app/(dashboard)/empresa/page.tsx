import { Suspense } from "react";
import CompanyContent from "./company-content";

export default function EmpresaPage() {
    return (
        <Suspense
            fallback={
                <div className="p-8 text-sm text-slate-500">
                    Cargando empresa...
                </div>
            }
        >
            <CompanyContent />
        </Suspense>
    );
}