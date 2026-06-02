"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const load_etl_data_1 = require("./load-etl-data");
const sync_neo4j_1 = require("./sync-neo4j");
const prisma = new client_1.PrismaClient();
async function seedUsers() {
    const users = [
        { fullName: 'Администратор системы', email: 'admin@pharma.local', password: 'admin12345', role: 'ADMIN' },
        { fullName: 'Иванов Иван Иванович', email: 'doctor@pharma.local', password: 'doctor12345', role: 'DOCTOR' },
        { fullName: 'Петрова Анна Сергеевна', email: 'pharmacist@pharma.local', password: 'pharma12345', role: 'PHARMACIST' },
    ];
    for (const u of users) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash },
            create: {
                fullName: u.fullName,
                email: u.email,
                passwordHash,
                role: u.role,
                verified: true,
            },
        });
        console.log(`✅ ${u.role}: ${u.email} / ${u.password}`);
    }
}
async function main() {
    await seedUsers();
    await (0, load_etl_data_1.loadEtlData)();
    if (process.env.SKIP_NEO4J_SYNC !== '1') {
        await (0, sync_neo4j_1.syncNeo4jFromPostgres)();
    }
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map