"use client";

import { CaptureModal } from "@/components/CaptureModal";
import { ChannelHeader } from "@/components/ChannelHeader";
import { ClipCard } from "@/components/ClipCard";
import { VlogPreview } from "@/components/VlogPreview";
import { ME_ID, MEMBERS, PARTY } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { Camera, Clapperboard, Video } from "lucide-react";
import { useMemo, useState } from "react";

/** 기능 ① 데일리 게임 브이로그 — setlog 코어 루프의 게임 이식 */
export default function VlogPage() {
  const { todayClips, now } = useStore();
  const [capture, setCapture] = useState(false);
  const [preview, setPreview] = useState(false);

  const myCount = todayClips.filter((c) => c.memberId === ME_ID).length;

  // 23시 '합성 시각'까지 카운트다운
  const countdown = useMemo(() => {
    const target = new Date(now);
    target.setHours(23, 0, 0, 0);
    if (target.getTime() < now.getTime()) return "합성 완료! 내일 정오 발행";
    const diff = target.getTime() - now.getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}시간 ${m}분 후 자동 합성`;
  }, [now]);

  // 최신순 정렬: 최근 시간대가 맨 위, 같은 시간대 안에서도 최신 클립부터
  const byHour = useMemo(() => {
    const hours = [...new Set(todayClips.map((c) => c.hour))].sort((a, b) => b - a);
    return hours.map((h) => ({
      hour: h,
      clips: todayClips.filter((c) => c.hour === h).sort((a, b) => b.minute - a.minute),
    }));
  }, [todayClips]);

  return (
    <>
      <ChannelHeader
        icon={Video}
        name="오늘의-브이로그"
        topic="한 판 끝나면 2~5초 클립. 편집 없음, 사후 업로드 없음."
        right={
          <button className="btn btn-sm" onClick={() => setCapture(true)}>
            <Camera size={14} /> 클립 찍기
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[740px] space-y-6 p-4 pb-10">
          {/* 합성 배너 */}
          <button
            onClick={() => setPreview(true)}
            className="group flex w-full items-center gap-4 rounded-lg bg-gradient-to-r from-brand to-accent-fuchsia p-4 text-left transition-transform duration-200 hover:scale-[1.01]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white">
              <Clapperboard size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white">
                {PARTY.emoji} {PARTY.name} — 오늘의 파티 브이로그
              </p>
              <p className="text-[13px] text-white/80">
                클립 {todayClips.length}개 모임 · {countdown}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-[13px] font-bold text-white group-hover:bg-white/30">
              미리보기 ▶
            </span>
          </button>

          {/* 내 참여 현황 */}
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-[15px] font-bold text-txt-header">
                오늘 내 클립 {myCount}개
              </p>
              <p className="text-[13px] text-txt-muted">
                {myCount === 0
                  ? "아직 한 개도 없어! 게임 한 판 끝나면 바로 찍어줘 🎬"
                  : "좋아, 오늘 브이로그에 들어갈 거야"}
              </p>
            </div>
            <div className="flex -space-x-2">
              {MEMBERS.map((m) => {
                const has = todayClips.some((c) => c.memberId === m.id);
                return (
                  <div
                    key={m.id}
                    title={m.name}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm ring-2 ring-bg-secondary"
                    style={{ background: m.color, opacity: has ? 1 : 0.25 }}
                  >
                    {m.emoji}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 시간대별 타임라인 */}
          {byHour.length === 0 && (
            <div className="card py-10 text-center">
              <p className="text-3xl">🌅</p>
              <p className="mt-2 font-bold text-txt-header">오늘 사이클 시작!</p>
              <p className="text-[13px] text-txt-muted">첫 클립을 찍으면 타임라인이 채워져</p>
            </div>
          )}
          {byHour.map(({ hour, clips }) => (
            <section key={hour}>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="text-[15px] font-bold text-txt-header">
                  {hour < 12 ? "오전" : "오후"} {hour % 12 === 0 ? 12 : hour % 12}시
                </h3>
                <div className="h-px flex-1 bg-bg-modifier" />
                <span className="text-xxs font-semibold text-txt-muted">{clips.length}개</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {clips.map((c) => (
                  <ClipCard key={c.id} clip={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {capture && (
        <CaptureModal
          title="오늘의 클립 📹"
          duration={3}
          kind="vlog"
          onClose={() => setCapture(false)}
        />
      )}
      {preview && <VlogPreview clips={todayClips} onClose={() => setPreview(false)} />}
    </>
  );
}
