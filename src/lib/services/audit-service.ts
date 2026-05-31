import prisma from '@/lib/db';

export async function logAudit({
  userId, tripId, action, details,
}: {
  userId?: string;
  tripId?: string;
  action: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: { userId, tripId, action, details },
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
