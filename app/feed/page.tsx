"use client";

import { Avatar } from "@/components/Avatar";
import { ChannelHeader } from "@/components/ChannelHeader";
import { ClipMedia } from "@/components/ClipCard";
import { generateFeed, type FeedEvent, type FeedType } from "@/lib/feed";
import { GAMES, ME_ID, MEMBERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Clip } from "@/lib/types";
import { cn, fmtMinutes, fmtTime } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Crown,
  Flame,
  Hourglass,
  Library,
  Link2,
  Link2Off,
  LogOut,
  Medal,
  Play,
  Swords,
  Target,
  TrendingUp,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
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

const CLIP_LABEL: Record<Clip["kind"], { label: string; href: string }> = {
  vlog: { label: "브이로그", href: "/vlog" },
  moment: { label: "POTG", href: "/moments" },
  quest: { label: "퀘스트 인증", href: "/quests" },
  now: { label: "체크인", href: "/now" },
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

/** 통일된 피드 카드 셸: 타입 컬러 액센트 바 + 아이콘 칩 + 헤드라인/서브라인 */
function FeedShell({
  accent,
  icon,
  emoji,
  member,
  source,
  hour,
  minute,
  headline,
  sub,
  right,
}: {
  accent: string;
  icon?: LucideIcon;
  emoji?: string;
  member: (typeof MEMBERS)[number];
  source?: "steam" | "opgg";
  hour: number;
  minute: number;
  headline: ReactNode;
  sub: ReactNode;
  right?: ReactNode;
}) {
  const Icon = icon;
  const isMe = member.id === ME_ID;
  return (
    <div className="relative overflow-hidden rounded-lg bg-bg-secondary transition-colors hover:bg-[#34363C]">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
      <div className="flex items-center gap-3 p-3 pl-4">
        {/* 타입 아이콘 칩 — 한눈에 어떤 활동인지 */}
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ background: `${accent}26`, color: accent }}
        >
          {emoji ?? (Icon && <Icon size={20} />)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Avatar member={member} size={16} />
            <span className="text-[12px] font-semibold text-txt-muted">{isMe ? "나" : member.name}</span>
            {source && <SourceBadge source={source} />}
            <span className="ml-auto shrink-0 text-xxs text-txt-faint">{fmtTime(hour, minute)}</span>
          </div>
          <p className="mt-0.5 truncate text-[15px] font-bold leading-tight text-txt-header">{headline}</p>
          <p className="truncate text-[13px] text-txt-muted">{sub}</p>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}

/** 게임명 강조 칩 (서브라인용) */
function GameTag({ gameId }: { gameId: string }) {
  const game = GAMES.find((g) => g.id === gameId)!;
  return (
    <span className="font-semibold" style={{ color: game.color }}>
      {game.emoji} {game.name}
    </span>
  );
}

const TYPE_STYLE: Record<FeedType, { accent: string; icon: LucideIcon }> = {
  start: { accent: "#23A55A", icon: Play },
  end: { accent: "#80848E", icon: LogOut },
  match: { accent: "#23A55A", icon: Swords }, // 승패에 따라 동적 변경
  mvp: { accent: "#F0B232", icon: Crown },
  achievement: { accent: "#FEE75C", icon: Medal },
  rank: { accent: "#5865F2", icon: TrendingUp },
  milestone: { accent: "#00A8FC", icon: Hourglass },
  library: { accent: "#57F287", icon: Library },
  streak: { accent: "#ED4245", icon: Flame },
  duo: { accent: "#EB459E", icon: Users },
};

function EventCard({ e }: { e: FeedEvent }) {
  const { requestJoin, joinRequests, pushToast } = useStore();
  const member = MEMBERS.find((m) => m.id === e.memberId)!;
  const game = GAMES.find((g) => g.id === e.gameId)!;
  const isMe = e.memberId === ME_ID;
  const requested = joinRequests.includes(e.memberId);

  const base = { member, source: e.source, hour: e.hour, minute: e.minute };
  const style = TYPE_STYLE[e.type];

  switch (e.type) {
    case "start":
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={<>{game.name} 시작</>}
          sub={<><GameTag gameId={e.gameId} /> · 지금 플레이 중이야</>}
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
                {requested ? "요청 ✓" : "합류"}
              </button>
            )
          }
        />
      );

    case "end":
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={<>{game.name} 종료</>}
          sub={<><GameTag gameId={e.gameId} /> · {fmtMinutes(e.end?.minutes ?? 0)} 플레이</>}
        />
      );

    case "match": {
      const m = e.match!;
      const chicken = e.gameId === "pubg" && m.win;
      const accent = chicken ? "#FEE75C" : m.win ? "#23A55A" : "#F23F43";
      return (
        <FeedShell
          {...base}
          accent={accent}
          emoji={chicken ? "🍗" : undefined}
          icon={chicken ? undefined : Swords}
          headline={
            chicken ? (
              <span className="text-accent-yellow">치킨 디너!</span>
            ) : (
              <>
                <span className={m.win ? "text-accent-green" : "text-accent-red"}>{m.win ? "승리" : "패배"}</span>
                {" — "}
                {game.name}
              </>
            )
          }
          sub={<>{m.champion} · KDA {m.kda} · {e.gameId === "pubg" ? `등수 ${m.score}` : `스코어 ${m.score}`}</>}
          right={
            m.lp !== undefined && (
              <span className={cn("text-[15px] font-black", m.lp > 0 ? "text-accent-green" : "text-accent-red")}>
                {m.lp > 0 ? `+${m.lp}` : m.lp} LP
              </span>
            )
          }
        />
      );
    }

    case "mvp":
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={<>매치 MVP 선정 👑</>}
          sub={<><GameTag gameId={e.gameId} /> · {e.mvp?.champion} · KDA {e.mvp?.kda}</>}
        />
      );

    case "achievement":
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={<>업적 &ldquo;{e.achievement?.name}&rdquo;</>}
          sub={<><GameTag gameId={e.gameId} /> · 상위 {e.achievement?.rarity}%만 달성한 업적 ✨</>}
        />
      );

    case "rank":
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={
            <>
              {e.rank?.from} → <span className="text-txt-link">{e.rank?.to}</span> 승급!
            </>
          }
          sub={<><GameTag gameId={e.gameId} /> · 축하 리액션을 남겨줘 🎉</>}
        />
      );

    case "milestone":
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={<>누적 {e.milestone?.hours}시간 달성 ⏳</>}
          sub={<><GameTag gameId={e.gameId} /> · 이 정도면 인생 게임 인정</>}
        />
      );

    case "library":
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={<>새 게임 추가 — {game.name}</>}
          sub={<><GameTag gameId={e.gameId} /> · 같이 할 사람? 🙌</>}
        />
      );

    case "streak": {
      const s = e.streak!;
      return (
        <FeedShell
          {...base}
          accent={s.win ? "#ED4245" : "#80848E"}
          icon={Flame}
          headline={s.win ? <>{s.count}연승 중! 🔥</> : <>{s.count}연패... 🫠</>}
          sub={<><GameTag gameId={e.gameId} /> · {s.win ? "기세를 몰아가는 중" : "콕 찔러서 한 판 같이 해줘"}</>}
        />
      );
    }

    case "duo": {
      const partner = MEMBERS.find((m) => m.id === e.duo?.withMemberId);
      return (
        <FeedShell
          {...base}
          accent={style.accent}
          icon={style.icon}
          headline={
            <>
              {member.name} & {partner?.name ?? "파티원"} 듀오 —{" "}
              <span className={e.duo?.win ? "text-accent-green" : "text-accent-red"}>
                {e.duo?.win ? "승리" : "패배"}
              </span>
            </>
          }
          sub={<><GameTag gameId={e.gameId} /> · 듀오 케미 {e.duo?.win ? "증명 완료 🤝" : "다음 판엔 이긴다"}</>}
        />
      );
    }
  }
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

