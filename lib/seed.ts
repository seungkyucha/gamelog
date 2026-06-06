import type { Clip, DiaryEntry, Game, Member, Quest, Reaction } from "./types";

export const GAMES: Game[] = [
  { id: "lol", name: "리그 오브 레전드", short: "LoL", color: "#C89B3C", emoji: "🧙" },
  { id: "valo", name: "발로란트", short: "VALO", color: "#FF4655", emoji: "🎯" },
  { id: "mc", name: "마인크래프트", short: "MC", color: "#62B47A", emoji: "⛏️" },
  { id: "pubg", name: "배틀그라운드", short: "PUBG", color: "#F2A900", emoji: "🍳" },
  { id: "ow", name: "오버워치 2", short: "OW2", color: "#F99E1A", emoji: "🛡️" },
  { id: "zelda", name: "젤다의 전설", short: "ZELDA", color: "#6CC4A1", emoji: "🗡️" },
];

export const ME_ID = "me";

export const MEMBERS: Member[] = [
  { id: ME_ID, name: "스카", emoji: "🦊", color: "#5865F2", status: "online", tagline: "오늘도 한 판" },
  { id: "junho", name: "준호", emoji: "🐺", color: "#EB459E", status: "ingame", playingGameId: "valo", sinceMin: 47, tagline: "에임 충전 중" },
  { id: "siyeon", name: "시연", emoji: "🐱", color: "#57F287", status: "ingame", playingGameId: "lol", sinceMin: 12, tagline: "서폿 장인" },
  { id: "doyun", name: "도윤", emoji: "🐢", color: "#FEE75C", status: "online", tagline: "느리지만 확실하게" },
];

export const PARTY = {
  id: "night-squad",
  name: "야간조 4인방",
  emoji: "🌙",
  memberIds: MEMBERS.map((m) => m.id),
};

export const OTHER_PARTIES = [
  { id: "weekend", name: "주말 레이드팀", emoji: "⚔️" },
  { id: "mc-build", name: "마크 건축부", emoji: "🏗️" },
];

export const QUEST_POOL: Quest[] = [
  { id: "q-win", title: "오늘 1승 인증하기", desc: "어떤 게임이든 승리 화면을 클립으로 남겨봐. 정신승리도 인정.", emoji: "🏆", reward: "스트릭 +1" },
  { id: "q-newchar", title: "안 해본 캐릭터로 한 판", desc: "늘 하던 픽 말고, 한 번도 안 해본 캐릭터로 플레이한 순간을 찍어줘.", emoji: "🎲", reward: "스트릭 +1" },
  { id: "q-duo", title: "파티원과 같은 게임 접속", desc: "오늘 파티원 중 한 명과 같은 게임에 접속한 순간을 인증!", emoji: "🤝", reward: "스트릭 +1" },
  { id: "q-fail", title: "오늘의 최악의 플레이", desc: "잘한 것만 기록하면 재미없지. 오늘 가장 처참했던 순간을 공유해.", emoji: "💀", reward: "스트릭 +1" },
  { id: "q-best", title: "오늘의 최고 데미지", desc: "스코어보드든 결과 화면이든, 오늘 제일 잘 나온 기록을 찍어줘.", emoji: "🔥", reward: "스트릭 +1" },
  { id: "q-chill", title: "겜 시작 전 세팅 공개", desc: "키보드, 마우스, 책상 위 간식까지. 오늘의 게임 세팅을 보여줘.", emoji: "🖥️", reward: "스트릭 +1" },
  { id: "q-30min", title: "30분 이상 플레이 인증", desc: "오늘 한 게임을 30분 이상 플레이하고 플레이 시간을 인증해봐.", emoji: "⏱️", reward: "스트릭 +1" },
];

