export interface Game {
  id: string;
  name: string;
  short: string;
  color: string;
  emoji: string;
  /** 정사각형 타이틀 이미지 URL (없으면 컬러 타일 폴백) */
  cover?: string;
}

export type MemberStatus = "online" | "ingame" | "idle" | "offline";

export interface Member {
  id: string;
  name: string;
  emoji: string;
  color: string;
  status: MemberStatus;
  playingGameId?: string;
  sinceMin?: number;
  tagline: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export type ClipKind = "vlog" | "moment" | "now" | "quest";

export interface Clip {
  id: string;
  memberId: string;
  gameId: string;
  kind: ClipKind;
  caption: string;
  dateKey: string;
  hour: number;
  minute: number;
  gradient: [string, string];
  emoji: string;
  /** IndexedDB에 저장된 실촬영 영상 키 */
  videoKey?: string;
  /** hydrate 후 채워지는 objectURL (비영속) */
  videoUrl?: string;
  reactions: Reaction[];
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  reward: string;
}

export interface DiaryEntry {
  id: string;
  dateKey: string;
  gameId: string;
  minutes: number;
  result: "win" | "lose" | "none";
  note: string;
}

export interface CheckIn {
  dateKey: string;
  time: string;
  caption: string;
  gameId: string;
  /** dataURL (jpeg) */
  selfie?: string;
  screen?: string;
  /** 후면 카메라 사진 (전면+후면 동시 촬영) */
  rear?: string;
}

/** 외부 계정 연동 상태 (Steam / Riot·OP.GG) */
export interface Integrations {
  steam?: string; // Steam ID 또는 프로필명
  riot?: string; // 소환사명#태그
}

/** localStorage에 영속되는 사용자 상태 */
export interface PersistedState {
  userClips: Clip[];
  reactionOverrides: Record<string, Reaction[]>;
  questDone: Record<string, string[]>; // dateKey -> memberIds
  streak: { count: number; lastDate: string };
  userDiary: DiaryEntry[];
  checkIns: Record<string, CheckIn>; // dateKey -> 내 체크인
  joinRequests: string[]; // 오늘 합류 요청 보낸 memberId
  integrations: Integrations;
}
