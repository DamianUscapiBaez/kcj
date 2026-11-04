
"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

// ==========================================
// VALIDACIÓN DE DATOS DE LA EMPRESA
// ==========================================

const companySchema = z.object({
    taxId: z
        .string()
        .trim()
        .regex(
            /^\d{11}$/,
            "El RUC debe contener exactamente 11 dígitos."
        ),

    legalName: z
        .string()
        .trim()
        .min(2, "La razón social es obligatoria.")
        .max(200, "Máximo 200 caracteres."),

    tradeName: z
        .string()
        .trim()
        .max(200, "Máximo 200 caracteres."),

    address: z
        .string()
        .trim()
        .max(500, "Máximo 500 caracteres."),
});

export type CompanyInput = z.input<typeof companySchema>;

type ActionResult = {
    ok: boolean;
    message: string;
};

// ==========================================
// ACTUALIZAR INFORMACIÓN GENERAL
// ==========================================

export async function updateCompany(
    input: CompanyInput
): Promise<ActionResult> {
    try {
        // Solo ADMIN puede modificar la empresa
        const { membership } = await requireSessionCompany(
            undefined,
            ["ADMIN"]
        );

        // Validar los datos recibidos
        const data = companySchema.parse(input);

        // Actualizar la empresa correspondiente
        await prisma.company.update({
            where: {
                id: membership.companyId,
            },
            data: {
                taxId: data.taxId,
                legalName: data.legalName,
                tradeName: data.tradeName || null,
                address: data.address || null,
            },
        });

        // Actualizar las páginas relacionadas
        revalidatePath("/empresa");
        revalidatePath("/dashboard");
        revalidatePath("/cotizaciones");

        return {
            ok: true,
            message: "Los datos de la empresa se actualizaron correctamente.",
        };
    } catch (error) {
        console.error("updateCompany:", error);

        // Error de validación
        if (error instanceof z.ZodError) {
            return {
                ok: false,
                message:
                    error.issues[0]?.message ??
                    "Los datos ingresados no son válidos.",
            };
        }

        // RUC duplicado
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                ok: false,
                message:
                    "El RUC ingresado ya está registrado en otra empresa.",
            };
        }

        // Empresa no encontrada
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            return {
                ok: false,
                message: "No se encontró la empresa.",
            };
        }

        return {
            ok: false,
            message:
                "Ocurrió un error al actualizar los datos de la empresa.",
        };
    }
}
