import { createPrismaClient } from "../src/lib/prisma";

const prisma = createPrismaClient();

async function main() {
  
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