const CLIP_STYLE: Record<Clip["kind"], { accent: string; icon: LucideIcon }> = {
  vlog: { accent: "#5865F2", icon: Video },
  moment: { accent: "#EB459E", icon: Zap },
  quest: { accent: "#F0B232", icon: Target },
  now: { accent: "#00A8FC", icon: Activity },
};

/** 파티원 클립(브이로그/POTG)을 피드 카드로 노출 */
function ClipFeedCard({ c }: { c: Clip }) {
  const member = MEMBERS.find((m) => m.id === c.memberId)!;
  const meta = CLIP_LABEL[c.kind];
  const style = CLIP_STYLE[c.kind];
  const isMe = c.memberId === ME_ID;
  const Icon = style.icon;

  return (
    <Link
      href={meta.href}
      className="relative block overflow-hidden rounded-lg bg-bg-secondary transition-colors hover:bg-[#34363C]"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: style.accent }} />
      <div className="flex items-center gap-3 p-3 pl-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${style.accent}26`, color: style.accent }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Avatar member={member} size={16} />
            <span className="text-[12px] font-semibold text-txt-muted">{isMe ? "나" : member.name}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: `${style.accent}33`, color: style.accent }}
            >
              {meta.label}
            </span>
            <span className="ml-auto shrink-0 text-xxs text-txt-faint">{fmtTime(c.hour, c.minute)}</span>
          </div>
          <p className="mt-0.5 truncate text-[15px] font-bold leading-tight text-txt-header">{c.caption}</p>
          <p className="truncate text-[13px] text-txt-muted">
            <GameTag gameId={c.gameId} /> · 탭해서 보기
          </p>
        </div>
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-bg-modifier">
          <ClipMedia clip={c} />
        </div>
      </div>
    </Link>
  );
}

/** Steam / OP.GG 연동 게임 활동 피드 + 파티 클립 통합 스트림 */
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
        <div className="mx-auto max-w-[740px] space-y-4 p-4 pb-10">
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
