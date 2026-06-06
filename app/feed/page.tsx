"use client";

import { Avatar } from "@/components/Avatar";
import { ChannelHeader } from "@/components/ChannelHeader";
import { ClipMedia } from "@/components/ClipCard";
import { GameCover } from "@/components/GameCover";
import { generateFeed, type FeedEvent, type FeedType } from "@/lib/feed";
import { GAMES, ME_ID, MEMBERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Clip } from "@/lib/types";
import { cn, fmtMinutes, fmtTime } from "@/lib/utils";
import { Activity, Link2, Link2Off, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type Filter = "all" | "clip" | "session" | "match" | "achievement" | "rank";

/** 필터 그룹 → 포함되는 이벤트 타입 */
const FILTER_TYPES: Record<Exclude<Filter, "all" | "clip">, FeedType[]> = {
  session: ["start", "end"],
  match: ["match", "mvp", "streak", "duo"],
  achievement: ["achievement", "milestone", "library"],
  rank: ["rank"],
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "clip", label: "📹 클립" },
  { key: "session", label: "🎮 접속" },
  { key: "match", label: "⚔️ 전적" },
  { key: "achievement", label: "🏅 업적" },
  { key: "rank", label: "📈 랭크" },
];

/** 피드 아이템: 연동 이벤트 또는 파티원 클립(브이로그/POTG) */
type FeedItem =
  | { kind: "event"; time: number; e: FeedEvent }
  | { kind: "clip"; time: number; c: Clip };

const CLIP_LABEL: Record<Clip["kind"], { label: string; href: string; color: string }> = {
  vlog: { label: "브이로그", href: "/vlog", color: "#5865F2" },
  moment: { label: "POTG", href: "/moments", color: "#EB459E" },
  quest: { label: "퀘스트 인증", href: "/quests", color: "#F0B232" },
  now: { label: "체크인", href: "/now", color: "#00A8FC" },
};

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

/** 계정 연동 팝업 */
function ConnectModal({ onClose }: { onClose: () => void }) {
  const { integrations } = useStore();
  const linkedAny = Boolean(integrations.steam || integrations.riot);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md animate-pop-in rounded-lg bg-bg-secondary shadow-elev-high"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 pt-4">
          <h3 className="text-lg font-bold text-txt-header">계정 연동 🔗</h3>
          <button onClick={onClose} className="rounded p-1 text-txt-muted hover:bg-bg-modifier hover:text-txt-normal">
            <X size={20} />
          </button>
        </header>
        <div className="space-y-2 p-4">
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
          <p className="rounded-lg bg-bg-tertiary p-2.5 text-center text-[13px] text-txt-muted">
            {linkedAny
              ? "연동된 계정의 활동이 피드에 자동으로 올라가 📡"
              : "계정을 연동하면 내 활동도 피드에 자동으로 올라가 📡"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- 트위터 스타일 피드 카드 ----

/** 트윗 셸: 좌측 아바타 + 이름·시간 헤더 + 본문 + 첨부 */
function Tweet({
  member,
  source,
  badge,
  badgeColor,
  hour,
  minute,
  text,
  attachment,
}: {
  member: (typeof MEMBERS)[number];
  source?: "steam" | "opgg";
  badge?: string;
  badgeColor?: string;
  hour: number;
  minute: number;
  text: ReactNode;
  attachment?: ReactNode;
}) {
  const isMe = member.id === ME_ID;
  return (
    <article className="p-4 transition-colors hover:bg-[#34363C]/60">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Avatar member={member} size={18} />
          <span className="text-[15px] font-bold text-txt-header">{isMe ? "나" : member.name}</span>
          <span className="text-[13px] text-txt-faint">@{member.id}</span>
          {source && <SourceBadge source={source} />}
          {badge && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: `${badgeColor}33`, color: badgeColor }}
            >
              {badge}
            </span>
          )}
          <span className="text-[13px] text-txt-faint">· {fmtTime(hour, minute)}</span>
        </div>
        <div className="mt-1 text-[15px] leading-relaxed text-txt-normal">{text}</div>
        {attachment && <div className="mt-3">{attachment}</div>}
      </div>
    </article>
  );
}

