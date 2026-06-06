// 공유 상태 저장소 — 모든 기기가 같은 파티 상태(클립 메타데이터, 퀘스트, 체크인 등)를 본다
import { withRedis } from "@/lib/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEY = "gamelog:state";
const MAX_BYTES = 900_000; // Upstash 요청 한도(1MB) 보호

export async function GET() {
  try {
    const raw = await withRedis((c) => c.get(KEY));
    return new NextResponse(raw ?? "null", {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json(null, { headers: { "cache-control": "no-store" } });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (!body || body.length > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "too-large" }, { status: 413 });
    }
    JSON.parse(body); // 유효성 검사
    await withRedis((c) => c.set(KEY, body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
