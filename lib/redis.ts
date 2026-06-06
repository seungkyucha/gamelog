// 서버 전용 — Vercel에 연결된 Upstash Redis(REDIS_URL)로 공유 상태/미디어 저장
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

export async function withRedis<T>(fn: (c: RedisClient) => Promise<T>): Promise<T> {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    client.quit().catch(() => {});
  }
}
