"use client";

import { ChannelHeader } from "@/components/ChannelHeader";
import { GAMES } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { cn, fmtDateKey, fmtMinutes } from "@/lib/utils";
import { BookOpen, Gift, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/** 기능 ④ 자동 게임 다이어리 + Wrapped (솔로 가치/리텐션 바닥) */
export default function DiaryPage() {
  const { diary, addDiary, today, pushToast } = useStore();
  const [form, setForm] = useState(false);
  const [gameId, setGameId] = useState(GAMES[0].id);
  const [minutes, setMinutes] = useState(60);
  const [result, setResult] = useState<"win" | "lose" | "none">("win");
  const [note, setNote] = useState("");

  // 최근 7일 통계
  const stats = useMemo(() => {
    const recent = diary.filter((e) => e.dateKey >= shiftDays(today, -6));
    const total = recent.reduce((s, e) => s + e.minutes, 0);
    const byGame = GAMES.map((g) => ({
      game: g,
      minutes: recent.filter((e) => e.gameId === g.id).reduce((s, e) => s + e.minutes, 0),
    }))
      .filter((x) => x.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    const wins = recent.filter((e) => e.result === "win").length;
    const loses = recent.filter((e) => e.result === "lose").length;
    return { total, byGame, sessions: recent.length, wins, loses };
  }, [diary, today]);

  const byDate = useMemo(() => {
    const keys = [...new Set(diary.map((e) => e.dateKey))].sort().reverse();
    return keys.slice(0, 10).map((k) => ({
      key: k,
      entries: diary.filter((e) => e.dateKey === k),
    }));
  }, [diary]);

  const maxGame = stats.byGame[0]?.minutes ?? 1;

  const submit = () => {
    addDiary({ dateKey: today, gameId, minutes, result, note: note.trim() || "기록 없음" });
    pushToast("오늘의 플레이가 기록됐어!", "📔");
    setForm(false);
    setNote("");
  };

  return (
    <>
      <ChannelHeader
        icon={BookOpen}
        name="게임-다이어리"
        topic="내 게임 인생의 아카이브. 그룹이 없어도 기록은 쌓인다."
        right={
          <button className="btn btn-sm" onClick={() => setForm((v) => !v)}>
            <Plus size={14} /> 기록 추가
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[740px] space-y-5 p-4 pb-10">
          {/* Wrapped 배너 */}
          <Link
            href="/wrapped"
            className="flex items-center gap-4 rounded-lg bg-gradient-to-r from-accent-fuchsia via-brand to-txt-link p-4 transition-transform duration-200 hover:scale-[1.01]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white">
              <Gift size={24} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">2026 상반기 gamelog Wrapped</p>
              <p className="text-[13px] text-white/80">반년치 게임 인생, 30초 리캡으로 보기</p>
            </div>
            <span className="text-2xl">🎁</span>
          </Link>

          {/* 기록 추가 폼 */}
          {form && (
            <div className="card animate-slide-up space-y-3">
              <p className="font-bold text-txt-header">오늘의 플레이 기록</p>
              <div className="flex flex-wrap gap-1.5">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGameId(g.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[13px] font-semibold transition-colors",
                      gameId === g.id ? "text-white" : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
                    )}
                    style={gameId === g.id ? { background: g.color } : undefined}
                  >
                    {g.emoji} {g.short}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={15}
                  max={300}
                  step={15}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="flex-1 accent-[#5865F2]"
                />
                <span className="w-20 text-right text-[14px] font-bold text-txt-header">
                  {fmtMinutes(minutes)}
                </span>
              </div>
              <div className="flex gap-1.5">
                {([
                  ["win", "🏆 승리"],
                  ["lose", "💀 패배"],
                  ["none", "😌 무관"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setResult(v)}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-colors",
                      result === v ? "bg-brand text-white" : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="input"
                placeholder="한 줄 감상 (예: 오늘 캐리함)"
                value={note}
                maxLength={50}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="btn btn-success w-full" onClick={submit}>
                기록하기
              </button>
            </div>
          )}

          {/* 주간 통계 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <p className="text-2xl font-black text-txt-header">{fmtMinutes(stats.total)}</p>
              <p className="text-xxs font-semibold text-txt-muted">이번 주 플레이</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black text-txt-header">{stats.sessions}</p>
              <p className="text-xxs font-semibold text-txt-muted">세션</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black text-txt-header">
                <span className="text-accent-green">{stats.wins}승</span>{" "}
                <span className="text-accent-red">{stats.loses}패</span>
              </p>
              <p className="text-xxs font-semibold text-txt-muted">전적</p>
            </div>
          </div>

          {/* 게임별 분포 */}
          {stats.byGame.length > 0 && (
            <div className="card space-y-2.5">
              <p className="group-label">이번 주 게임별 플레이</p>
              {stats.byGame.map(({ game, minutes: m }) => (
                <div key={game.id} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-[13px] font-bold text-txt-normal">
                    {game.emoji} {game.short}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-bg-input">
                    <div
                      className="flex h-full items-center rounded px-2 transition-all duration-500"
                      style={{ width: `${Math.max(8, (m / maxGame) * 100)}%`, background: game.color }}
                    >
                      <span className="text-xxs font-bold text-black/70">{fmtMinutes(m)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 날짜별 로그 */}
          <div className="space-y-4">
            {byDate.map(({ key, entries }) => (
              <section key={key}>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-[14px] font-bold text-txt-header">
                    {key === today ? "오늘" : fmtDateKey(key)}
                  </h3>
                  <div className="h-px flex-1 bg-bg-modifier" />
                </div>
                <div className="space-y-1.5">
                  {entries.map((e) => {
                    const game = GAMES.find((g) => g.id === e.gameId)!;
                    return (
                      <div key={e.id} className="flex items-center gap-3 rounded-lg bg-bg-secondary px-3 py-2.5">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                          style={{ background: `${game.color}33` }}
                        >
                          {game.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-txt-normal">
                            {game.name}
                            {e.result === "win" && <span className="ml-2 text-xxs font-bold text-accent-green">승리</span>}
                            {e.result === "lose" && <span className="ml-2 text-xxs font-bold text-accent-red">패배</span>}
                          </p>
                          <p className="truncate text-[13px] text-txt-muted">{e.note}</p>
                        </div>
                        <span className="shrink-0 text-[13px] font-bold text-txt-muted">{fmtMinutes(e.minutes)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function shiftDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
