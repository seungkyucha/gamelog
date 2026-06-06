import type { LucideIcon } from "lucide-react";
import React from "react";

export function ChannelHeader({
  icon: Icon,
  name,
  topic,
  right,
}: {
  icon: LucideIcon;
  name: string;
  topic: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-4 shadow-elev-low">
      <Icon size={20} className="shrink-0 text-txt-muted" />
      <h2 className="shrink-0 text-[15px] font-bold text-txt-header">{name}</h2>
      <div className="mx-2 hidden h-5 w-px bg-bg-modifier sm:block" />
      <p className="hidden flex-1 truncate text-[13px] text-txt-muted sm:block">{topic}</p>
      {right && <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
