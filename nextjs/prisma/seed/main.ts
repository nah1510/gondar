import { PrismaClient } from '../../src/generated/client';
import { seedRoles } from './roles';
import { seedCategories } from './categories';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");
  
  await seedRoles(prisma);
  await seedCategories(prisma);
  
  console.log("All seeds completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
