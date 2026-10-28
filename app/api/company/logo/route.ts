import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import {
    uploadCompanyLogo,
    deleteCompanyLogo,
} from "@/lib/storage/company-logo";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
    try {
        const { membership } = await requireSessionCompany(
            undefined,
            ["OWNER", "ADMIN"]
        );

        const companyId = membership.companyId;
        const formData = await request.formData();
        const file = formData.get("logo");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { ok: false, message: "Selecciona una imagen." },
                { status: 400 }
            );
        }

        if (file.size === 0 || file.size > 2 * 1024 * 1024) {
            return NextResponse.json(
                {
                    ok: false,
                    message: "El logo debe pesar como máximo 2 MB.",
                },
                { status: 400 }
            );
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { logoUrl: true },
        });

        if (!company) {
            return NextResponse.json(
                { ok: false, message: "Empresa no encontrada." },
                { status: 404 }
            );
        }

        let newLogoUrl: string;

        try {
            newLogoUrl = await uploadCompanyLogo(companyId, file);
        } catch (error) {
            return NextResponse.json(
                {
                    ok: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : "Imagen inválida.",
                },
                { status: 400 }
            );
        }

        try {
            await prisma.company.update({
                where: { id: companyId },
                data: { logoUrl: newLogoUrl },
            });
        } catch (error) {
            await deleteCompanyLogo(companyId, newLogoUrl).catch(
                console.error
            );
            throw error;
        }

        if (company.logoUrl) {
            await deleteCompanyLogo(
                companyId,
                company.logoUrl
            ).catch(console.error);
        }

        revalidatePath("/empresa");
        revalidatePath("/cotizaciones");

        return NextResponse.json({
            ok: true,
            message: "Logo actualizado correctamente.",
            logoUrl: newLogoUrl,
        });
    } catch (error) {
        console.error("POST /api/empresa/logo", error);

        return NextResponse.json(
            {
                ok: false,
                message: "No se pudo subir el logo.",
            },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const { membership } = await requireSessionCompany(
            undefined,
            ["OWNER", "ADMIN"]
        );

        const companyId = membership.companyId;

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { logoUrl: true },
        });

        if (!company) {
            return NextResponse.json(
                { ok: false, message: "Empresa no encontrada." },
                { status: 404 }
            );
        }

        if (!company.logoUrl) {
            return NextResponse.json({
                ok: true,
                message: "La empresa no tiene un logo.",
                logoUrl: null,
            });
        }

        await prisma.company.update({
            where: { id: companyId },
            data: { logoUrl: null },
        });

        await deleteCompanyLogo(
            companyId,
            company.logoUrl
        ).catch(console.error);

        revalidatePath("/empresa");
        revalidatePath("/cotizaciones");

        return NextResponse.json({
            ok: true,
            message: "Logo eliminado correctamente.",
            logoUrl: null,
        });
    } catch (error) {
        console.error("DELETE /api/empresa/logo", error);

        return NextResponse.json(
            {
                ok: false,
                message: "No se pudo eliminar el logo.",
            },
            { status: 500 }
        );
    }
}