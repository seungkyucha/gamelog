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
import type { CheckIn, Clip, ClipKind, DiaryEntry, Integrations, PersistedState, Reaction } from "./types";
import { uid } from "./utils";

const LS_KEY = "gamelog-state-v1";
const REMOTE_PREFIX = "remote:";
const SYNC_INTERVAL_MS = 30_000;

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
  todayClips: Clip[];
  diary: DiaryEntry[];
  questDoneToday: string[];
  streak: { count: number; lastDate: string };
  checkInToday?: CheckIn;
  joinRequests: string[];
  integrations: Integrations;
  toasts: Toast[];
  addClip: (input: AddClipInput) => Promise<void>;
  toggleReaction: (clipId: string, emoji: string) => void;
  addDiary: (entry: Omit<DiaryEntry, "id">) => void;
  completeQuest: () => void;
  setCheckIn: (c: Omit<CheckIn, "dateKey" | "time">) => void;
  requestJoin: (memberId: string) => void;
  setIntegration: (kind: keyof Integrations, id: string | undefined) => void;
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
  integrations: {},
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

/** 서버 푸시/로컬 저장용 — blob URL과 업로드 실패한 대용량 dataURL 미디어는 제외 */
function stripForSave(s: PersistedState): PersistedState {
  const stripMedia = (v?: string) => (v?.startsWith("data:") ? undefined : v);
  return {
    ...s,
    userClips: s.userClips.map((c) => ({ ...c, videoUrl: undefined })),
    checkIns: Object.fromEntries(
      Object.entries(s.checkIns).map(([k, ci]) => [
        k,
        { ...ci, selfie: stripMedia(ci.selfie), screen: stripMedia(ci.screen), rear: stripMedia(ci.rear) },
      ])
    ),
  };
}

/** 두 상태의 가산적 병합 — 어느 기기의 업로드도 사라지지 않게 합집합 기준 */
function mergeStates(a: PersistedState, b: PersistedState): PersistedState {
  const clipIds = new Set(a.userClips.map((c) => c.id));
  const diaryIds = new Set(a.userDiary.map((d) => d.id));

  const questDone: Record<string, string[]> = { ...b.questDone };
  for (const [k, v] of Object.entries(a.questDone)) {
    questDone[k] = [...new Set([...(questDone[k] ?? []), ...v])];
  }

  const streak =
    a.streak.lastDate > b.streak.lastDate
      ? a.streak
      : b.streak.lastDate > a.streak.lastDate
        ? b.streak
        : a.streak.count >= b.streak.count
          ? a.streak
          : b.streak;

  // 체크인: 날짜별로 합치되, 원격 미디어를 가진 쪽 우선 (다른 기기에서도 보이는 버전)
  const hasRemote = (ci: CheckIn) =>
    [ci.selfie, ci.screen, ci.rear].some((v) => v?.startsWith(REMOTE_PREFIX));
  const checkIns: Record<string, CheckIn> = { ...b.checkIns };
  for (const [k, v] of Object.entries(a.checkIns)) {
    const other = checkIns[k];
    checkIns[k] = other && hasRemote(other) && !hasRemote(v) ? other : v;
  }

  return {
    userClips: [...a.userClips, ...b.userClips.filter((c) => !clipIds.has(c.id))],
    userDiary: [...a.userDiary, ...b.userDiary.filter((d) => !diaryIds.has(d.id))],
    reactionOverrides: { ...b.reactionOverrides, ...a.reactionOverrides },
    questDone,
    streak,
    checkIns,
    joinRequests: [...new Set([...a.joinRequests, ...b.joinRequests])],
    integrations: { ...b.integrations, ...a.integrations },
  };
}

// ---- 서버 동기화 API ----

async function fetchServerState(): Promise<PersistedState | null> {
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as Partial<PersistedState> | null;
    return j ? { ...DEFAULT_PERSISTED, ...j } : null;
  } catch {
    return null;
  }
}

async function pushServerState(s: PersistedState): Promise<void> {
  try {
    await fetch("/api/state", { method: "POST", body: JSON.stringify(stripForSave(s)) });
  } catch {
    /* 오프라인 — 로컬에만 저장 */
  }
}

async function uploadMedia(dataUrl: string): Promise<string | null> {
  try {
    const r = await fetch("/api/media", { method: "POST", body: dataUrl });
    if (!r.ok) return null;
    const j = (await r.json()) as { id?: string };
    return j.id ? REMOTE_PREFIX + j.id : null;
  } catch {
    return null;
  }
}

