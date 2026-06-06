"use client";

import { GAMES, MEMBERS, PARTY } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { fmtMinutes } from "@/lib/utils";
import { Gamepad2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/** 기능 ④-2 Wrapped — 스토리 형식 시즌 리캡 */
export default function WrappedPage() {
  const { diary, todayClips, streak, pushToast } = useStore();
  const [idx, setIdx] = useState(0);

  const slides = useMemo(() => {
    const total = diary.reduce((s, e) => s + e.minutes, 0) + 4860; // 시즌 누적(시드 보정)
    const byGame = GAMES.map((g) => ({
      game: g,
      minutes: diary.filter((e) => e.gameId === g.id).reduce((s, e) => s + e.minutes, 0),
    })).sort((a, b) => b.minutes - a.minutes);
    const top = byGame[0];
    const wins = diary.filter((e) => e.result === "win").length + 31;
    const clipCount = todayClips.length + 217;
    const bestFriend = MEMBERS[1];

    return [
      {
        bg: "linear-gradient(160deg, #5865F2, #1E1F22)",
        emoji: "🎮",
        kicker: "2026 상반기 gamelog Wrapped",
        title: `올해 너는\n${fmtMinutes(total)}을 플레이했어`,
        sub: "하루 평균 1시간 12분. 꾸준했다, 인정.",
      },
      {
        bg: `linear-gradient(160deg, ${top?.game.color ?? "#EB459E"}, #1E1F22)`,
        emoji: top?.game.emoji ?? "🧙",
        kicker: "최애 게임",
        title: `${top?.game.name ?? "리그 오브 레전드"}`,
        sub: `${fmtMinutes((top?.minutes ?? 0) + 2340)} · 너의 픽은 언제나 진심이었지`,
      },
      {
        bg: "linear-gradient(160deg, #23A55A, #1E1F22)",
        emoji: "🏆",
        kicker: "전적",
        title: `${wins}번의 승리`,
        sub: "패배는... 세지 않기로 했어. 우린 이긴 것만 기억해.",
      },
      {
        bg: "linear-gradient(160deg, #EB459E, #1E1F22)",
        emoji: "📹",
        kicker: "기록",
        title: `클립 ${clipCount}개\n스트릭 최고 ${Math.max(streak.count, 11)}일`,
        sub: "편집 없이, 날것 그대로. 그게 우리 스타일.",
      },
      {
        bg: "linear-gradient(160deg, #F0B232, #1E1F22)",
        emoji: bestFriend.emoji,
        kicker: "올해의 듀오",
        title: `${bestFriend.name}와(과)\n가장 많이 접속했어`,
        sub: `${PARTY.name}에서 함께한 89판 · 케미 만점`,
      },
      {
        bg: "linear-gradient(160deg, #5865F2, #EB459E)",
        emoji: "🌙",
        kicker: PARTY.name,
        title: "같은 판,\n더 가까운 우리",
        sub: "2026 하반기에도 gamelog와 함께!",
        final: true,
      },
    ];
  }, [diary, todayClips.length, streak.count]);

  const slide = slides[idx];

  return (
    <div
      className="relative flex flex-1 cursor-pointer flex-col overflow-hidden"
      style={{ background: slide.bg }}
      onClick={() => setIdx((i) => Math.min(i + 1, slides.length - 1))}
    >
      {/* 진행 바 */}
      <div className="flex gap-1 p-4">
        {slides.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i <= idx ? "#fff" : "rgba(255,255,255,0.25)" }}
          />
        ))}
      </div>

      <Link
        href="/vlog"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-4 top-8 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
      >
        <X size={18} />
      </Link>

      {/* 슬라이드 본문 */}
      <div key={idx} className="flex flex-1 animate-pop-in flex-col items-center justify-center gap-5 p-8 text-center">
        <span className="text-7xl drop-shadow-lg">{slide.emoji}</span>
        <p className="text-xxs font-bold uppercase tracking-[0.2em] text-white/70">{slide.kicker}</p>
        <h2 className="whitespace-pre-line text-3xl font-black leading-tight text-white md:text-4xl">
          {slide.title}
        </h2>
        <p className="max-w-sm text-[15px] font-medium text-white/80">{slide.sub}</p>

        {slide.final && (
          <div className="mt-4 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              className="rounded-full bg-white px-6 py-2.5 text-[15px] font-black text-bg-tertiary transition-transform hover:scale-105"
              onClick={() => {
                navigator.clipboard
                  ?.writeText("내 2026 상반기 gamelog Wrapped 🎮 — 같은 판, 더 가까운 우리")
                  .catch(() => {});
                pushToast("공유 문구가 복사됐어! 인스타에 자랑해", "🎁");
              }}
            >
              친구들에게 공유하기 🎁
            </button>
            <button
              className="text-[13px] font-semibold text-white/70 hover:text-white"
              onClick={() => setIdx(0)}
            >
              처음부터 다시 보기
            </button>
          </div>
        )}
      </div>

      <p className="flex items-center justify-center gap-1 pb-6 text-xxs font-semibold text-white/50">
        <Gamepad2 size={12} /> gamelog · 탭해서 다음으로
      </p>
    </div>
  );
}
