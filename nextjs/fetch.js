const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const data = await prisma.categoryMapping.findMany({
    select: { keyword: true, category: true }
  });
  console.log(JSON.stringify(data, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
