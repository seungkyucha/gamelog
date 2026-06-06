import type { Member, MemberStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<MemberStatus, string> = {
  online: "#23A55A",
  ingame: "#23A55A",
  idle: "#F0B232",
  offline: "#80848E",
};

export function Avatar({
  member,
  size = 32,
  showStatus = false,
  ringColor = "#2B2D31",
}: {
  member: Member;
  size?: number;
  showStatus?: boolean;
  ringColor?: string;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={cn("flex h-full w-full items-center justify-center rounded-full")}
        style={{ background: member.color, fontSize: size * 0.5 }}
      >
        {member.emoji}
      </div>
      {showStatus && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full"
          style={{
            width: size * 0.34,
            height: size * 0.34,
            background: STATUS_COLOR[member.status],
            boxShadow: `0 0 0 3px ${ringColor}`,
          }}
        />
      )}
    </div>
  );
}
