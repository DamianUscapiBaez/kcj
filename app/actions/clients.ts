"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSessionCompany } from "@/lib/permissions";
import { Prisma } from "@/app/generated/prisma/client";

const optionalText = (max: number) =>
    z.string().trim().max(max).nullable().optional();

const contactSchema = z.object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "El nombre del contacto es obligatorio.").max(160),
    position: optionalText(100),
    phone: optionalText(40),
    email: z.union([
        z.email("El correo del contacto no es válido.").max(200),
        z.literal(""),
        z.null(),
    ]).optional(),
    isPrimary: z.boolean(),
});

const clientSchema = z.object({
    documentType: z.enum(["RUC", "DNI", "CE", "PASSPORT", "OTHER"]),
    documentNumber: z.string().trim().min(1, "El documento es obligatorio.").max(30),
    legalName: z.string().trim().min(1, "El nombre o razón social es obligatorio.").max(200),
    phone: optionalText(40),
    email: z.union([
        z.email("El correo del cliente no es válido.").max(200),
        z.literal(""),
        z.null(),
    ]).optional(),
    address: z.string().trim().nullable().optional(),
    contacts: z.array(contactSchema),
}).superRefine((data, ctx) => {
    if (data.documentType === "RUC" && !/^\d{11}$/.test(data.documentNumber)) {
        ctx.addIssue({
            code: "custom",
            path: ["documentNumber"],
            message: "El RUC debe contener 11 dígitos.",
        });
    }

    if (data.documentType === "DNI" && !/^\d{8}$/.test(data.documentNumber)) {
        ctx.addIssue({
            code: "custom",
            path: ["documentNumber"],
            message: "El DNI debe contener 8 dígitos.",
        });
    }

    if (data.contacts.filter((contact) => contact.isPrimary).length > 1) {
        ctx.addIssue({
            code: "custom",
            path: ["contacts"],
            message: "Solo puede existir un contacto principal.",
        });
    }

    const ids = data.contacts.flatMap((contact) =>
        contact.id ? [contact.id] : []
    );

    if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
            code: "custom",
            path: ["contacts"],
            message: "Hay contactos repetidos.",
        });
    }
});

export type ClientInput = z.input<typeof clientSchema>;

type ActionResult = {
    ok: boolean;
    message: string;
};

function normalizeNullable(value: string | null | undefined) {
    return value?.trim() || null;
}

function refreshClients() {
    revalidatePath("/clientes");
    revalidatePath("/cotizaciones");
}

function handleError(error: unknown): ActionResult {
    if (error instanceof z.ZodError) {
        return {
            ok: false,
            message: error.issues[0]?.message ?? "Datos inválidos.",
        };
    }

    if (error instanceof Error) {
        if (error.message === "CLIENT_NOT_FOUND") {
            return {
                ok: false,
                message: "El cliente no existe o no pertenece a tu empresa.",
            };
        }

        if (error.message === "CONTACT_NOT_FOUND") {
            return {
                ok: false,
                message: "Uno de los contactos no pertenece a este cliente.",
            };
        }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return {
                ok: false,
                message: "Ya existe un cliente con ese tipo y número de documento.",
            };
        }
    }

    console.error("Error en el módulo de clientes:", error);

    return {
        ok: false,
        message: "No se pudo completar la operación.",
    };
}

export async function saveClient(
    id: string | null,
    input: ClientInput
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
                message: "Identificador de cliente inválido.",
            };
        }

        const data = clientSchema.parse(input);

        if (!id && data.contacts.some((contact) => contact.id)) {
            return {
                ok: false,
                message: "Un cliente nuevo no puede incluir contactos existentes.",
            };
        }

        await prisma.$transaction(async (tx) => {
            const clientData = {
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                legalName: data.legalName,
                phone: normalizeNullable(data.phone),
                email: normalizeNullable(data.email)?.toLowerCase() ?? null,
                address: normalizeNullable(data.address),
            };

            let clientId: string;

            if (id) {
                const updated = await tx.client.updateMany({
                    where: {
                        id,
                        companyId,
                    },
                    data: clientData,
                });

                if (updated.count === 0) {
                    throw new Error("CLIENT_NOT_FOUND");
                }

                clientId = id;

                const existingContacts = await tx.clientContact.findMany({
                    where: { clientId },
                    select: { id: true },
                });

                const existingIds = new Set(
                    existingContacts.map((contact) => contact.id)
                );

                const submittedIds = new Set(
                    data.contacts.flatMap((contact) =>
                        contact.id ? [contact.id] : []
                    )
                );

                for (const submittedId of submittedIds) {
                    if (!existingIds.has(submittedId)) {
                        throw new Error("CONTACT_NOT_FOUND");
                    }
                }

                const removedIds = existingContacts
                    .filter((contact) => !submittedIds.has(contact.id))
                    .map((contact) => contact.id);

                if (removedIds.length > 0) {
                    await tx.clientContact.deleteMany({
                        where: {
                            clientId,
                            id: { in: removedIds },
                        },
                    });
                }
            } else {
                const created = await tx.client.create({
                    data: {
                        companyId,
                        ...clientData,
                    },
                    select: { id: true },
                });

                clientId = created.id;
            }

            for (const contact of data.contacts) {
                const contactData = {
                    name: contact.name,
                    position: normalizeNullable(contact.position),
                    phone: normalizeNullable(contact.phone),
                    email: normalizeNullable(contact.email)?.toLowerCase() ?? null,
                    isPrimary: contact.isPrimary,
                };

                if (contact.id) {
                    const updated = await tx.clientContact.updateMany({
                        where: {
                            id: contact.id,
                            clientId,
                        },
                        data: contactData,
                    });

                    if (updated.count === 0) {
                        throw new Error("CONTACT_NOT_FOUND");
                    }
                } else {
                    await tx.clientContact.create({
                        data: {
                            clientId,
                            ...contactData,
                        },
                    });
                }
            }
        });

        refreshClients();

        return {
            ok: true,
            message: id
                ? "Cliente actualizado correctamente."
                : "Cliente registrado correctamente.",
        };
    } catch (error) {
        return handleError(error);
    }
}

export async function setClientActive(
    id: string,
    active: boolean
): Promise<ActionResult> {
    const { membership } = await requireSessionCompany(
        undefined,
        ["ADMIN"]
    );

    try {
        if (!z.uuid().safeParse(id).success || typeof active !== "boolean") {
            return {
                ok: false,
                message: "Datos inválidos.",
            };
        }

        const updated = await prisma.client.updateMany({
            where: {
                id,
                companyId: membership.companyId,
            },
            data: {
                isActive: active,
            },
        });

        if (updated.count === 0) {
            return {
                ok: false,
                message: "Cliente no encontrado.",
            };
        }

        refreshClients();

        return {
            ok: true,
            message: active
                ? "Cliente activado correctamente."
                : "Cliente desactivado correctamente.",
        };
    } catch (error) {
        return handleError(error);
    }
}