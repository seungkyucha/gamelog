// 공유 상태 저장소 — 모든 기기가 같은 파티 상태(클립 메타데이터, 퀘스트, 체크인 등)를 본다
import { readFile, writeFile } from "@/lib/github";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PATH = "data/state.json";
const MAX_BYTES = 900_000;

export async function GET() {
  try {
    const raw = await readFile(PATH);
    return new NextResponse(raw ?? "null", {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    console.error("state GET failed:", e);
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
    await writeFile(PATH, body, "chore: sync state");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("state POST failed:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
