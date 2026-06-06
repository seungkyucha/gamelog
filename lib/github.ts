// 서버 전용 — 프라이빗 GitHub 저장소(GH_DATA_REPO)를 공유 데이터 백엔드로 사용
// (계정의 Vercel Blob/Redis 스토어가 모두 사용 불가 상태라 Contents API로 대체)

const API = "https://api.github.com";

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} env missing`);
  return v;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${env("GH_TOKEN")}`,
    "User-Agent": "gamelog-proto",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

function fileUrl(path: string): string {
  return `${API}/repos/${env("GH_DATA_REPO")}/contents/${path}`;
}

/** 파일 원문 읽기 (없으면 null) */
export async function readFile(path: string): Promise<string | null> {
  const res = await fetch(fileUrl(path), {
    headers: headers({ Accept: "application/vnd.github.raw+json" }),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`github read ${res.status}`);
  return await res.text();
}

/** 파일 쓰기/덮어쓰기 (sha 자동 조회) */
export async function writeFile(path: string, content: string, message: string): Promise<void> {
  // 기존 파일이면 sha 필요
  let sha: string | undefined;
  const head = await fetch(fileUrl(path), { headers: headers(), cache: "no-store" });
  if (head.ok) {
    const j = (await head.json()) as { sha?: string };
    sha = j.sha;
  }
  const res = await fetch(fileUrl(path), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`github write ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
