"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bankSchema = z.object({
    bankName: z.string().trim().min(2).max(100),
    accountName: z.string().trim().max(200),
    accountNumber: z.string().trim().min(4).max(60),
    cci: z.string().trim().max(60),
    currency: z.enum(["PEN", "USD"]),
    isDetraction: z.boolean(),
    isActive: z.boolean(),
});

export type BankAccountInput = z.input<typeof bankSchema>;

function refresh() {
    revalidatePath("/empresa");
    revalidatePath("/cotizaciones");
}

export async function saveBankAccount(
    id: string | null,
    input: BankAccountInput
) {
    try {
        const { membership } = await requireSessionCompany(
            undefined,
            ["OWNER", "ADMIN"]
        );

        const companyId = membership.companyId;
        const data = bankSchema.parse(input);

        const values = {
            bankName: data.bankName,
            accountName: data.accountName || null,
            accountNumber: data.accountNumber,
            cci: data.cci || null,
            currency: data.currency,
            isDetraction: data.isDetraction,
            isActive: data.isActive,
        };

        if (id) {
            if (!z.uuid().safeParse(id).success) {
                return { ok: false, message: "ID inválido." };
            }

            const result = await prisma.companyBankAccount.updateMany({
                where: { id, companyId },
                data: values,
            });

            if (result.count === 0) {
                return {
                    ok: false,
                    message: "Cuenta bancaria no encontrada.",
                };
            }
        } else {
            await prisma.companyBankAccount.create({
                data: {
                    companyId,
                    ...values,
                },
            });
        }

        refresh();

        return {
            ok: true,
            message: id
                ? "Cuenta bancaria actualizada."
                : "Cuenta bancaria registrada.",
        };
    } catch (error) {
        console.error("saveBankAccount", error);

        if (error instanceof z.ZodError) {
            return {
                ok: false,
                message: error.issues[0]?.message ?? "Datos inválidos.",
            };
        }

        return {
            ok: false,
            message: "No se pudo guardar la cuenta bancaria.",
        };
    }
}

export async function toggleBankAccount(
    id: string,
    isActive: boolean
) {
    try {
        const { membership } = await requireSessionCompany(
            undefined,
            ["OWNER", "ADMIN"]
        );

        if (!z.uuid().safeParse(id).success) {
            return { ok: false, message: "ID inválido." };
        }

        const result = await prisma.companyBankAccount.updateMany({
            where: {
                id,
                companyId: membership.companyId,
            },
            data: { isActive: !isActive },
        });

        if (result.count === 0) {
            return { ok: false, message: "Cuenta no encontrada." };
        }

        refresh();

        return {
            ok: true,
            message: !isActive
                ? "Cuenta activada."
                : "Cuenta desactivada.",
        };
    } catch (error) {
        console.error("toggleBankAccount", error);

        return {
            ok: false,
            message: "No se pudo cambiar el estado.",
        };
    }
}

export async function deleteBankAccount(id: string) {
    try {
        const { membership } = await requireSessionCompany(
            undefined,
            ["OWNER", "ADMIN"]
        );

        if (!z.uuid().safeParse(id).success) {
            return { ok: false, message: "ID inválido." };
        }

        const result = await prisma.companyBankAccount.deleteMany({
            where: {
                id,
                companyId: membership.companyId,
            },
        });

        if (result.count === 0) {
            return {
                ok: false,
                message: "Cuenta bancaria no encontrada.",
            };
        }

        refresh();

        return {
            ok: true,
            message: "Cuenta bancaria eliminada.",
        };
    } catch (error) {
        console.error("deleteBankAccount", error);

        return {
            ok: false,
            message: "No se pudo eliminar la cuenta bancaria.",
        };
    }
}