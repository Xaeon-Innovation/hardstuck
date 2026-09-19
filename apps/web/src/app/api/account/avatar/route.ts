import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { isAllowedAvatarSrc } from "@/lib/avatars";
import { requireSession } from "@/server/auth/session";

const bodySchema = z.object({
  image: z.string().url(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }
  if (!isAllowedAvatarSrc(parsed.data.image)) {
    return NextResponse.json(
      { error: "Avatar must be a catalog character" },
      { status: 400 },
    );
  }

  await auth.api.updateUser({
    body: { image: parsed.data.image },
    headers: await headers(),
  });

  return NextResponse.json({ ok: true, image: parsed.data.image });
}
