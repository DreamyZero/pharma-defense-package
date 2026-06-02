import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { loadEtlData } from './load-etl-data';
import { syncNeo4jFromPostgres } from './sync-neo4j';

const prisma = new PrismaClient();

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
        role: u.role as 'ADMIN' | 'DOCTOR' | 'PHARMACIST',
        verified: true,
      },
    });
    console.log(`✅ ${u.role}: ${u.email} / ${u.password}`);
  }
}

async function main() {
  await seedUsers();
  await loadEtlData();
  if (process.env.SKIP_NEO4J_SYNC !== '1') {
    await syncNeo4jFromPostgres();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
