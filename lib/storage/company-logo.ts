import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(
    process.cwd(),
    "public",
    "uploads",
    "empresas"
);

const MAX_SIZE = 2 * 1024 * 1024;

function getImageType(buffer: Buffer) {
    if (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        )
    ) {
        return { extension: "png", mime: "image/png" };
    }

    if (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
    ) {
        return { extension: "jpg", mime: "image/jpeg" };
    }

    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return { extension: "webp", mime: "image/webp" };
    }

    return null;
}

export async function uploadCompanyLogo(
    companyId: string,
    file: File
): Promise<string> {
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
        throw new Error("Identificador de empresa inválido.");
    }

    if (file.size === 0 || file.size > MAX_SIZE) {
        throw new Error("La imagen debe pesar entre 1 byte y 2 MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = getImageType(buffer);

    if (!detected || file.type !== detected.mime) {
        throw new Error("Solo se permiten imágenes PNG, JPG o WebP válidas.");
    }

    const directory = path.join(UPLOAD_ROOT, companyId);
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}.${detected.extension}`;
    const absolutePath = path.join(directory, filename);

    await writeFile(absolutePath, buffer, { flag: "wx" });

    return `/uploads/empresas/${companyId}/${filename}`;
}

export async function deleteCompanyLogo(
    companyId: string,
    logoUrl: string | null | undefined
): Promise<void> {
    if (!logoUrl) return;

    // Solo se permite borrar archivos propios de esta empresa.
    const prefix = `/uploads/empresas/${companyId}/`;

    if (!logoUrl.startsWith(prefix)) return;

    const filename = logoUrl.slice(prefix.length);

    if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(filename)) {
        return;
    }

    const absolutePath = path.join(
        UPLOAD_ROOT,
        companyId,
        filename
    );

    try {
        await unlink(absolutePath);
    } catch (error) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return;
        }

        throw error;
    }
}

export async function readCompanyLogo(
    companyId: string,
    logoUrl: string
): Promise<Buffer | null> {
    const prefix = `/uploads/empresas/${companyId}/`;

    if (!logoUrl.startsWith(prefix)) return null;

    const filename = logoUrl.slice(prefix.length);

    if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(filename)) {
        return null;
    }

    try {
        return await readFile(
            path.join(UPLOAD_ROOT, companyId, filename)
        );
    } catch {
        return null;
    }
}