"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getVideoUrl, putVideo } from "./idb";
import {
  GRADIENT_POOL,
  ME_ID,
  seedClips,
  seedDiary,
  seedQuestDone,
  shiftKey,
  todayKey,
  todaysQuest,
} from "./seed";
import type { CheckIn, Clip, ClipKind, DiaryEntry, PersistedState, Reaction } from "./types";
import { uid } from "./utils";

const LS_KEY = "gamelog-state-v1";

interface Toast {
  id: string;
  message: string;
  emoji?: string;
}

interface AddClipInput {
  kind: ClipKind;
  gameId: string;
  caption: string;
  blob?: Blob;
  emoji?: string;
}

interface StoreValue {
  ready: boolean;
  today: string;
  now: Date;
  /** 오늘의 모든 클립 (시드 + 사용자, 시간순) */
  todayClips: Clip[];
  /** 모든 moment 클립 (오늘 기준) */
  diary: DiaryEntry[];
  questDoneToday: string[];
  streak: { count: number; lastDate: string };
  checkInToday?: CheckIn;
  joinRequests: string[];
  toasts: Toast[];
  addClip: (input: AddClipInput) => Promise<void>;
  toggleReaction: (clipId: string, emoji: string) => void;
  addDiary: (entry: Omit<DiaryEntry, "id">) => void;
  completeQuest: () => void;
  setCheckIn: (c: Omit<CheckIn, "dateKey" | "time">) => void;
  requestJoin: (memberId: string) => void;
  pushToast: (message: string, emoji?: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const DEFAULT_PERSISTED: PersistedState = {
  userClips: [],
  reactionOverrides: {},
  questDone: {},
  streak: { count: 4, lastDate: shiftKey(-1) },
  userDiary: [],
  checkIns: {},
  joinRequests: [],
};

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PERSISTED;
    return { ...DEFAULT_PERSISTED, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function stripForSave(s: PersistedState): PersistedState {
  return {
    ...s,
    userClips: s.userClips.map((c) => ({ ...c, videoUrl: undefined })),
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [persisted, setPersisted] = useState<PersistedState>(DEFAULT_PERSISTED);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => new Date());
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;

  const today = todayKey();

  // hydrate
  useEffect(() => {
    const p = loadPersisted();
    setPersisted(p);
    setReady(true);
    // IndexedDB에서 영상 URL 복원
    (async () => {
      const urls: Record<string, string> = {};
      for (const c of p.userClips) {
        if (c.videoKey) {
          const u = await getVideoUrl(c.videoKey);
          if (u) urls[c.videoKey] = u;
        }
      }
      if (Object.keys(urls).length) setVideoUrls(urls);
    })();
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // persist
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(stripForSave(persisted)));
    } catch {
      /* quota 초과 시 무시 */
    }
  }, [persisted, ready]);

  const pushToast = useCallback((message: string, emoji?: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, message, emoji }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const addClip = useCallback(
    async (input: AddClipInput) => {
      const d = new Date();
      const videoKey = input.blob ? `video-${uid()}` : undefined;
      if (input.blob && videoKey) {
        try {
          await putVideo(videoKey, input.blob);
          const url = URL.createObjectURL(input.blob);
          setVideoUrls((u) => ({ ...u, [videoKey]: url }));
        } catch {
          /* idb 실패 시 메타데이터만 저장 */
        }
      }
      const gradient = GRADIENT_POOL[Math.floor(Math.random() * GRADIENT_POOL.length)];
      const clip: Clip = {
        id: `user-${uid()}`,
        memberId: ME_ID,
        gameId: input.gameId,
        kind: input.kind,
        caption: input.caption,
        dateKey: todayKey(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        gradient,
        emoji: input.emoji ?? "🎬",
        videoKey,
        reactions: [],
      };
      setPersisted((p) => ({ ...p, userClips: [...p.userClips, clip] }));
    },
    []
  );

  const toggleReaction = useCallback((clipId: string, emoji: string) => {
    setPersisted((p) => {
      const apply = (reactions: Reaction[]): Reaction[] => {
        const existing = reactions.find((r) => r.emoji === emoji);
        if (!existing) return [...reactions, { emoji, count: 1, mine: true }];
        if (existing.mine) {
          return reactions
            .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r))
            .filter((r) => r.count > 0);
        }
        return reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r));
      };

      const userIdx = p.userClips.findIndex((c) => c.id === clipId);
      if (userIdx >= 0) {
        const clips = [...p.userClips];
        clips[userIdx] = { ...clips[userIdx], reactions: apply(clips[userIdx].reactions) };
        return { ...p, userClips: clips };
      }
      // 시드 클립 → override에 기록
      const current =
        p.reactionOverrides[clipId] ??
        seedClips(todayKey(), 23).find((c) => c.id === clipId)?.reactions ??
        [];
      return { ...p, reactionOverrides: { ...p.reactionOverrides, [clipId]: apply(current) } };
    });
  }, []);

  const addDiary = useCallback((entry: Omit<DiaryEntry, "id">) => {
    setPersisted((p) => ({
      ...p,
      userDiary: [...p.userDiary, { ...entry, id: `user-diary-${uid()}` }],
    }));
  }, []);

  const completeQuest = useCallback(() => {
    setPersisted((p) => {
      const key = todayKey();
      const done = p.questDone[key] ?? [];
      if (done.includes(ME_ID)) return p;
      const yesterday = shiftKey(-1);
      const streak =
        p.streak.lastDate === key
          ? p.streak
          : {
              count: p.streak.lastDate === yesterday ? p.streak.count + 1 : 1,
              lastDate: key,
            };
      return { ...p, questDone: { ...p.questDone, [key]: [...done, ME_ID] }, streak };
    });
  }, []);

  const setCheckIn = useCallback((c: Omit<CheckIn, "dateKey" | "time">) => {
    const d = new Date();
    const key = todayKey();
    const checkIn: CheckIn = {
      ...c,
      dateKey: key,
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    };
    setPersisted((p) => ({ ...p, checkIns: { ...p.checkIns, [key]: checkIn } }));
  }, []);

  const requestJoin = useCallback(
    (memberId: string) => {
      setPersisted((p) =>
        p.joinRequests.includes(memberId)
          ? p
          : { ...p, joinRequests: [...p.joinRequests, memberId] }
      );
    },
    []
  );

  const value = useMemo<StoreValue>(() => {
    const currentHour = now.getHours();
    const seeds = seedClips(today, currentHour).map((c) => ({
      ...c,
      reactions: persisted.reactionOverrides[c.id] ?? c.reactions,
    }));
    const userToday = persisted.userClips
      .filter((c) => c.dateKey === today)
      .map((c) => ({
        ...c,
        videoUrl: c.videoKey ? videoUrls[c.videoKey] : undefined,
      }));
    const todayClips = [...seeds, ...userToday].sort(
      (a, b) => a.hour - b.hour || a.minute - b.minute
    );
    const questDoneToday = [
      ...seedQuestDone(today),
      ...(persisted.questDone[today] ?? []),
    ];
    return {
      ready,
      today,
      now,
      todayClips,
      diary: [...seedDiary(), ...persisted.userDiary],
      questDoneToday,
      streak: persisted.streak,
      checkInToday: persisted.checkIns[today],
      joinRequests: persisted.joinRequests,
      toasts,
      addClip,
      toggleReaction,
      addDiary,
      completeQuest,
      setCheckIn,
      requestJoin,
      pushToast,
    };
  }, [
    ready,
    today,
    now,
    persisted,
    videoUrls,
    toasts,
    addClip,
    toggleReaction,
    addDiary,
    completeQuest,
    setCheckIn,
    requestJoin,
    pushToast,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { todaysQuest };
