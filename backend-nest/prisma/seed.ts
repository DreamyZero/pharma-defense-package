// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { fullName: 'Администратор системы', email: 'admin@pharma.local',      password: 'admin12345',  role: 'ADMIN' },
    { fullName: 'Иванов Иван Иванович',  email: 'doctor@pharma.local',     password: 'doctor12345', role: 'DOCTOR' },
    { fullName: 'Петрова Анна Сергеевна',email: 'pharmacist@pharma.local', password: 'pharma12345', role: 'PHARMACIST' },
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
        role: u.role as any,
        verified: true,
      },
    });
    console.log(`✅ ${u.role}: ${u.email} / ${u.password}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());