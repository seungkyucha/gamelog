// Steam / OP.GG(Riot) 연동 게임 활동 피드 생성
//
// ⚠️ 데모 구현 노트: 실제 연동은 Steam Web API(GetRecentlyPlayedGames,
// GetPlayerAchievements)와 Riot API(match-v5) 서버 프록시 + API 키가 필요하다.
// 이 모듈은 동일한 이벤트 스키마로 결정적(deterministic) 피드를 생성해
// 연동 이후의 UX를 그대로 시뮬레이션한다. API 키가 준비되면 generateFeed만
// 서버 fetch로 교체하면 된다.

import { GAMES, MEMBERS, ME_ID, hashStr, mulberry32 } from "./seed";

export type FeedSource = "steam" | "opgg";
export type FeedType =
  | "start"
  | "achievement"
  | "match"
  | "rank"
  | "end" // 세션 종료 (플레이타임 요약)
  | "milestone" // 누적 플레이타임 달성
  | "library" // 새 게임 라이브러리 추가
  | "streak" // 연승/연패
  | "mvp" // 매치 MVP 선정
  | "duo"; // 파티원끼리 같은 매치

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
  milestone?: { hours: number };
  streak?: { count: number; win: boolean };
  mvp?: { champion: string; kda: string };
  duo?: { withMemberId: string; win: boolean };
  end?: { minutes: number };
}

const ACHIEVEMENTS: Record<string, string[]> = {
  lol: ["펜타킬의 주인공", "시야 장악자", "솔로 킬 100회"],
  valo: ["에이스!", "클러치 마스터", "헤드샷 헌터"],
  mc: ["엔더 드래곤 처치", "풀 다이아 장비", "네더 정복자"],
  pubg: ["치킨 디너 10회", "저격 100m+", "최후의 2인"],
  ow: ["POTG 5연속", "치유량 20,000", "철벽 방어"],
  zelda: ["사당 120개 클리어", "마스터 소드 획득", "하이랄 완전 탐험"],
  eldenring: ["엘데의 왕", "전설의 무기 수집가", "황금나무를 향해", "말레니아 격파"],
  tbh: ["작업표시줄 정복자", "알트탭 마스터", "멀티태스킹의 신"],
};

const CHAMPIONS: Record<string, string[]> = {
  lol: ["가렌", "아리", "리 신", "진", "카이사", "쓰레쉬"],
  valo: ["제트", "레이나", "세이지", "소바", "오멘", "클로브"],
  ow: ["겐지", "메르시", "라인하르트", "키리코", "트레이서"],
  pubg: ["솔로 스쿼드", "듀오", "스쿼드"],
  mc: ["서바이벌", "하드코어"],
  zelda: ["탐험"],
  eldenring: ["방랑기사", "점성술사", "사무라이"],
  tbh: ["영웅 모드"],
};

