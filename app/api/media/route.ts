// 미디어(영상/사진 dataURL) 공유 저장소 — 업로드 후 모든 기기에서 조회 가능
import { readFile, writeFile } from "@/lib/github";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GitHub Contents API 한도(1MB)에 맞춘 dataURL 최대 크기
const MAX_BYTES = 700_000;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    return new NextResponse("bad id", { status: 400 });
  }
  try {
    const data = await readFile(`media/${id}.txt`);
    if (!data) return new NextResponse("not found", { status: 404 });
    return new NextResponse(data, {
      headers: {
        "content-type": "text/plain",
        // 미디어는 불변 — CDN/브라우저 캐시 적극 활용
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("media GET failed:", e);
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
    await writeFile(`media/${id}.txt`, body, "chore: upload media");
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("media POST failed:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
