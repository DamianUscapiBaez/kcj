import { Suspense } from "react";
import { connection } from "next/server";
import { catalogData, type CatalogKey, catalogs } from "@/lib/catalog";
import CatalogClient from "./catalog-client";

async function Content({ kind }: { kind: CatalogKey }) {
    await connection();
    const data = await catalogData(kind);

    return (
        <CatalogClient
            kind={kind}
            records={data.records}
            services={data.services}
            vehicles={data.vehicles}
            canEdit={data.role !== "VIEWER"}
        />
    );
}

export default function CatalogPage({ kind }: { kind: CatalogKey }) {
    return (
        <Suspense
            fallback={
                <div className="panel p-8 text-slate-500">
                    Cargando {catalogs[kind].title.toLowerCase()}...
                </div>
            }
        >
            <Content kind={kind} />
        </Suspense>
    );
}