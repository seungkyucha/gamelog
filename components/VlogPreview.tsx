"use client";

import { MEMBERS } from "@/lib/seed";
import type { Clip } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { ClipMedia } from "./ClipCard";

const STEP_MS = 2400;

/** 오늘의 클립을 시간대별 분할화면으로 자동 재생하는 '합성 브이로그' 미리보기 */
export function VlogPreview({ clips, onClose }: { clips: Clip[]; onClose: () => void }) {
  // 시간대별로 그룹핑
  const steps = useMemo(() => {
    const hours = [...new Set(clips.map((c) => c.hour))].sort((a, b) => a - b);
    return hours.map((h) => ({
      hour: h,
      byMember: MEMBERS.map((m) => ({
        member: m,
        clip: clips.find((c) => c.hour === h && c.memberId === m.id),
      })),
    }));
  }, [clips]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1 >= steps.length ? (setPlaying(false), i) : i + 1));
    }, STEP_MS);
    return () => clearInterval(t);
  }, [playing, steps.length]);

  if (steps.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
        <div className="card animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-lg font-bold text-txt-header">아직 클립이 없어 😴</p>
          <p className="mt-1 text-sm text-txt-muted">오늘 첫 클립을 찍으면 브이로그가 만들어져!</p>
          <button className="btn mt-4 w-full" onClick={onClose}>닫기</button>
        </div>
      </div>
    );
  }

  const step = steps[Math.min(idx, steps.length - 1)];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 md:p-8"
      onClick={() => {
        if (!playing && idx >= steps.length - 1) {
          setIdx(0);
          setPlaying(true);
        } else {
          setPlaying((p) => !p);
        }
      }}
    >
      {/* 진행 바 */}
      <div className="mb-4 flex gap-1">
        {steps.map((s, i) => (
          <div key={s.hour} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className={cn("h-full bg-white transition-all", i < idx ? "w-full" : i === idx ? "w-full" : "w-0")}
              style={i === idx && playing ? { animation: `progress ${STEP_MS}ms linear` } : undefined}
            />
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xxs font-bold uppercase tracking-wider text-white/50">오늘의 파티 브이로그</p>
          <p className="text-2xl font-black text-white">
            {step.hour < 12 ? "오전" : "오후"} {step.hour % 12 === 0 ? 12 : step.hour % 12}시
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <X size={20} />
        </button>
      </div>

      {/* 2x2 분할 화면 */}
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
        {step.byMember.map(({ member, clip }) => (
          <div key={member.id} className="relative overflow-hidden rounded-xl bg-bg-tertiary">
            {clip ? (
              <ClipMedia clip={clip} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-txt-faint">
                <span className="text-3xl opacity-50">😴</span>
                <span className="text-xxs font-semibold">쉬는 중</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-6">
              <Avatar member={member} size={22} />
              <span className="text-[13px] font-bold text-white">{member.name}</span>
              {clip && <span className="truncate text-[12px] text-white/80">{clip.caption}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xxs font-semibold text-white/40">
        {playing ? "탭하면 일시정지" : idx >= steps.length - 1 ? "끝! 탭하면 다시 재생" : "탭하면 재생"}
      </p>
      <style jsx>{`
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
