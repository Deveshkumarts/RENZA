const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: 'member@renza.com',
      password: 'password123',
      role: 'MEMBER'
    }
  });
  await prisma.user.create({
    data: {
      email: 'ceo@renza.com',
      password: 'password123',
      role: 'CEO'
    }
  });
  console.log('Seed completed');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
