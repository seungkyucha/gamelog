"use client";

import { Avatar } from "@/components/Avatar";
import { ChannelHeader } from "@/components/ChannelHeader";
import { generateFeed, type FeedEvent, type FeedType } from "@/lib/feed";
import { GAMES, ME_ID, MEMBERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { cn, fmtTime } from "@/lib/utils";
import { Activity, Link2, Link2Off, Medal, Play, Swords, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

type Filter = "all" | FeedType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "start", label: "🎮 접속" },
  { key: "match", label: "⚔️ 전적" },
  { key: "achievement", label: "🏅 업적" },
  { key: "rank", label: "📈 랭크" },
];

function SourceBadge({ source }: { source: "steam" | "opgg" }) {
  return source === "steam" ? (
    <span className="rounded bg-[#1B2838] px-1.5 py-0.5 text-[10px] font-bold text-[#66C0F4]">
      STEAM
    </span>
  ) : (
    <span className="rounded bg-[#1A1A1A] px-1.5 py-0.5 text-[10px] font-bold text-[#5383E8]">
      OP.GG
    </span>
  );
}

/** 연동 카드: Steam / Riot(OP.GG) 계정 연결 */
function ConnectCard({
  kind,
  title,
  placeholder,
  desc,
}: {
  kind: "steam" | "riot";
  title: string;
  placeholder: string;
  desc: string;
}) {
  const { integrations, setIntegration, pushToast } = useStore();
  const linked = integrations[kind];
  const [value, setValue] = useState("");

  return (
    <div className="card flex items-center gap-3 p-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white",
          kind === "steam" ? "bg-[#1B2838]" : "bg-[#5383E8]"
        )}
      >
        {linked ? <Link2 size={18} /> : <Link2Off size={18} className="opacity-60" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-txt-header">{title}</p>
        {linked ? (
          <p className="truncate text-[13px] text-status-online">✓ {linked} 연동됨 · {desc}</p>
        ) : (
          <input
            className="input mt-1 h-8 text-[13px]"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                setIntegration(kind, value.trim());
                pushToast(`${title} 연동 완료! 내 활동도 피드에 올라가`, "🔗");
              }
            }}
          />
        )}
      </div>
      {linked ? (
        <button
          className="btn btn-sm btn-ghost shrink-0"
          onClick={() => {
            setIntegration(kind, undefined);
            pushToast(`${title} 연동을 해제했어`);
          }}
        >
          해제
        </button>
      ) : (
        <button
          className="btn btn-sm shrink-0"
          disabled={!value.trim()}
          onClick={() => {
            setIntegration(kind, value.trim());
            pushToast(`${title} 연동 완료! 내 활동도 피드에 올라가`, "🔗");
          }}
        >
          연동
        </button>
      )}
    </div>
  );
}

