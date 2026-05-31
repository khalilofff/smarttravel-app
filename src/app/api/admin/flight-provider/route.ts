import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getLocalServerSession } from "@/lib/local-auth";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "flight-provider.json");
const ALLOWED = new Set(["AUTO", "SERPAPI_3", "SERPAPI_2", "SERPAPI_1", "SEARCHAPI", "DUFFEL"]);

async function readProvider() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return ALLOWED.has(parsed.provider) ? parsed : { provider: "AUTO", updatedAt: null };
  } catch {
    return { provider: "AUTO", updatedAt: null };
  }
}

export async function GET() {
  return NextResponse.json(await readProvider());
}

export async function POST(req: NextRequest) {
  const session = await getLocalServerSession();
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider || "AUTO").toUpperCase();
  if (!ALLOWED.has(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = { provider, updatedAt: new Date().toISOString(), updatedBy: session?.user?.email || "admin" };
  await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2));
  return NextResponse.json(payload);
}
