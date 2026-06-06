"use client";

import { Avatar } from "@/components/Avatar";
import { CaptureModal } from "@/components/CaptureModal";
import { ChannelHeader } from "@/components/ChannelHeader";
import { ME_ID, MEMBERS, QUEST_POOL, shiftKey, todaysQuest } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { cn, fmtDateKey } from "@/lib/utils";
import { Flame, Target } from "lucide-react";
import { useMemo, useState } from "react";

/** 기능 ⑤ 데일리 퀘스트 — 같은 미션, 다른 플레이 */
export default function QuestsPage() {
  const { today, questDoneToday, streak, completeQuest, pushToast } = useStore();
  const [capture, setCapture] = useState(false);

  const quest = todaysQuest(today);
  const myDone = questDoneToday.includes(ME_ID);
  const effectiveStreak = streak.count;

  // 지난 7일 퀘스트 히스토리 (결정적 시드)
  const history = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const key = shiftKey(-(i + 1));
        return { key, quest: todaysQuest(key), done: i < streak.count };
      }),
    [streak.count]
  );

  const doneMembers = MEMBERS.filter((m) => questDoneToday.includes(m.id));
  const pendingMembers = MEMBERS.filter((m) => !questDoneToday.includes(m.id));

  return (
    <>
      <ChannelHeader
        icon={Target}
        name="데일리-퀘스트"
        topic="매일 자정 새 퀘스트 발급. 같은 미션, 4명의 다른 플레이."
        right={
          <span className="flex items-center gap-1 rounded-full bg-bg-input px-3 py-1 text-[13px] font-bold text-accent-yellow">
            <Flame size={14} /> {effectiveStreak}일 연속
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[740px] space-y-5 p-4 pb-10">
          {/* 오늘의 퀘스트 카드 */}
          <div
            className={cn(
              "overflow-hidden rounded-lg",
              myDone
                ? "bg-gradient-to-br from-status-online to-brand"
                : "bg-gradient-to-br from-accent-yellow to-accent-red"
            )}
          >
            <div className="p-5">
              <p className="text-xxs font-bold uppercase tracking-wider text-white/70">
                오늘의 퀘스트 · {fmtDateKey(today)}
              </p>
              <div className="mt-2 flex items-start gap-4">
                <span className="text-5xl">{quest.emoji}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white">{quest.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-white/85">{quest.desc}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-black/25 px-3 py-1 text-[13px] font-bold text-white">
                  보상: {quest.reward} 🔥
                </span>
                {myDone ? (
                  <span className="rounded-full bg-white/25 px-4 py-1.5 text-[14px] font-black text-white">
                    완료! ✓
                  </span>
                ) : (
                  <button
                    onClick={() => setCapture(true)}
                    className="rounded-full bg-white px-4 py-1.5 text-[14px] font-black text-bg-tertiary transition-transform hover:scale-105"
                  >
                    클립으로 인증하기
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 파티 완료 현황 */}
          <div className="card">
            <p className="group-label mb-3">
              파티 완료 현황 — {doneMembers.length}/{MEMBERS.length}
            </p>
            <div className="space-y-2">
              {doneMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar member={m} size={28} />
                  <span className="flex-1 text-[14px] font-semibold text-txt-normal">{m.name}</span>
                  <span className="text-[13px] font-bold text-status-online">완료 ✓</span>
                </div>
              ))}
              {pendingMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 opacity-50">
                  <Avatar member={m} size={28} />
                  <span className="flex-1 text-[14px] font-semibold text-txt-normal">{m.name}</span>
                  <span className="text-[13px] text-txt-muted">아직...</span>
                </div>
              ))}
            </div>
            {doneMembers.length === MEMBERS.length && (
              <p className="mt-3 rounded-lg bg-brand/20 p-2 text-center text-[13px] font-bold text-txt-header">
                🎉 전원 완료! 오늘 브이로그에 퀘스트 하이라이트가 추가돼
              </p>
            )}
          </div>

          {/* 스트릭 */}
          <div className="card flex items-center gap-4">
            <span className="text-4xl">🔥</span>
            <div className="flex-1">
              <p className="text-lg font-black text-txt-header">{effectiveStreak}일 연속 달성 중</p>
              <p className="text-[13px] text-txt-muted">
                {myDone ? "오늘 몫은 끝! 내일 자정에 새 퀘스트가 와" : "오늘 퀘스트를 완료하면 스트릭이 이어져"}
              </p>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    i < Math.min(7, effectiveStreak) ? "bg-accent-yellow" : "bg-bg-input"
                  )}
                />
              ))}
            </div>
          </div>

          {/* 지난 퀘스트 */}
          <div>
            <p className="group-label mb-2">지난 퀘스트</p>
            <div className="space-y-1.5">
              {history.map(({ key, quest: q, done }) => (
                <div key={key} className="flex items-center gap-3 rounded-lg bg-bg-secondary px-3 py-2.5">
                  <span className="text-xl">{q.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-txt-normal">{q.title}</p>
                    <p className="text-xxs text-txt-muted">{fmtDateKey(key)}</p>
                  </div>
                  {done ? (
                    <span className="text-[13px] font-bold text-status-online">완료 ✓</span>
                  ) : (
                    <span className="text-[13px] text-txt-faint">미완료</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {capture && (
        <CaptureModal
          title={`퀘스트 인증 ${quest.emoji}`}
          duration={5}
          kind="quest"
          defaultCaption={quest.title}
          onClose={() => setCapture(false)}
          onSaved={() => {
            completeQuest();
            pushToast("퀘스트 완료! 스트릭이 이어졌어", "🔥");
          }}
        />
      )}
    </>
  );
}