async function fetchMedia(marker: string): Promise<string | null> {
  try {
    const id = marker.slice(REMOTE_PREFIX.length);
    const r = await fetch(`/api/media?id=${id}`);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [persisted, setPersisted] = useState<PersistedState>(DEFAULT_PERSISTED);
  /** videoKey/remote 마커 → 재생 가능한 URL(objectURL 또는 dataURL) */
  const [mediaCache, setMediaCache] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => new Date());
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = todayKey();

  // ---- 초기 로드: 로컬 + 서버 병합 ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadPersisted();
      const server = await fetchServerState();
      if (cancelled) return;
      const merged = server ? mergeStates(local, server) : local;
      setPersisted(merged);
      setReady(true);
      // IndexedDB 로컬 영상 복원
      for (const c of merged.userClips) {
        if (c.videoKey && !c.videoKey.startsWith(REMOTE_PREFIX)) {
          const u = await getVideoUrl(c.videoKey);
          if (u && !cancelled) setMediaCache((m) => ({ ...m, [c.videoKey!]: u }));
        }
      }
    })();
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // ---- 주기적 서버 동기화 (다른 기기 업로드 반영) ----
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(async () => {
      const server = await fetchServerState();
      if (!server) return;
      const current = persistedRef.current;
      const merged = mergeStates(current, server);
      if (JSON.stringify(stripForSave(merged)) !== JSON.stringify(stripForSave(current))) {
        setPersisted(merged);
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(t);
  }, [ready]);

  // ---- 원격 미디어 다운로드 (캐시에 없는 remote: 마커) ----
  useEffect(() => {
    if (!ready) return;
    const markers = new Set<string>();
    for (const c of persisted.userClips) {
      if (c.videoKey?.startsWith(REMOTE_PREFIX)) markers.add(c.videoKey);
    }
    for (const ci of Object.values(persisted.checkIns)) {
      for (const v of [ci.selfie, ci.screen, ci.rear]) {
        if (v?.startsWith(REMOTE_PREFIX)) markers.add(v);
      }
    }
    for (const m of markers) {
      if (mediaCache[m]) continue;
      fetchMedia(m).then((data) => {
        if (data) setMediaCache((cache) => ({ ...cache, [m]: data }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, persisted]);

  // ---- 저장: 로컬 즉시 + 서버 디바운스 푸시 ----
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(stripForSave(persisted)));
    } catch {
      /* quota 초과 시 무시 */
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => pushServerState(persistedRef.current), 1200);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [persisted, ready]);

  const pushToast = useCallback((message: string, emoji?: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, message, emoji }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const addClip = useCallback(async (input: AddClipInput) => {
    const d = new Date();
    let videoKey: string | undefined;
    if (input.blob) {
      // 1순위: 서버 업로드 (모든 기기에서 보임) · 2순위: IndexedDB (이 기기 전용)
      try {
        const dataUrl = await blobToDataUrl(input.blob);
        if (dataUrl.length < 650_000) {
          const marker = await uploadMedia(dataUrl);
          if (marker) {
            videoKey = marker;
            setMediaCache((m) => ({ ...m, [marker]: dataUrl }));
          }
        }
      } catch {
        /* 변환 실패 → 로컬 폴백 */
      }
      if (!videoKey) {
        videoKey = `video-${uid()}`;
        try {
          await putVideo(videoKey, input.blob);
          const url = URL.createObjectURL(input.blob);
          setMediaCache((m) => ({ ...m, [videoKey!]: url }));
        } catch {
          videoKey = undefined;
        }
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
  }, []);

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
    const base: CheckIn = {
      ...c,
      dateKey: key,
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    };
    // 즉시 로컬 반영 후, 사진을 서버에 업로드해 remote 마커로 교체
    setPersisted((p) => ({ ...p, checkIns: { ...p.checkIns, [key]: base } }));
    (async () => {
      const fields = ["selfie", "screen", "rear"] as const;
      const updated: CheckIn = { ...base };
      let changed = false;
      for (const f of fields) {
        const v = updated[f];
        if (v?.startsWith("data:") && v.length < 650_000) {
          const marker = await uploadMedia(v);
          if (marker) {
            setMediaCache((m) => ({ ...m, [marker]: v }));
            updated[f] = marker;
            changed = true;
          }
        }
      }
      if (changed) {
        setPersisted((p) => ({ ...p, checkIns: { ...p.checkIns, [key]: updated } }));
      }
    })();
  }, []);

  const requestJoin = useCallback((memberId: string) => {
    setPersisted((p) =>
      p.joinRequests.includes(memberId) ? p : { ...p, joinRequests: [...p.joinRequests, memberId] }
    );
  }, []);

  const setIntegration = useCallback((kind: keyof Integrations, id: string | undefined) => {
    setPersisted((p) => ({ ...p, integrations: { ...p.integrations, [kind]: id } }));
  }, []);

  const value = useMemo<StoreValue>(() => {
    const currentHour = now.getHours();
    const resolveMedia = (v?: string) =>
      v?.startsWith(REMOTE_PREFIX) ? mediaCache[v] : v;

    const seeds = seedClips(today, currentHour).map((c) => ({
      ...c,
      reactions: persisted.reactionOverrides[c.id] ?? c.reactions,
    }));
    const userToday = persisted.userClips
      .filter((c) => c.dateKey === today)
      .map((c) => ({
        ...c,
        videoUrl: c.videoKey ? mediaCache[c.videoKey] : undefined,
      }));
    const todayClips = [...seeds, ...userToday].sort(
      (a, b) => a.hour - b.hour || a.minute - b.minute
    );
    const questDoneToday = [...seedQuestDone(today), ...(persisted.questDone[today] ?? [])];

    const rawCheckIn = persisted.checkIns[today];
    const checkInToday = rawCheckIn
      ? {
          ...rawCheckIn,
          selfie: resolveMedia(rawCheckIn.selfie),
          screen: resolveMedia(rawCheckIn.screen),
          rear: resolveMedia(rawCheckIn.rear),
        }
      : undefined;

    return {
      ready,
      today,
      now,
      todayClips,
      diary: [...seedDiary(), ...persisted.userDiary],
      questDoneToday,
      streak: persisted.streak,
      checkInToday,
      joinRequests: persisted.joinRequests,
      integrations: persisted.integrations,
      toasts,
      addClip,
      toggleReaction,
      addDiary,
      completeQuest,
      setCheckIn,
      requestJoin,
      setIntegration,
      pushToast,
    };
  }, [
    ready,
    today,
    now,
    persisted,
    mediaCache,
    toasts,
    addClip,
    toggleReaction,
    addDiary,
    completeQuest,
    setCheckIn,
    requestJoin,
    setIntegration,
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
