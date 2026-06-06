"use client";

import { CaptureModal } from "@/components/CaptureModal";
import { ChannelHeader } from "@/components/ChannelHeader";
import { ClipCard } from "@/components/ClipCard";
import { GAMES } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import { useMemo, useState } from "react";

/** 기능 ② 순간 포착 — "방금 그거!" 라이트 하이라이트 클립 */
export default function MomentsPage() {
  const { todayClips } = useStore();
  const [capture, setCapture] = useState(false);
  const [gameFilter, setGameFilter] = useState<string | null>(null);

  const moments = useMemo(() => {
    const ms = todayClips.filter((c) => c.kind === "moment" || c.kind === "quest");
    return gameFilter ? ms.filter((c) => c.gameId === gameFilter) : ms;
  }, [todayClips, gameFilter]);

  return (
    <>
      <ChannelHeader
        icon={Zap}
        name="potg"
        topic="오늘의 Play of the Game — 레전드 순간은 5초면 충분해."
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[740px] space-y-5 p-4 pb-10">
          {/* 방금 그거! 버튼 */}
          <button
            onClick={() => setCapture(true)}
            className="flex w-full flex-col items-center gap-1 rounded-lg bg-gradient-to-br from-accent-red to-accent-fuchsia py-7 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="text-4xl">🔥</span>
            <span className="text-xl font-black text-white">방금 그거!</span>
            <span className="text-[13px] font-medium text-white/80">
              지금 바로 5초 클립으로 남기기
            </span>
          </button>

          {/* 게임 필터 */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setGameFilter(null)}
              className={cn(
                "rounded-full px-3 py-1 text-[13px] font-semibold transition-colors",
                !gameFilter ? "bg-brand text-white" : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
              )}
            >
              전체
            </button>
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => setGameFilter(gameFilter === g.id ? null : g.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[13px] font-semibold transition-colors",
                  gameFilter === g.id ? "text-white" : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
                )}
                style={gameFilter === g.id ? { background: g.color } : undefined}
              >
                {g.emoji} {g.short}
              </button>
            ))}
          </div>

          {/* 모먼트 그리드 */}
          {moments.length === 0 ? (
            <div className="card py-10 text-center">
              <p className="text-3xl">⚡</p>
              <p className="mt-2 font-bold text-txt-header">아직 포착된 순간이 없어</p>
              <p className="text-[13px] text-txt-muted">
                펜타킬, 클러치, 치킨... 그 순간이 오면 바로 눌러!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {moments.map((c) => (
                <ClipCard key={c.id} clip={c} />
              ))}
            </div>
          )}
        </div>
      </div>

      {capture && (
        <CaptureModal
          title="방금 그거! 🔥"
          duration={5}
          kind="moment"
          onClose={() => setCapture(false)}
        />
      )}
    </>
  );
}
