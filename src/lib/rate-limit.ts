// Simple in-memory rate limiter for API routes
// For production, use Redis instead

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((v, k) => { if (now > v.resetAt) store.delete(k); });
  }, 5 * 60 * 1000);
}

// Helpers for common limits
export function authRateLimit(ip: string) {
  return rateLimit(`auth:${ip}`, 10, 15 * 60 * 1000); // 10 req / 15 min
}

export function apiRateLimit(userId: string) {
  return rateLimit(`api:${userId}`, 100, 60 * 1000); // 100 req / min
}

export function depositRateLimit(userId: string) {
  return rateLimit(`deposit:${userId}`, 5, 60 * 60 * 1000); // 5 deposits / hour
}
