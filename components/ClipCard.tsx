"use client";

import { GAMES, MEMBERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Clip } from "@/lib/types";
import { cn, fmtTime } from "@/lib/utils";
import { SmilePlus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "./Avatar";

const QUICK_EMOJIS = ["🔥", "😂", "👍", "😱", "💀"];

export function ClipMedia({ clip, className }: { clip: Clip; className?: string }) {
  if (clip.videoUrl) {
    return (
      <video
        src={clip.videoUrl}
        className={cn("h-full w-full object-cover", className)}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center", className)}
      style={{ background: `linear-gradient(135deg, ${clip.gradient[0]}, ${clip.gradient[1]})` }}
    >
      <span className="text-5xl drop-shadow-lg">{clip.emoji}</span>
    </div>
  );
}

export function ClipCard({ clip, showGameTag = true }: { clip: Clip; showGameTag?: boolean }) {
  const { toggleReaction } = useStore();
  const [picker, setPicker] = useState(false);
  const member = MEMBERS.find((m) => m.id === clip.memberId)!;
  const game = GAMES.find((g) => g.id === clip.gameId)!;

  return (
    <article className="card animate-fade-in overflow-hidden p-0">
      <div className="relative aspect-[4/3]">
        <ClipMedia clip={clip} />
        {showGameTag && (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-xxs font-bold text-white"
            style={{ background: `${game.color}E6` }}
          >
            {game.emoji} {game.short}
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xxs font-semibold text-white">
          {fmtTime(clip.hour, clip.minute)}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <Avatar member={member} size={24} />
          <span className="text-[13px] font-semibold text-txt-header">{member.name}</span>
          <span className="truncate text-[13px] text-txt-normal">{clip.caption}</span>
        </div>
        <div className="relative flex flex-wrap items-center gap-1.5">
          {clip.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => toggleReaction(clip.id, r.emoji)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] transition-colors",
                r.mine
                  ? "bg-brand/25 text-txt-header ring-1 ring-brand"
                  : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
              )}
            >
              {r.emoji} <span className="text-xxs font-semibold">{r.count}</span>
            </button>
          ))}
          <button
            onClick={() => setPicker((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-input text-txt-muted hover:bg-bg-modifier hover:text-txt-normal"
          >
            <SmilePlus size={14} />
          </button>
          {picker && (
            <div className="absolute bottom-8 left-0 z-10 flex gap-1 rounded-lg bg-bg-floating p-2 shadow-elev-high">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    toggleReaction(clip.id, e);
                    setPicker(false);
                  }}
                  className="rounded p-1 text-lg hover:bg-bg-modifier"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
