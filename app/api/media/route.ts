// 미디어(영상/사진 dataURL) 공유 저장소 — 업로드 후 모든 기기에서 조회 가능
import { withRedis } from "@/lib/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PREFIX = "gamelog:media:";
const MAX_BYTES = 950_000; // Upstash 요청 한도(1MB) 보호
const TTL_SECONDS = 60 * 60 * 24 * 14; // 14일 보관

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    return new NextResponse("bad id", { status: 400 });
  }
  try {
    const data = await withRedis((c) => c.get(PREFIX + id));
    if (!data) return new NextResponse("not found", { status: 404 });
    return new NextResponse(data, {
      headers: {
        "content-type": "text/plain",
        // 미디어는 불변 — CDN/브라우저 캐시 적극 활용
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (!body.startsWith("data:") || body.length > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "invalid-or-too-large" }, { status: 413 });
    }
    const id = crypto.randomUUID();
    await withRedis((c) => c.set(PREFIX + id, body, { EX: TTL_SECONDS }));
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