const SEED_CAPTIONS: { caption: string; emoji: string; gameId: string }[] = [
  { caption: "출근길에 한 판 돌리는 중 ㅋㅋ", emoji: "🚇", gameId: "pubg" },
  { caption: "점심시간 칼바람 ㄱㄱ", emoji: "🍜", gameId: "lol" },
  { caption: "오늘 에임 미쳤다", emoji: "🎯", gameId: "valo" },
  { caption: "집 도착, 본격 시작", emoji: "🏠", gameId: "valo" },
  { caption: "3연승 가즈아", emoji: "🔥", gameId: "lol" },
  { caption: "건축 자재 캐는 중...", emoji: "⛏️", gameId: "mc" },
  { caption: "이게 왜 짐?", emoji: "😤", gameId: "ow" },
  { caption: "치킨 먹었다!!!", emoji: "🍗", gameId: "pubg" },
  { caption: "신전 발견함 대박", emoji: "🗡️", gameId: "zelda" },
  { caption: "마지막 한 판만 (3시간째)", emoji: "🌙", gameId: "lol" },
];

const GRADIENTS: [string, string][] = [
  ["#5865F2", "#EB459E"],
  ["#23A55A", "#5865F2"],
  ["#F0B232", "#ED4245"],
  ["#EB459E", "#F0B232"],
  ["#00A8FC", "#23A55A"],
  ["#ED4245", "#5865F2"],
  ["#9B59B6", "#00A8FC"],
  ["#F2A900", "#FF4655"],
];

// ---- 유틸 ----

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function shiftKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ---- 시드 데이터 생성 (날짜 기준 결정적) ----

export function todaysQuest(key: string): Quest {
  return QUEST_POOL[hashStr(key) % QUEST_POOL.length];
}

/** 오늘 친구들의 시드 클립 (현재 시각 이전 시간대만) */
export function seedClips(key: string, currentHour: number): Clip[] {
  const rand = mulberry32(hashStr(key));
  const clips: Clip[] = [];
  const friends = MEMBERS.filter((m) => m.id !== ME_ID);
  const hours = [8, 10, 12, 14, 16, 18, 19, 20, 21, 22, 23];

  for (const friend of friends) {
    const n = 2 + Math.floor(rand() * 3); // 친구당 2~4개
    const friendHours = [...hours].sort(() => rand() - 0.5).slice(0, n);
    for (const h of friendHours) {
      if (h > currentHour) continue;
      const c = pick(rand, SEED_CAPTIONS);
      const kindRoll = rand();
      const reactions: Reaction[] = [];
      if (rand() > 0.4) reactions.push({ emoji: "🔥", count: 1 + Math.floor(rand() * 3), mine: false });
      if (rand() > 0.7) reactions.push({ emoji: "😂", count: 1 + Math.floor(rand() * 2), mine: false });
      clips.push({
        id: `seed-${key}-${friend.id}-${h}`,
        memberId: friend.id,
        gameId: c.gameId,
        kind: kindRoll > 0.75 ? "moment" : "vlog",
        caption: c.caption,
        dateKey: key,
        hour: h,
        minute: Math.floor(rand() * 60),
        gradient: pick(rand, GRADIENTS),
        emoji: c.emoji,
        reactions,
      });
    }
  }
  return clips.sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}

/** 친구들의 오늘 퀘스트 완료 여부 (결정적) */
export function seedQuestDone(key: string): string[] {
  const rand = mulberry32(hashStr(key + "quest"));
  return MEMBERS.filter((m) => m.id !== ME_ID && rand() > 0.45).map((m) => m.id);
}

/** 지난 14일 다이어리 시드 */
export function seedDiary(): DiaryEntry[] {
  const entries: DiaryEntry[] = [];
  for (let d = 1; d <= 14; d++) {
    const key = shiftKey(-d);
    const rand = mulberry32(hashStr(key + "diary"));
    const n = rand() > 0.25 ? 1 + Math.floor(rand() * 2) : 0;
    for (let i = 0; i < n; i++) {
      const game = pick(rand, GAMES);
      entries.push({
        id: `seed-diary-${key}-${i}`,
        dateKey: key,
        gameId: game.id,
        minutes: 30 + Math.floor(rand() * 150),
        result: rand() > 0.5 ? "win" : rand() > 0.4 ? "lose" : "none",
        note: pick(rand, [
          "오늘은 폼이 좋았다",
          "팀운이 없었을 뿐",
          "한 판만 하려다가...",
          "신규 패치 적응 중",
          "친구들이랑 디코 켜고 정주행",
          "솔로 큐는 역시 고통",
        ]),
      });
    }
  }
  return entries;
}

export const GRADIENT_POOL = GRADIENTS;
