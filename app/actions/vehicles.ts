
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { Prisma } from "@/app/generated/prisma/client";

// ======================================================
// VALIDACIONES
// ======================================================

const vehicleTypeSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "El nombre del tipo es obligatorio.")
        .max(120, "Máximo 120 caracteres."),

    description: z.string().trim().nullable().optional(),
});

const vehicleModelSchema = z.object({
    vehicleTypeId: z.uuid("Selecciona un tipo de vehículo válido."),

    brand: z
        .string()
        .trim()
        .min(1, "La marca es obligatoria.")
        .max(100, "Máximo 100 caracteres."),

    name: z
        .string()
        .trim()
        .min(1, "El modelo es obligatorio.")
        .max(120, "Máximo 120 caracteres."),

    description: z.string().trim().nullable().optional(),

    capacity: z
        .number()
        .int("La capacidad debe ser un número entero.")
        .positive("La capacidad debe ser mayor que cero.")
        .nullable(),
});

export type VehicleTypeInput = z.input<typeof vehicleTypeSchema>;
export type VehicleModelInput = z.input<typeof vehicleModelSchema>;

type ActionResult = {
    ok: boolean;
    message: string;
};

// ======================================================
// UTILIDADES
// ======================================================

function nullable(value?: string | null): string | null {
    return value?.trim() || null;
}

function refreshVehicles() {
    revalidatePath("/vehiculos");
    revalidatePath("/tarifas");
    revalidatePath("/cotizaciones");
}

function handleError(error: unknown): ActionResult {
    if (error instanceof z.ZodError) {
        return {
            ok: false,
            message: error.issues[0]?.message ?? "Datos inválidos.",
        };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return {
                ok: false,
                message: "Ya existe un registro con esos datos.",
            };
        }

        if (error.code === "P2003") {
            return {
                ok: false,
                message: "El registro tiene relaciones que impiden esta operación.",
            };
        }
    }

    console.error("Error en el módulo de vehículos:", error);

    return {
        ok: false,
        message: "Ocurrió un error al procesar la solicitud.",
    };
}

// ======================================================
// TIPOS DE VEHÍCULOS
// ======================================================

// CREAR / ACTUALIZAR
export async function saveVehicleType(
    id: string | null,
    input: VehicleTypeInput
): Promise<ActionResult> {
    const { membership } = await requireSessionCompany(
        undefined,
        ["ADMIN"]
    );

    try {
        if (id !== null && !z.uuid().safeParse(id).success) {
            return {
                ok: false,
                message: "Identificador inválido.",
            };
        }

        const data = vehicleTypeSchema.parse(input);

        if (id) {
            const result = await prisma.vehicleType.updateMany({
                where: {
                    id,
                    companyId: membership.companyId,
                },
                data: {
                    name: data.name,
                    description: nullable(data.description),
                },
            });

            if (result.count === 0) {
                return {
                    ok: false,
                    message: "Tipo de vehículo no encontrado.",
                };
            }
        } else {
            await prisma.vehicleType.create({
                data: {
                    companyId: membership.companyId,
                    name: data.name,
                    description: nullable(data.description),
                },
            });
        }

        refreshVehicles();

        return {
            ok: true,
            message: id
                ? "Tipo de vehículo actualizado correctamente."
                : "Tipo de vehículo registrado correctamente.",
        };
    } catch (error) {
        return handleError(error);
    }
}

// ACTIVAR / DESACTIVAR
export async function setVehicleTypeActive(
    id: string,
    active: boolean
): Promise<ActionResult> {
    const { membership } = await requireSessionCompany(
        undefined,
        ["ADMIN"]
    );

    try {
        if (
            !z.uuid().safeParse(id).success ||
            typeof active !== "boolean"
        ) {
            return {
                ok: false,
                message: "Datos inválidos.",
            };
        }

        const result = await prisma.$transaction(async (tx) => {
            // Bloqueamos cambios concurrentes sobre el tipo.
            const rows = await tx.$queryRaw<
                Array<{ id: string }>
            >`
                SELECT id
                FROM vehicle_types
                WHERE id = ${id}::uuid
                  AND company_id = ${membership.companyId}::uuid
                FOR UPDATE
            `;

            if (rows.length === 0) {
                return {
                    ok: false,
                    message: "Tipo de vehículo no encontrado.",
                };
            }

            if (!active) {
                const activeModels = await tx.vehicleModel.count({
                    where: {
                        companyId: membership.companyId,
                        vehicleTypeId: id,
                        isActive: true,
                    },
                });

                if (activeModels > 0) {
                    return {
                        ok: false,
                        message:
                            "No puedes desactivar un tipo que tiene modelos activos. Desactiva primero sus modelos.",
                    };
                }
            }

            await tx.vehicleType.update({
                where: { id },
                data: { isActive: active },
            });

            return {
                ok: true,
                message: active
                    ? "Tipo de vehículo activado correctamente."
                    : "Tipo de vehículo desactivado correctamente.",
            };
        });

        if (result.ok) refreshVehicles();

        return result;
    } catch (error) {
        return handleError(error);
    }
}

