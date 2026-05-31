import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getLocalServerSession } from "@/lib/local-auth";

const ALLOWED_TYPES: Record<string, string[]> = {
  profile: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  receipt: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  cover: ["image/jpeg", "image/png", "image/webp"],
};
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const purpose = (formData.get("purpose") as string) || "profile";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large. Maximum 5MB." }, { status: 400 });

    const allowed = ALLOWED_TYPES[purpose] || ALLOWED_TYPES.profile;
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type. Allowed: ${allowed.join(", ")}` }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "");
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${userId}_${purpose}_${unique}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", purpose);
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

    const url = `/uploads/${purpose}/${filename}`;

    const uploadedFile = await prisma.uploadedFile.create({
      data: { userId, filename, originalName: file.name, mimeType: file.type, size: file.size, url, purpose },
    });

    if (purpose === "profile") {
      await prisma.user.update({ where: { id: userId }, data: { image: url } });
    }

    return NextResponse.json({ url, file: uploadedFile }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload could not be saved locally. Check file type, size, and uploads folder permissions." }, { status: 500 });
  }
}
