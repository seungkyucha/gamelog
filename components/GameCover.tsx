"use client";

import { GAMES } from "@/lib/seed";
import { useState } from "react";

/** 정사각형 게임 타이틀 이미지. 로드 실패/미지정 시 컬러 타일 폴백 */
export function GameCover({ gameId, size = 48 }: { gameId: string; size?: number }) {
  const game = GAMES.find((g) => g.id === gameId)!;
  const [error, setError] = useState(false);

  if (!game.cover || error) {
    return (
      <span
        className="flex shrink-0 flex-col items-center justify-center rounded-lg"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${game.color}, #1E1F22)`,
        }}
        title={game.name}
      >
        <span style={{ fontSize: size * 0.42 }}>{game.emoji}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={game.cover}
      alt={game.name}
      title={game.name}
      loading="lazy"
      onError={() => setError(true)}
      className="shrink-0 rounded-lg object-cover ring-1 ring-bg-modifier"
      style={{ width: size, height: size, background: game.color }}
    />
  );
}
