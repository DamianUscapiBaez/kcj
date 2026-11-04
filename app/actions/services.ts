
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";

import {
    Prisma,
    ServiceType,
} from "@/app/generated/prisma/client";

// ==========================================
// VALIDACIÓN DE SERVICIOS
// ==========================================

const serviceSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, "El código es obligatorio.")
        .max(40, "El código no puede superar 40 caracteres."),

    name: z
        .string()
        .trim()
        .min(1, "El nombre es obligatorio.")
        .max(160, "El nombre no puede superar 160 caracteres."),

    type: z.enum(ServiceType, {
        error: "Selecciona un tipo de servicio válido.",
    }),

    requiresVehicle: z.boolean().default(false),

    description: z
        .string()
        .trim()
        .nullable()
        .optional(),
});

export type ServiceInput = z.input<typeof serviceSchema>;

type ActionResult = {
    ok: boolean;
    message: string;
};

const validId = (id: string) =>
    z.uuid().safeParse(id).success;

function refreshServices() {
    revalidatePath("/servicios");
    revalidatePath("/cotizaciones");
    revalidatePath("/tarifas");
}

// ==========================================
// CREAR / EDITAR SERVICIO
// ==========================================

export async function saveService(
    id: string | null,
    input: ServiceInput
): Promise<ActionResult> {
    try {
        const { membership } =
            await requireSessionCompany(
                undefined,
                ["ADMIN"]
            );

        const companyId = membership.companyId;

        if (id !== null && !validId(id)) {
            return {
                ok: false,
                message: "ID de servicio inválido.",
            };
        }

        const parsed = serviceSchema.parse(input);

        const data = {
            code: parsed.code.toUpperCase(),
            name: parsed.name,
            type: parsed.type,
            requiresVehicle: parsed.requiresVehicle,
            description:
                parsed.description?.trim() || null,
        };

        // Comprobar código duplicado
        const duplicate = await prisma.service.findFirst({
            where: {
                companyId,
                code: data.code,
                ...(id
                    ? { id: { not: id } }
                    : {}),
            },
            select: {
                id: true,
            },
        });

        if (duplicate) {
            return {
                ok: false,
                message:
                    "Ya existe un servicio con este código.",
            };
        }

        // ======================================
        // ACTUALIZAR
        // ======================================

        if (id) {
            const result =
                await prisma.service.updateMany({
                    where: {
                        id,
                        companyId,
                    },
                    data,
                });

            if (result.count === 0) {
                return {
                    ok: false,
                    message:
                        "Servicio no encontrado.",
                };
            }

            refreshServices();

            return {
                ok: true,
                message:
                    "Servicio actualizado correctamente.",
            };
        }

        // ======================================
        // CREAR
        // ======================================

        await prisma.service.create({
            data: {
                companyId,
                ...data,
                isActive: true,
            },
        });

        refreshServices();

        return {
            ok: true,
            message:
                "Servicio registrado correctamente.",
        };
    } catch (error) {
        console.error("saveService:", error);

        if (error instanceof z.ZodError) {
            return {
                ok: false,
                message:
                    error.issues[0]?.message ??
                    "Datos inválidos.",
            };
        }

        if (
            error instanceof
            Prisma.PrismaClientKnownRequestError
        ) {
            if (error.code === "P2002") {
                return {
                    ok: false,
                    message:
                        "El código del servicio ya está registrado.",
                };
            }

            if (error.code === "P2025") {
                return {
                    ok: false,
                    message:
                        "Servicio no encontrado.",
                };
            }
        }

        return {
            ok: false,
            message:
                "No se pudo guardar el servicio.",
        };
    }
}

// ==========================================
// ACTIVAR / DESACTIVAR
// ==========================================

export async function setServiceActive(
    id: string,
    active: boolean
): Promise<ActionResult> {
    try {
        const { membership } =
            await requireSessionCompany(
                undefined,
                ["ADMIN"]
            );

        if (!validId(id)) {
            return {
                ok: false,
                message: "ID de servicio inválido.",
            };
        }

        if (typeof active !== "boolean") {
            return {
                ok: false,
                message: "Estado inválido.",
            };
        }

        const result =
            await prisma.service.updateMany({
                where: {
                    id,
                    companyId: membership.companyId,
                },
                data: {
                    isActive: active,
                },
            });

        if (result.count === 0) {
            return {
                ok: false,
                message:
                    "Servicio no encontrado.",
            };
        }

        refreshServices();

        return {
            ok: true,
            message: active
                ? "Servicio activado correctamente."
                : "Servicio desactivado correctamente.",
        };
    } catch (error) {
        console.error("setServiceActive:", error);

        return {
            ok: false,
            message:
                "No se pudo cambiar el estado del servicio.",
        };
    }
}
