import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { prisma } from "../lib/prisma";

async function main() {
    const users = [
        {
            email: "admin@demo.cotizaciones.test",
            password: "Admin12345!",
        },
        {
            email: "ventas@demo.cotizaciones.test",
            password: "Ventas12345!",
        },
        {
            email: "andinos@demo.cotizaciones.test",
            password: "Andinos12345!",
        },
    ];

    for (const user of users) {
        const passwordHash = await hash(user.password);

        await prisma.user.update({
            where: { email: user.email },
            data: { passwordHash },
        });

        console.log(`Contraseña configurada: ${user.email}`);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });