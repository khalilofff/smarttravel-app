const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { email: "admin@smarttravel.com" },
    data: { passwordHash: await bcrypt.hash("SmartAdmin2026!", 10) },
  });

  await prisma.user.updateMany({
    where: { email: "manager@smarttravel.com" },
    data: { passwordHash: await bcrypt.hash("SmartManager2026!", 10) },
  });

  console.log("DONE: Super Admin and Manager passwords updated.");
  console.log("Super Admin: admin@smarttravel.com / SmartAdmin2026!");
  console.log("Manager: manager@smarttravel.com / SmartManager2026!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
