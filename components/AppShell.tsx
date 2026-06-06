"use client";

import { useStore } from "@/lib/store";
import { GAMES, MEMBERS, OTHER_PARTIES, PARTY } from "@/lib/seed";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Activity,
  Eye,
  Gamepad2,
  Gift,
  Headphones,
  Mic,
  Plus,
  Settings,
  Target,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Avatar } from "./Avatar";

const CHANNELS = [
  { group: "오늘", items: [
    { href: "/feed", name: "게임-피드", icon: Activity },
    { href: "/vlog", name: "오늘의-브이로그", icon: Video },
    { href: "/moments", name: "potg", icon: Zap },
    { href: "/now", name: "지금-뭐해", icon: Eye },
  ]},
  { group: "기록", items: [
    { href: "/quests", name: "데일리-퀘스트", icon: Target },
    { href: "/wrapped", name: "wrapped", icon: Gift },
  ]},
];

function ServerRail() {
  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center gap-2 bg-bg-tertiary py-3">
      {/* 홈 (gamelog 로고) */}
      <div className="group relative flex justify-center">
        <span className="absolute -left-3 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r bg-white" />
        <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-brand text-white transition-all duration-200">
          <Gamepad2 size={26} />
        </div>
      </div>
      <div className="h-0.5 w-8 rounded bg-bg-modifier" />
      {/* 활성 파티 */}
      <button
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-primary text-2xl transition-all duration-200"
        title={PARTY.name}
      >
        {PARTY.emoji}
      </button>
      {OTHER_PARTIES.map((p) => (
        <button
          key={p.id}
          className="flex h-12 w-12 items-center justify-center rounded-3xl bg-bg-primary text-2xl opacity-60 transition-all duration-200 hover:rounded-2xl hover:opacity-100"
          title={p.name}
        >
          {p.emoji}
        </button>
      ))}
      <button className="flex h-12 w-12 items-center justify-center rounded-3xl bg-bg-primary text-status-online transition-all duration-200 hover:rounded-2xl hover:bg-status-online hover:text-white">
        <Plus size={22} />
      </button>
    </nav>
  );
}

function ChannelSidebar() {
  const pathname = usePathname();
  const me = MEMBERS[0];
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-bg-secondary md:flex">
      <header className="flex h-12 items-center px-4 shadow-elev-low">
        <h1 className="truncate text-[15px] font-bold text-txt-header">
          {PARTY.emoji} {PARTY.name}
        </h1>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 pt-4">
        {CHANNELS.map((g) => (
          <div key={g.group}>
            <p className="group-label mb-1 px-2">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map((ch) => {
                const Icon = ch.icon;
                const active = pathname === ch.href;
                return (
                  <li key={ch.href}>
                    <Link href={ch.href} className={cn("channel-item", active && "active")}>
                      <Icon size={18} className="shrink-0 opacity-70" />
                      <span className="truncate">{ch.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {/* 유저 패널 */}
      <footer className="flex h-[52px] items-center gap-2 bg-bg-secondary-alt px-2">
        <Avatar member={me} size={32} showStatus ringColor="#232428" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-txt-header">{me.name}</p>
          <p className="truncate text-xxs text-txt-muted">{me.tagline}</p>
        </div>
        <div className="flex gap-1 text-txt-muted">
          <button className="rounded p-1 hover:bg-bg-modifier hover:text-txt-normal"><Mic size={16} /></button>
          <button className="rounded p-1 hover:bg-bg-modifier hover:text-txt-normal"><Headphones size={16} /></button>
          <button className="rounded p-1 hover:bg-bg-modifier hover:text-txt-normal"><Settings size={16} /></button>
        </div>
      </footer>
    </aside>
  );
}

function MemberRow({ m }: { m: Member }) {
  const game = GAMES.find((g) => g.id === m.playingGameId);
  return (
    <div className={cn(
      "flex items-center gap-3 rounded px-2 py-1.5 hover:bg-bg-modifier",
      m.status === "offline" && "opacity-40"
    )}>
      <Avatar member={m} size={32} showStatus ringColor="#232428" />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-txt-normal">{m.name}</p>
        {m.status === "ingame" && game ? (
          <p className="truncate text-xxs text-txt-muted">
            {game.emoji} <span className="font-semibold">{game.name}</span> 플레이 중
          </p>
        ) : (
          <p className="truncate text-xxs text-txt-muted">{m.tagline}</p>
        )}
      </div>
    </div>
  );
}

function MemberList() {
  const inGame = MEMBERS.filter((m) => m.status === "ingame");
  const online = MEMBERS.filter((m) => m.status === "online" || m.status === "idle");
  const offline = MEMBERS.filter((m) => m.status === "offline");
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto bg-bg-secondary-alt px-2 pt-6 xl:flex">
      {inGame.length > 0 && (
        <div>
          <p className="group-label mb-1 px-2">게임 중 — {inGame.length}</p>
          {inGame.map((m) => <MemberRow key={m.id} m={m} />)}
        </div>
      )}
      {online.length > 0 && (
        <div>
          <p className="group-label mb-1 px-2">온라인 — {online.length}</p>
          {online.map((m) => <MemberRow key={m.id} m={m} />)}
        </div>
      )}
      {offline.length > 0 && (
        <div>
          <p className="group-label mb-1 px-2">오프라인 — {offline.length}</p>
          {offline.map((m) => <MemberRow key={m.id} m={m} />)}
        </div>
      )}
    </aside>
  );
}

const MOBILE_LABELS: Record<string, string> = {
  "/feed": "피드",
  "/vlog": "브이로그",
  "/moments": "POTG",
  "/now": "지금",
  "/quests": "퀘스트",
};

function MobileNav() {
  const pathname = usePathname();
  const items = CHANNELS.flatMap((g) => g.items).filter((i) => i.href !== "/wrapped");
  return (
    <nav className="flex h-14 shrink-0 items-stretch justify-around border-t border-bg-tertiary bg-bg-secondary md:hidden">
      {items.map((ch) => {
        const Icon = ch.icon;
        const active = pathname === ch.href;
        return (
          <Link
            key={ch.href}
            href={ch.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-100",
              active ? "text-brand" : "text-txt-muted hover:text-txt-normal"
            )}
          >
            {/* 활성 인디케이터 바 (Discord 서버 레일의 흰색 pill 변형) */}
            <span
              className={cn(
                "absolute top-0 h-0.5 rounded-b-full bg-brand transition-all duration-200",
                active ? "w-8 opacity-100" : "w-0 opacity-0"
              )}
            />
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200",
                active && "bg-brand/15"
              )}
            >
              <Icon size={20} />
            </span>
            <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>
              {MOBILE_LABELS[ch.href] ?? ch.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex flex-col gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-up rounded-lg bg-bg-floating px-4 py-3 text-sm font-medium text-txt-header shadow-elev-high"
        >
          {t.emoji && <span className="mr-2">{t.emoji}</span>}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-dvh items-center justify-center bg-bg-tertiary">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 animate-pulse-rec items-center justify-center rounded-2xl bg-brand text-white">
          <Gamepad2 size={34} />
        </div>
        <p className="text-sm font-semibold text-txt-muted">gamelog 불러오는 중...</p>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  if (!ready) return <LoadingScreen />;
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <ServerRail />
        </div>
        <ChannelSidebar />
        <main className="flex min-w-0 flex-1 flex-col bg-bg-primary">{children}</main>
        <MemberList />
      </div>
      <MobileNav />
      <Toasts />
    </div>
  );
}
