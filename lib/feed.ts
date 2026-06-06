// Steam / OP.GG(Riot) 연동 게임 활동 피드 생성
//
// ⚠️ 데모 구현 노트: 실제 연동은 Steam Web API(GetRecentlyPlayedGames,
// GetPlayerAchievements)와 Riot API(match-v5) 서버 프록시 + API 키가 필요하다.
// 이 모듈은 동일한 이벤트 스키마로 결정적(deterministic) 피드를 생성해
// 연동 이후의 UX를 그대로 시뮬레이션한다. API 키가 준비되면 generateFeed만
// 서버 fetch로 교체하면 된다.

import { GAMES, MEMBERS, ME_ID, hashStr, mulberry32 } from "./seed";

export type FeedSource = "steam" | "opgg";
export type FeedType = "start" | "achievement" | "match" | "rank";

export interface FeedEvent {
  id: string;
  type: FeedType;
  source: FeedSource;
  memberId: string;
  gameId: string;
  hour: number;
  minute: number;
  /** 타입별 페이로드 */
  achievement?: { name: string; rarity: number };
  match?: { win: boolean; score: string; kda: string; champion: string; lp?: number };
  rank?: { from: string; to: string };
}

const ACHIEVEMENTS: Record<string, string[]> = {
  lol: ["펜타킬의 주인공", "시야 장악자", "솔로 킬 100회"],
  valo: ["에이스!", "클러치 마스터", "헤드샷 헌터"],
  mc: ["엔더 드래곤 처치", "풀 다이아 장비", "네더 정복자"],
  pubg: ["치킨 디너 10회", "저격 100m+", "최후의 2인"],
  ow: ["POTG 5연속", "치유량 20,000", "철벽 방어"],
  zelda: ["사당 120개 클리어", "마스터 소드 획득", "하이랄 완전 탐험"],
};

const CHAMPIONS: Record<string, string[]> = {
  lol: ["가렌", "아리", "리 신", "진", "카이사", "쓰레쉬"],
  valo: ["제트", "레이나", "세이지", "소바", "오멘", "클로브"],
  ow: ["겐지", "메르시", "라인하르트", "키리코", "트레이서"],
  pubg: ["솔로 스쿼드", "듀오", "스쿼드"],
  mc: ["서바이벌", "하드코어"],
  zelda: ["탐험"],
};

const RANKS = ["실버 2", "실버 1", "골드 4", "골드 3", "골드 2", "플래티넘 4"];

const SCORES = ["13:11", "13:7", "16:14", "2:1", "31/12/8", "24:20"];

/** 게임에 맞는 소스: 라이엇 계열(lol/valo)은 OP.GG, 나머지는 Steam */
export function sourceOf(gameId: string): FeedSource {
  return gameId === "lol" || gameId === "valo" ? "opgg" : "steam";
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * 오늘의 활동 피드를 결정적으로 생성.
 * includeMe: 본인 계정 연동 시 내 이벤트도 포함
 */
export function generateFeed(dateKey: string, nowHour: number, nowMinute: number, includeMe: boolean): FeedEvent[] {
  const events: FeedEvent[] = [];
  const members = MEMBERS.filter((m) => (includeMe ? true : m.id !== ME_ID));

  for (const m of members) {
    const rand = mulberry32(hashStr(`${dateKey}-feed-${m.id}`));
    const sessionCount = 1 + Math.floor(rand() * 3); // 하루 1~3 세션
    for (let s = 0; s < sessionCount; s++) {
      const game = pick(rand, GAMES);
      const startHour = 8 + Math.floor(rand() * 15); // 8~22시
      const startMin = Math.floor(rand() * 60);
      const src = sourceOf(game.id);
      const push = (e: Omit<FeedEvent, "id">) => {
        // 미래 이벤트는 숨김 (실시간으로 도착하는 느낌)
        if (e.hour > nowHour || (e.hour === nowHour && e.minute > nowMinute)) return;
        events.push({ ...e, id: `feed-${dateKey}-${m.id}-${e.type}-${e.hour}-${e.minute}` });
      };

      // ① 게임 시작
      push({ type: "start", source: src, memberId: m.id, gameId: game.id, hour: startHour, minute: startMin });

      // ② 매치 결과 (시작 30~60분 후)
      if (rand() > 0.25) {
        const win = rand() > 0.45;
        push({
          type: "match",
          source: src,
          memberId: m.id,
          gameId: game.id,
          hour: Math.min(23, startHour + 1),
          minute: Math.floor(rand() * 60),
          match: {
            win,
            score: pick(rand, SCORES),
            kda: `${Math.floor(rand() * 20)}/${Math.floor(rand() * 12)}/${Math.floor(rand() * 18)}`,
            champion: pick(rand, CHAMPIONS[game.id] ?? ["커스텀"]),
            lp: src === "opgg" ? (win ? 15 + Math.floor(rand() * 14) : -(12 + Math.floor(rand() * 10))) : undefined,
          },
        });
      }

      // ③ 업적 (가끔)
      if (rand() > 0.7) {
        push({
          type: "achievement",
          source: "steam",
          memberId: m.id,
          gameId: game.id,
          hour: Math.min(23, startHour + 1),
          minute: Math.floor(rand() * 60),
          achievement: {
            name: pick(rand, ACHIEVEMENTS[game.id] ?? ["첫 발걸음"]),
            rarity: Math.round((1 + rand() * 24) * 10) / 10,
          },
        });
      }
    }

    // ④ 랭크 변동 (드물게, OP.GG)
    const rankRand = mulberry32(hashStr(`${dateKey}-rank-${m.id}`));
    if (rankRand() > 0.75) {
      const i = Math.floor(rankRand() * (RANKS.length - 1));
      const h = 12 + Math.floor(rankRand() * 10);
      if (h <= nowHour) {
        events.push({
          id: `feed-${dateKey}-${m.id}-rank`,
          type: "rank",
          source: "opgg",
          memberId: m.id,
          gameId: rankRand() > 0.5 ? "lol" : "valo",
          hour: h,
          minute: Math.floor(rankRand() * 60),
          rank: { from: RANKS[i], to: RANKS[i + 1] },
        });
      }
    }
  }

  // 최신순 정렬
  return events.sort((a, b) => b.hour - a.hour || b.minute - a.minute);
}
