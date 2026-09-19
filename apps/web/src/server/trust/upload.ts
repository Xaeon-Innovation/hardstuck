import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function saveUpload(
  file: File,
  subdir: string,
): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Image must be JPEG, PNG, or WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be under 4MB");
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const name = `${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${subdir}/${name}`;
}

export async function saveRankProofImage(file: File): Promise<string> {
  return saveUpload(file, "rank-proofs");
}

export async function saveIdDocumentImage(file: File): Promise<string> {
  return saveUpload(file, "id-docs");
}