function EventCard({ e }: { e: FeedEvent }) {
  const { requestJoin, joinRequests, pushToast } = useStore();
  const member = MEMBERS.find((m) => m.id === e.memberId)!;
  const game = GAMES.find((g) => g.id === e.gameId)!;
  const isMe = e.memberId === ME_ID;
  const requested = joinRequests.includes(e.memberId);

  return (
    <div className="card flex gap-3 p-3">
      <Avatar member={member} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[14px] font-bold text-txt-header">{isMe ? "나" : member.name}</span>
          <SourceBadge source={e.source} />
          <span className="ml-auto text-xxs text-txt-faint">{fmtTime(e.hour, e.minute)}</span>
        </div>

        {e.type === "start" && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-[14px] text-txt-normal">
              <Play size={13} className="mr-1 inline text-status-online" />
              <span className="font-semibold" style={{ color: game.color }}>
                {game.emoji} {game.name}
              </span>
              을(를) 시작했어
            </p>
            {!isMe && (
              <button
                className={cn("btn btn-sm ml-auto", requested && "btn-ghost")}
                disabled={requested}
                onClick={() => {
                  requestJoin(e.memberId);
                  pushToast(`${member.name}에게 합류 요청을 보냈어!`, "🎮");
                }}
              >
                {requested ? "요청 보냄 ✓" : "나도 합류"}
              </button>
            )}
          </div>
        )}

        {e.type === "match" && e.match && (
          <div className="mt-1.5 flex items-center gap-3 rounded-lg bg-bg-input p-2.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-black text-white",
                e.match.win ? "bg-status-online" : "bg-status-danger"
              )}
            >
              {e.match.win ? "승" : "패"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-txt-normal">
                {game.emoji} {game.name} · {e.match.champion}
              </p>
              <p className="text-[13px] text-txt-muted">
                <Swords size={12} className="mr-0.5 inline" />
                KDA {e.match.kda} · 스코어 {e.match.score}
              </p>
            </div>
            {e.match.lp !== undefined && (
              <span
                className={cn(
                  "shrink-0 text-[14px] font-black",
                  e.match.lp > 0 ? "text-accent-green" : "text-accent-red"
                )}
              >
                {e.match.lp > 0 ? `+${e.match.lp}` : e.match.lp} LP
              </span>
            )}
          </div>
        )}

        {e.type === "achievement" && e.achievement && (
          <div className="mt-1.5 flex items-center gap-3 rounded-lg bg-gradient-to-r from-accent-yellow/20 to-transparent p-2.5">
            <Medal size={24} className="shrink-0 text-accent-yellow" />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-txt-header">
                업적 달성 — &ldquo;{e.achievement.name}&rdquo;
              </p>
              <p className="text-[13px] text-txt-muted">
                {game.emoji} {game.name} · 전체 플레이어의 {e.achievement.rarity}%만 달성 ✨
              </p>
            </div>
          </div>
        )}

        {e.type === "rank" && e.rank && (
          <div className="mt-1.5 flex items-center gap-3 rounded-lg bg-gradient-to-r from-brand/25 to-transparent p-2.5">
            <TrendingUp size={24} className="shrink-0 text-txt-link" />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-txt-header">
                랭크 승급! {e.rank.from} → <span className="text-txt-link">{e.rank.to}</span>
              </p>
              <p className="text-[13px] text-txt-muted">
                {game.emoji} {game.name} · 축하 리액션을 남겨줘 🎉
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Steam / OP.GG 연동 게임 활동 피드 */
export default function FeedPage() {
  const { now, today, integrations } = useStore();
  const [filter, setFilter] = useState<Filter>("all");

  const linkedAny = Boolean(integrations.steam || integrations.riot);

  const events = useMemo(
    () => generateFeed(today, now.getHours(), now.getMinutes(), linkedAny),
    [today, now, linkedAny]
  );

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <>
      <ChannelHeader
        icon={Activity}
        name="게임-피드"
        topic="Steam · OP.GG 연동 — 친구의 접속, 업적, 전적이 실시간으로 올라와."
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[740px] space-y-4 p-4 pb-10">
          {/* 계정 연동 */}
          <div className="space-y-2">
            <p className="group-label">계정 연동</p>
            <ConnectCard
              kind="steam"
              title="Steam"
              placeholder="Steam ID 입력 (예: gamer_sca)"
              desc="플레이 기록·업적 자동 수집"
            />
            <ConnectCard
              kind="riot"
              title="Riot · OP.GG"
              placeholder="소환사명#태그 (예: 스카#KR1)"
              desc="롤·발로란트 전적 자동 수집"
            />
            {!linkedAny && (
              <p className="rounded-lg bg-bg-secondary p-2.5 text-center text-[13px] text-txt-muted">
                계정을 연동하면 <span className="font-semibold text-txt-normal">내 활동도</span> 피드에 자동으로 올라가 📡
              </p>
            )}
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-[13px] font-semibold transition-colors",
                  filter === f.key ? "bg-brand text-white" : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 피드 (최신순) */}
          {filtered.length === 0 ? (
            <div className="card py-10 text-center">
              <p className="text-3xl">📡</p>
              <p className="mt-2 font-bold text-txt-header">아직 올라온 활동이 없어</p>
              <p className="text-[13px] text-txt-muted">친구들이 게임을 시작하면 여기에 실시간으로 떠</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
