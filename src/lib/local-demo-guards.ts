export function parsePositiveAmount(value: unknown, label = "Amount", max = 100000): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) throw new Error(`${label} must be a valid number.`);
  if (amount <= 0) throw new Error(`${label} must be greater than 0.`);
  if (amount > max) throw new Error(`${label} is too large for the local demo. Maximum allowed is $${max.toLocaleString()}.`);
  return Math.round(amount * 100) / 100;
}

export function parseOptionalNonNegativeAmount(value: unknown, label = "Amount", max = 100000): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) throw new Error(`${label} must be a valid number.`);
  if (amount < 0) throw new Error(`${label} cannot be negative.`);
  if (amount > max) throw new Error(`${label} is too large for the local demo. Maximum allowed is $${max.toLocaleString()}.`);
  return Math.round(amount * 100) / 100;
}

export function parseLocalDate(value: unknown, label = "Date"): Date {
  if (!value || typeof value !== "string") throw new Error(`${label} is required.`);
  const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} must be a valid date.`);
  return parsed;
}

export function assertDateRange(start: Date, end: Date) {
  if (end.getTime() < start.getTime()) throw new Error("End date must be the same day or after start date.");
}

export function normalizeSearchQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function safeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
