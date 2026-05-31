import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoUsers = [
  { name: "Super Admin", email: "admin@smarttravel.com", role: "SUPER_ADMIN", password: "SmartAdmin2026!" },
  { name: "Manager", email: "manager@smarttravel.com", role: "MANAGER", password: "SmartManager2026!" },
  { name: "Demo User", email: "user@smarttravel.com", role: "USER", password: "Password123" },
];

async function main() {
  console.log("🌱 SmartTravel clean setup: reset DB, create 3 empty demo accounts only.");

  // Clean all user-owned/demo data through cascades. db push --force-reset also clears the DB,
  // but this keeps the seed safe if it is run separately later.
  await prisma.user.deleteMany({});

  for (const user of demoUsers) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email.toLowerCase(),
        role: user.role,
        passwordHash: await bcrypt.hash(user.password, 10),
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

  console.log("✅ Seed complete.");
  console.log("   Super Admin: admin@smarttravel.com / SmartAdmin2026!");
  console.log("   Manager: manager@smarttravel.com / SmartManager2026!");
  console.log("   User: user@smarttravel.com / Password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
