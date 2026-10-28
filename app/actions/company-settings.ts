"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const settingsSchema = z.object({
    defaultCurrency: z.enum(["PEN", "USD"]),
    defaultTaxRate: z.coerce.number().min(0).max(100),
    defaultValidityDays: z.coerce.number().int().min(1).max(365),
    quotationPrefix: z
        .string()
        .trim()
        .min(1, "El prefijo es obligatorio.")
        .max(10)
        .regex(/^[A-Za-z0-9-]+$/, "Utiliza letras, números o guiones."),
    defaultTerms: z.string().trim().max(5000),
});

export type CompanySettingsInput = z.input<typeof settingsSchema>;

export async function saveCompanySettings(
    input: CompanySettingsInput
) {
    try {
        const { membership } = await requireSessionCompany(
            undefined,
            ["OWNER", "ADMIN"]
        );

        const data = settingsSchema.parse(input);
        const companyId = membership.companyId;

        const values = {
            defaultCurrency: data.defaultCurrency,
            defaultTaxRate: data.defaultTaxRate,
            defaultValidityDays: data.defaultValidityDays,
            quotationPrefix: data.quotationPrefix.toUpperCase(),
            defaultTerms: data.defaultTerms || null,
        };

        await prisma.companySettings.upsert({
            where: { companyId },
            create: {
                companyId,
                ...values,
            },
            update: values,
        });

        revalidatePath("/empresa");
        revalidatePath("/cotizaciones");

        return {
            ok: true,
            message: "Configuración guardada correctamente.",
        };
    } catch (error) {
        console.error("saveCompanySettings", error);

        if (error instanceof z.ZodError) {
            return {
                ok: false,
                message: error.issues[0]?.message ?? "Datos inválidos.",
            };
        }

        return {
            ok: false,
            message: "No se pudo guardar la configuración.",
        };
    }
}