/** 첨부: 게임 인용 카드 (트위터 링크 카드 느낌) */
function GameAttachment({
  gameId,
  sub,
  right,
}: {
  gameId: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  const game = GAMES.find((g) => g.id === gameId)!;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-bg-modifier bg-bg-tertiary/40 p-3">
      <GameCover gameId={gameId} size={56} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-txt-header">
          {game.emoji} {game.name}
        </p>
        {sub && <p className="truncate text-[13px] text-txt-muted">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/** 첨부: 전적 카드 */
function MatchAttachment({ e }: { e: FeedEvent }) {
  const m = e.match!;
  const game = GAMES.find((g) => g.id === e.gameId)!;
  const chicken = e.gameId === "pubg" && m.win;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4",
        chicken
          ? "border-accent-yellow/40 bg-gradient-to-r from-accent-yellow/15 to-bg-tertiary/40"
          : m.win
            ? "border-status-online/30 bg-gradient-to-r from-status-online/10 to-bg-tertiary/40"
            : "border-status-danger/30 bg-gradient-to-r from-status-danger/10 to-bg-tertiary/40"
      )}
    >
      <GameCover gameId={e.gameId} size={56} />
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-black text-txt-header">
          {chicken ? (
            <span className="text-accent-yellow">🍗 치킨 디너!</span>
          ) : (
            <span className={m.win ? "text-accent-green" : "text-accent-red"}>
              {m.win ? "승리" : "패배"}
            </span>
          )}
          <span className="ml-2 text-[14px] font-semibold text-txt-muted">{game.name}</span>
        </p>
        <p className="text-[14px] text-txt-normal">
          {m.champion} · <span className="font-bold">KDA {m.kda}</span> ·{" "}
          {e.gameId === "pubg" ? `등수 ${m.score}` : `스코어 ${m.score}`}
        </p>
      </div>
      {m.lp !== undefined && (
        <span className={cn("text-xl font-black", m.lp > 0 ? "text-accent-green" : "text-accent-red")}>
          {m.lp > 0 ? `+${m.lp}` : m.lp}
          <span className="ml-0.5 text-[12px]">LP</span>
        </span>
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

  const base = { member, source: e.source, hour: e.hour, minute: e.minute };

  switch (e.type) {
    case "start":
      return (
        <Tweet
          {...base}
          text={<>지금 <b>{game.name}</b> 켰다 🎮 같이 할 사람?</>}
          attachment={
            <GameAttachment
              gameId={e.gameId}
              sub="지금 플레이 중"
              right={
                !isMe && (
                  <button
                    className={cn("btn btn-sm", requested && "btn-ghost")}
                    disabled={requested}
                    onClick={() => {
                      requestJoin(e.memberId);
                      pushToast(`${member.name}에게 합류 요청을 보냈어!`, "🎮");
                    }}
                  >
                    {requested ? "요청 ✓" : "나도 합류"}
                  </button>
                )
              }
            />
          }
        />
      );

    case "end":
      return (
        <Tweet
          {...base}
          text={
            <>
              <b>{game.name}</b> 오늘은 여기까지 👋{" "}
              <span className="text-txt-muted">({fmtMinutes(e.end?.minutes ?? 0)} 플레이)</span>
            </>
          }
        />
      );

    case "match":
      return (
        <Tweet
          {...base}
          text={
            e.gameId === "pubg" && e.match?.win ? (
              <>이걸 먹네?? 오늘 저녁은 치킨이다 🍗</>
            ) : e.match?.win ? (
              <>한 판 이기고 시작 😎</>
            ) : (
              <>아 이건 팀운이 없었다... 🫠</>
            )
          }
          attachment={<MatchAttachment e={e} />}
        />
      );

    case "mvp":
      return (
        <Tweet
          {...base}
          text={<>이번 판 MVP는 나야 👑</>}
          attachment={
            <GameAttachment
              gameId={e.gameId}
              sub={
                <>
                  매치 MVP · {e.mvp?.champion} · <b>KDA {e.mvp?.kda}</b>
                </>
              }
            />
          }
        />
      );

    case "achievement":
      return (
        <Tweet
          {...base}
          text={
            <>
              업적 <b className="text-accent-yellow">&ldquo;{e.achievement?.name}&rdquo;</b> 달성! 🏅
            </>
          }
          attachment={
            <GameAttachment
              gameId={e.gameId}
              sub={<>전체 플레이어의 {e.achievement?.rarity}%만 가진 업적 ✨</>}
            />
          }
        />
      );

    case "rank":
      return (
        <Tweet
          {...base}
          text={
            <>
              드디어 승급!! {e.rank?.from} → <b className="text-txt-link">{e.rank?.to}</b> 📈 축하해줘
            </>
          }
          attachment={<GameAttachment gameId={e.gameId} sub="랭크 게임" />}
        />
      );

    case "milestone":
      return (
        <Tweet
          {...base}
          text={
            <>
              누적 플레이 <b className="text-txt-link">{e.milestone?.hours}시간</b> 달성 ⏳ 이 정도면 인생 게임 인정?
            </>
          }
          attachment={<GameAttachment gameId={e.gameId} />}
        />
      );

    case "library":
      return (
        <Tweet
          {...base}
          text={<>새 게임 샀다! 라이브러리에 <b>{game.name}</b> 추가 🙌 같이 할 사람 구함</>}
          attachment={<GameAttachment gameId={e.gameId} sub="라이브러리에 새로 추가됨" />}
        />
      );

    case "streak": {
      const s = e.streak!;
      return (
        <Tweet
          {...base}
          text={
            s.win ? (
              <>지금 <b className="text-accent-red">{s.count}연승</b> 중 🔥 기세 미쳤다</>
            ) : (
              <><b>{s.count}연패</b> 중... 누가 와서 분위기 좀 바꿔줘 🫠</>
            )
          }
          attachment={<GameAttachment gameId={e.gameId} sub={s.win ? "연승 행진 중" : "위로가 필요해"} />}
        />
      );
    }

    case "duo": {
      const partner = MEMBERS.find((m) => m.id === e.duo?.withMemberId);
      return (
        <Tweet
          {...base}
          text={
            <>
              <b>{partner?.name ?? "파티원"}</b>랑 듀오 돌렸다 —{" "}
              <b className={e.duo?.win ? "text-accent-green" : "text-accent-red"}>
                {e.duo?.win ? "승리" : "패배"}
              </b>{" "}
              {e.duo?.win ? "케미 증명 완료 🤝" : "다음 판엔 이긴다"}
            </>
          }
          attachment={<GameAttachment gameId={e.gameId} sub="듀오 매치" />}
        />
      );
    }
  }
}

/** 파티원 클립(브이로그/POTG) — 트윗 + 큰 미디어 */
function ClipFeedCard({ c }: { c: Clip }) {
  const member = MEMBERS.find((m) => m.id === c.memberId)!;
  const game = GAMES.find((g) => g.id === c.gameId)!;
  const meta = CLIP_LABEL[c.kind];

  return (
    <Tweet
      member={member}
      badge={meta.label}
      badgeColor={meta.color}
      hour={c.hour}
      minute={c.minute}
      text={
        <>
          {c.caption}{" "}
          <span className="text-[13px] font-semibold" style={{ color: game.color }}>
            {game.emoji} {game.short}
          </span>
        </>
      }
      attachment={
        <Link href={meta.href} className="block">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-bg-modifier">
            <ClipMedia clip={c} />
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xxs font-bold text-white">
              {meta.label} 보러 가기 ▶
            </span>
          </div>
        </Link>
      }
    />
  );
}

/** Steam / OP.GG 연동 게임 활동 피드 + 파티 클립 통합 스트림 (트위터 스타일) */
export default function FeedPage() {
  const { now, today, integrations, todayClips } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [connectOpen, setConnectOpen] = useState(false);

  const linkedAny = Boolean(integrations.steam || integrations.riot);
  const linkedCount = Number(Boolean(integrations.steam)) + Number(Boolean(integrations.riot));

  const items = useMemo<FeedItem[]>(() => {
    const events = generateFeed(today, now.getHours(), now.getMinutes(), linkedAny);
    const merged: FeedItem[] = [
      ...events.map((e): FeedItem => ({ kind: "event", time: e.hour * 60 + e.minute, e })),
      ...todayClips
        .filter((c) => c.kind === "vlog" || c.kind === "moment" || c.kind === "quest")
        .map((c): FeedItem => ({ kind: "clip", time: c.hour * 60 + c.minute, c })),
    ];
    return merged.sort((a, b) => b.time - a.time); // 최신순
  }, [today, now, linkedAny, todayClips]);

  const filtered =
    filter === "all"
      ? items
      : filter === "clip"
        ? items.filter((i) => i.kind === "clip")
        : items.filter((i) => i.kind === "event" && FILTER_TYPES[filter].includes(i.e.type));

  return (
    <>
      <ChannelHeader
        icon={Activity}
        name="게임-피드"
        topic="Steam · OP.GG 연동 + 파티 클립 — 접속, 업적, 전적, 브이로그, POTG가 한 줄로."
        right={
          <button
            className={cn("btn btn-sm", !linkedAny && "btn-ghost ring-1 ring-bg-modifier")}
            onClick={() => setConnectOpen(true)}
          >
            <Link2 size={14} />
            {linkedAny ? `연동됨 ${linkedCount}/2` : "계정 연동"}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[640px] space-y-3 p-4 pb-10">
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

          {/* 피드 (최신순, 트위터 스타일 타임라인) */}
          {filtered.length === 0 ? (
            <div className="card py-10 text-center">
              <p className="text-3xl">📡</p>
              <p className="mt-2 font-bold text-txt-header">아직 올라온 활동이 없어</p>
              <p className="text-[13px] text-txt-muted">친구들이 게임을 시작하면 여기에 실시간으로 떠</p>
            </div>
          ) : (
            <div className="divide-y divide-bg-modifier/50 overflow-hidden rounded-xl bg-bg-secondary">
              {filtered.map((item) =>
                item.kind === "event" ? (
                  <EventCard key={item.e.id} e={item.e} />
                ) : (
                  <ClipFeedCard key={item.c.id} c={item.c} />
                )
              )}
            </div>
          )}
        </div>
      </div>
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
    </>
  );
}
