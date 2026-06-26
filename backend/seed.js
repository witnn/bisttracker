const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@bisttracker.com' },
    update: {},
    create: {
      email: 'admin@bisttracker.com',
      name: 'Sistem Yoneticisi',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });
  console.log('Admin account seeded!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
