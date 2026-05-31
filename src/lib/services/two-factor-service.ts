import prisma from "@/lib/db";

const TWO_FACTOR_TTL_MINUTES = 10;

function createLocalCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function generateTwoFactorCode(userId: string, reason: "setup" | "login" | "regenerate" = "login") {
  const code = createLocalCode();
  const expiresAt = new Date(Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorCode: code, twoFactorExpiresAt: expiresAt },
  });

  const label = reason === "setup" ? "SETUP" : reason === "regenerate" ? "REGENERATED" : "LOGIN";
  console.log(`\n🔐 SMARTTRAVEL LOCAL 2FA (${label})`);
  console.log(`User ID: ${userId}`);
  console.log(`Code: ${code}`);
  console.log(`Expires: ${expiresAt.toLocaleString()}\n`);

  return { code, expiresAt };
}

export async function validateTwoFactorCode(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorCode: true, twoFactorExpiresAt: true },
  });

  if (!user?.twoFactorCode || !user.twoFactorExpiresAt) {
    throw new Error("No 2FA code has been generated. Please request a new code.");
  }

  if (user.twoFactorExpiresAt < new Date()) {
    throw new Error("2FA code expired. Please request a new code.");
  }

  if (user.twoFactorCode !== code.trim()) {
    throw new Error("Invalid 2FA code.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorCode: null, twoFactorExpiresAt: null },
  });

  return true;
}

export async function enableTwoFactor(userId: string, code: string) {
  await validateTwoFactorCode(userId, code);
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
}

export async function disableTwoFactor(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorCode: null, twoFactorExpiresAt: null },
  });
}