// ======================================================
// MODELOS DE VEHÍCULOS
// ======================================================

// CREAR / ACTUALIZAR
export async function saveVehicleModel(
    id: string | null,
    input: VehicleModelInput
): Promise<ActionResult> {
    const { membership } = await requireSessionCompany(
        undefined,
        ["ADMIN"]
    );

    const companyId = membership.companyId;

    try {
        if (id !== null && !z.uuid().safeParse(id).success) {
            return {
                ok: false,
                message: "Identificador inválido.",
            };
        }

        const data = vehicleModelSchema.parse(input);

        const result = await prisma.$transaction(async (tx) => {
            // Bloquear el tipo mientras comprobamos su estado.
            const typeRows = await tx.$queryRaw<
                Array<{ id: string; is_active: boolean }>
            >`
                SELECT id, is_active
                FROM vehicle_types
                WHERE id = ${data.vehicleTypeId}::uuid
                  AND company_id = ${companyId}::uuid
                FOR UPDATE
            `;

            const type = typeRows[0];

            if (!type || !type.is_active) {
                return {
                    ok: false,
                    message:
                        "Selecciona un tipo de vehículo activo de tu empresa.",
                };
            }

            if (id) {
                const updated = await tx.vehicleModel.updateMany({
                    where: {
                        id,
                        companyId,
                    },
                    data: {
                        vehicleTypeId: data.vehicleTypeId,
                        brand: data.brand,
                        name: data.name,
                        description: nullable(data.description),
                        capacity: data.capacity,
                    },
                });

                if (updated.count === 0) {
                    return {
                        ok: false,
                        message: "Modelo de vehículo no encontrado.",
                    };
                }
            } else {
                await tx.vehicleModel.create({
                    data: {
                        companyId,
                        vehicleTypeId: data.vehicleTypeId,
                        brand: data.brand,
                        name: data.name,
                        description: nullable(data.description),
                        capacity: data.capacity,
                    },
                });
            }

            return {
                ok: true,
                message: id
                    ? "Modelo de vehículo actualizado correctamente."
                    : "Modelo de vehículo registrado correctamente.",
            };
        });

        if (result.ok) refreshVehicles();

        return result;
    } catch (error) {
        return handleError(error);
    }
}

// ACTIVAR / DESACTIVAR
export async function setVehicleModelActive(
    id: string,
    active: boolean
): Promise<ActionResult> {
    const { membership } = await requireSessionCompany(
        undefined,
        ["ADMIN"]
    );

    try {
        if (
            !z.uuid().safeParse(id).success ||
            typeof active !== "boolean"
        ) {
            return {
                ok: false,
                message: "Datos inválidos.",
            };
        }

        const result = await prisma.$transaction(async (tx) => {
            const model = await tx.vehicleModel.findFirst({
                where: {
                    id,
                    companyId: membership.companyId,
                },
                select: {
                    id: true,
                    vehicleTypeId: true,
                },
            });

            if (!model) {
                return {
                    ok: false,
                    message: "Modelo de vehículo no encontrado.",
                };
            }

            // Bloqueamos el tipo para coordinar su estado
            // con la activación del modelo.
            const typeRows = await tx.$queryRaw<
                Array<{ is_active: boolean }>
            >`
                SELECT is_active
                FROM vehicle_types
                WHERE id = ${model.vehicleTypeId}::uuid
                  AND company_id = ${membership.companyId}::uuid
                FOR UPDATE
            `;

            if (active && !typeRows[0]?.is_active) {
                return {
                    ok: false,
                    message:
                        "Primero debes activar el tipo de vehículo.",
                };
            }

            const updated = await tx.vehicleModel.updateMany({
                where: {
                    id,
                    companyId: membership.companyId,
                    vehicleTypeId: model.vehicleTypeId,
                },
                data: {
                    isActive: active,
                },
            });

            if (updated.count === 0) {
                return {
                    ok: false,
                    message:
                        "El modelo cambió durante la operación. Intenta nuevamente.",
                };
            }

            return {
                ok: true,
                message: active
                    ? "Modelo de vehículo activado correctamente."
                    : "Modelo de vehículo desactivado correctamente.",
            };
        });

        if (result.ok) refreshVehicles();

        return result;
    } catch (error) {
        return handleError(error);
    }
}
