import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123";

const demoUsers = [
  { name: "Super Admin", email: "admin@smarttravel.com", role: "SUPER_ADMIN" },
  { name: "Manager", email: "manager@smarttravel.com", role: "MANAGER" },
  { name: "Demo User", email: "user@smarttravel.com", role: "USER" },
];

async function main() {
  console.log("🌱 SmartTravel clean setup: reset DB, create 3 empty demo accounts only.");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Clean all user-owned/demo data through cascades. db push --force-reset also clears the DB,
  // but this keeps the seed safe if it is run separately later.
  await prisma.user.deleteMany({});

  for (const user of demoUsers) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email.toLowerCase(),
        role: user.role,
        passwordHash,
        isActive: true,
        emailVerified: new Date(),
        twoFactorEnabled: false,
      },
    });

    await prisma.userPreference.create({
      data: {
        userId: created.id,
        interests: "[]",
        travelStyle: "MODERATE",
        budgetStyle: "mid-range",
        preferredTransport: "[]",
        accommodationType: "HOTEL",
        defaultCurrency: "USD",
      },
    });

    console.log(`  ✓ ${created.email} (${created.role})`);
  }

  console.log("✅ Seed complete. Demo password: Password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