const MILESTONE_HOURS = [100, 250, 500, 1000];

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
  const friends = MEMBERS.filter((m) => m.id !== ME_ID);

  const visible = (h: number, min: number) =>
    h < nowHour || (h === nowHour && min <= nowMinute);

  const pushEvent = (memberId: string, e: Omit<FeedEvent, "id" | "memberId">, suffix = "") => {
    // 미래 이벤트는 숨김 (실시간으로 도착하는 느낌)
    if (!visible(e.hour, e.minute)) return;
    events.push({ ...e, memberId, id: `feed-${dateKey}-${memberId}-${e.type}-${e.hour}-${e.minute}${suffix}` });
  };

  for (const m of members) {
    const rand = mulberry32(hashStr(`${dateKey}-feed-${m.id}`));
    const sessionCount = 1 + Math.floor(rand() * 3); // 하루 1~3 세션
    for (let s = 0; s < sessionCount; s++) {
      const game = pick(rand, GAMES);
      const startHour = 8 + Math.floor(rand() * 15); // 8~22시
      const startMin = Math.floor(rand() * 60);
      const src = sourceOf(game.id);

      // ① 게임 시작
      pushEvent(m.id, { type: "start", source: src, gameId: game.id, hour: startHour, minute: startMin }, `-${s}`);

      // ② 매치 결과 — KDA 항상 포함, 배그는 치킨(#1) 스코어
      if (rand() > 0.25) {
        const win = rand() > 0.45;
        pushEvent(m.id, {
          type: "match",
          source: src,
          gameId: game.id,
          hour: Math.min(23, startHour + 1),
          minute: Math.floor(rand() * 60),
          match: {
            win,
            score:
              game.id === "pubg"
                ? win
                  ? `#1/${90 + Math.floor(rand() * 10)}`
                  : `#${2 + Math.floor(rand() * 40)}/${90 + Math.floor(rand() * 10)}`
                : pick(rand, SCORES),
            kda: `${Math.floor(rand() * 20)}/${Math.floor(rand() * 12)}/${Math.floor(rand() * 18)}`,
            champion: pick(rand, CHAMPIONS[game.id] ?? ["커스텀"]),
            lp: src === "opgg" ? (win ? 15 + Math.floor(rand() * 14) : -(12 + Math.floor(rand() * 10))) : undefined,
          },
        }, `-${s}`);

        // ②-1 MVP 선정 (승리 시 가끔)
        if (win && rand() > 0.65) {
          pushEvent(m.id, {
            type: "mvp",
            source: src,
            gameId: game.id,
            hour: Math.min(23, startHour + 1),
            minute: Math.floor(rand() * 60),
            mvp: {
              champion: pick(rand, CHAMPIONS[game.id] ?? ["커스텀"]),
              kda: `${8 + Math.floor(rand() * 14)}/${Math.floor(rand() * 5)}/${4 + Math.floor(rand() * 12)}`,
            },
          }, `-${s}`);
        }
      }

      // ③ 세션 종료 (1~3시간 플레이 후)
      const playMin = 45 + Math.floor(rand() * 135);
      const endHour = startHour + Math.floor((startMin + playMin) / 60);
      if (endHour <= 23 && rand() > 0.35) {
        pushEvent(m.id, {
          type: "end",
          source: src,
          gameId: game.id,
          hour: endHour,
          minute: (startMin + playMin) % 60,
          end: { minutes: playMin },
        }, `-${s}`);
      }

      // ④ 업적 (가끔, Steam)
      if (rand() > 0.7) {
        pushEvent(m.id, {
          type: "achievement",
          source: "steam",
          gameId: game.id,
          hour: Math.min(23, startHour + 1),
          minute: Math.floor(rand() * 60),
          achievement: {
            name: pick(rand, ACHIEVEMENTS[game.id] ?? ["첫 발걸음"]),
            rarity: Math.round((1 + rand() * 24) * 10) / 10,
          },
        }, `-${s}`);
      }
    }

    const extraRand = mulberry32(hashStr(`${dateKey}-extra-${m.id}`));

    // ⑤ 랭크 변동 (드물게, OP.GG)
    if (extraRand() > 0.75) {
      const i = Math.floor(extraRand() * (RANKS.length - 1));
      pushEvent(m.id, {
        type: "rank",
        source: "opgg",
        gameId: extraRand() > 0.5 ? "lol" : "valo",
        hour: 12 + Math.floor(extraRand() * 10),
        minute: Math.floor(extraRand() * 60),
        rank: { from: RANKS[i], to: RANKS[i + 1] },
      });
    }

    // ⑥ 누적 플레이타임 마일스톤 (드물게, Steam)
    if (extraRand() > 0.8) {
      pushEvent(m.id, {
        type: "milestone",
        source: "steam",
        gameId: pick(extraRand, GAMES.filter((g) => sourceOf(g.id) === "steam")).id,
        hour: 10 + Math.floor(extraRand() * 12),
        minute: Math.floor(extraRand() * 60),
        milestone: { hours: pick(extraRand, MILESTONE_HOURS) },
      });
    }

    // ⑦ 라이브러리에 새 게임 추가 (드물게, Steam)
    if (extraRand() > 0.8) {
      pushEvent(m.id, {
        type: "library",
        source: "steam",
        gameId: pick(extraRand, GAMES).id,
        hour: 9 + Math.floor(extraRand() * 13),
        minute: Math.floor(extraRand() * 60),
      });
    }

    // ⑧ 연승 스트릭 (드물게, OP.GG)
    if (extraRand() > 0.78) {
      pushEvent(m.id, {
        type: "streak",
        source: "opgg",
        gameId: extraRand() > 0.5 ? "lol" : "valo",
        hour: 14 + Math.floor(extraRand() * 9),
        minute: Math.floor(extraRand() * 60),
        streak: { count: 3 + Math.floor(extraRand() * 4), win: extraRand() > 0.25 },
      });
    }
  }

  // ⑨ 듀오 매치 — 파티원 둘이 같은 판 (하루 한 번, 결정적 페어)
  const duoRand = mulberry32(hashStr(`${dateKey}-duo`));
  if (duoRand() > 0.3 && friends.length >= 2) {
    const a = friends[Math.floor(duoRand() * friends.length)];
    let b = friends[Math.floor(duoRand() * friends.length)];
    if (b.id === a.id) b = friends[(friends.indexOf(a) + 1) % friends.length];
    const duoGame = duoRand() > 0.5 ? "lol" : "valo";
    pushEvent(a.id, {
      type: "duo",
      source: "opgg",
      gameId: duoGame,
      hour: 19 + Math.floor(duoRand() * 4),
      minute: Math.floor(duoRand() * 60),
      duo: { withMemberId: b.id, win: duoRand() > 0.4 },
    });
  }

  // ⑩ 쇼케이스 이벤트 (오전 시간대 보장 노출)
  const showRand = mulberry32(hashStr(`${dateKey}-show`));
  const pickFriend = () => friends[Math.floor(showRand() * friends.length)];
  // 엘든링 스팀 업적 달성
  pushEvent(pickFriend().id, {
    type: "achievement",
    source: "steam",
    gameId: "eldenring",
    hour: 9,
    minute: 12 + Math.floor(showRand() * 40),
    achievement: { name: pick(showRand, ACHIEVEMENTS.eldenring), rarity: Math.round((1 + showRand() * 9) * 10) / 10 },
  }, "-show");
  // 배그 치킨
  pushEvent(pickFriend().id, {
    type: "match",
    source: "steam",
    gameId: "pubg",
    hour: 10,
    minute: 5 + Math.floor(showRand() * 50),
    match: {
      win: true,
      score: `#1/${92 + Math.floor(showRand() * 8)}`,
      kda: `${5 + Math.floor(showRand() * 9)}/1/${2 + Math.floor(showRand() * 5)}`,
      champion: "스쿼드",
    },
  }, "-show");
  // Task Bar Heroes 시작 → 종료
  const tbhMember = pickFriend();
  const tbhMin = Math.floor(showRand() * 50);
  pushEvent(tbhMember.id, { type: "start", source: "steam", gameId: "tbh", hour: 11, minute: tbhMin }, "-show");
  pushEvent(tbhMember.id, {
    type: "end",
    source: "steam",
    gameId: "tbh",
    hour: 12,
    minute: tbhMin,
    end: { minutes: 60 },
  }, "-show");

  // 최신순 정렬
  return events.sort((a, b) => b.hour - a.hour || b.minute - a.minute);
}
