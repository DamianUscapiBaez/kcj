"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

const companySchema = z.object({
    taxId: z
        .string()
        .trim()
        .regex(/^\d{11}$/, "El RUC debe tener 11 dígitos."),

    legalName: z
        .string()
        .trim()
        .min(2, "La razón social es obligatoria.")
        .max(200),

    tradeName: z.string().trim().max(200),
    address: z.string().trim().max(500),

    email: z.union([
        z.email("Correo electrónico inválido."),
        z.literal(""),
    ]),

    phone: z.string().trim().max(40),
});

export type CompanyInput = z.input<typeof companySchema>;

export async function updateCompany(input: CompanyInput) {
    try {
        const { membership } = await requireSessionCompany(
            undefined,
            ["OWNER", "ADMIN"]
        );

        const data = companySchema.parse(input);

        await prisma.company.update({
            where: { id: membership.companyId },
            data: {
                taxId: data.taxId,
                legalName: data.legalName,
                tradeName: data.tradeName || null,
                address: data.address || null,
                email: data.email || null,
                phone: data.phone || null,
            },
        });

        revalidatePath("/empresa");
        revalidatePath("/dashboard");
        revalidatePath("/cotizaciones");

        return {
            ok: true,
            message: "Empresa actualizada correctamente.",
        };
    } catch (error) {
        console.error("updateCompany", error);

        if (error instanceof z.ZodError) {
            return {
                ok: false,
                message: error.issues[0]?.message ?? "Datos inválidos.",
            };
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                ok: false,
                message: "El RUC ya está registrado.",
            };
        }

        return {
            ok: false,
            message: "No se pudo actualizar la empresa.",
        };
    }
}