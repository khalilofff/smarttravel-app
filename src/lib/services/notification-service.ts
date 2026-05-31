import prisma from '@/lib/db';

type NotificationType = string;

export async function createNotification({
  userId, type, title, message, link, metadata,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}) {
  const pref = await prisma.userPreference.findUnique({ where: { userId } });
  if (pref?.quietMode) return null;
  if (pref && pref.notificationsEnabled === false) return null;

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      metadata: metadata === undefined ? undefined : JSON.stringify(metadata),
    },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUserNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function notifyCollaborators(tripId: string, excludeUserId: string, type: NotificationType, title: string, message: string) {
  const collaborators = await prisma.collaborator.findMany({
    where: { tripId, status: 'ACCEPTED', userId: { not: excludeUserId } },
  });
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  const promises = collaborators.map((c: any) =>
    createNotification({ userId: c.userId, type, title, message, link: `/trip/${tripId}` })
  );

  if (trip && trip.userId !== excludeUserId) {
    promises.push(createNotification({ userId: trip.userId, type, title, message, link: `/trip/${tripId}` }));
  }

  await Promise.all(promises);
}
