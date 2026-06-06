"use client";

import { GAMES } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { ClipKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Camera, CameraOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "init" | "preview" | "recording" | "review" | "nocam";

const FALLBACK_EMOJIS = ["🎮", "🔥", "🏆", "💀", "😎", "🍗", "⚔️", "🌙"];

export function CaptureModal({
  title,
  duration,
  kind,
  defaultCaption = "",
  onClose,
  onSaved,
}: {
  title: string;
  duration: number; // 녹화 길이(초)
  kind: ClipKind;
  defaultCaption?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { addClip, pushToast } = useStore();
  const [phase, setPhase] = useState<Phase>("init");
  const [countdown, setCountdown] = useState(duration);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [gameId, setGameId] = useState(GAMES[0].id);
  const [emoji, setEmoji] = useState(FALLBACK_EMOJIS[0]);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // 카메라 시작
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setPhase("preview");
      } catch {
        if (!cancelled) setPhase("nocam");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 비디오 엘리먼트에 스트림 연결
  useEffect(() => {
    if ((phase === "preview" || phase === "recording") && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        setPhase("nocam");
        return;
      }
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      const b = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      setBlob(b);
      setBlobUrl(URL.createObjectURL(b));
      setPhase("review");
    };
    recorder.start();
    setPhase("recording");
    setCountdown(duration);
    let left = duration;
    const timer = setInterval(() => {
      left -= 1;
      setCountdown(left);
      if (left <= 0) {
        clearInterval(timer);
        if (recorder.state !== "inactive") recorder.stop();
      }
    }, 1000);
  }, [duration]);

  const save = useCallback(async () => {
    setSaving(true);
    await addClip({
      kind,
      gameId,
      caption: caption.trim() || "지금 이 순간",
      blob: blob ?? undefined,
      emoji: blob ? "🎬" : emoji,
    });
    pushToast("클립이 기록됐어!", "📹");
    onSaved?.();
    onClose();
  }, [addClip, blob, caption, emoji, gameId, kind, onClose, onSaved, pushToast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md animate-pop-in rounded-lg bg-bg-secondary shadow-elev-high"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 pt-4">
          <h3 className="text-lg font-bold text-txt-header">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-txt-muted hover:bg-bg-modifier hover:text-txt-normal">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 p-4">
          {/* 미디어 영역 */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-bg-tertiary">
            {phase === "init" && (
              <div className="flex h-full items-center justify-center text-sm text-txt-muted">
                카메라 준비 중...
              </div>
            )}
            {(phase === "preview" || phase === "recording") && (
              <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" muted playsInline />
            )}
            {phase === "review" && blobUrl && (
              <video src={blobUrl} className="h-full w-full -scale-x-100 object-cover" autoPlay loop muted playsInline />
            )}
            {phase === "nocam" && (
              <div
                className="flex h-full flex-col items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #5865F2, #EB459E)" }}
              >
                <span className="text-5xl">{emoji}</span>
                <p className="flex items-center gap-1 text-xxs font-semibold text-white/80">
                  <CameraOff size={12} /> 카메라 없이 이모지로 기록
                </p>
              </div>
            )}
            {phase === "recording" && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1">
                <span className="h-2.5 w-2.5 animate-pulse-rec rounded-full bg-status-dnd" />
                <span className="text-[13px] font-bold text-white">{countdown}초</span>
              </div>
            )}
          </div>

          {/* 이모지 선택 (노카메라 모드) */}
          {phase === "nocam" && (
            <div className="flex flex-wrap gap-1.5">
              {FALLBACK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "rounded-lg p-1.5 text-xl transition-colors",
                    emoji === e ? "bg-brand/30 ring-1 ring-brand" : "bg-bg-input hover:bg-bg-modifier"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* 게임 선택 */}
          {(phase === "review" || phase === "nocam") && (
            <>
              <div>
                <p className="group-label mb-1.5">무슨 게임?</p>
                <div className="flex flex-wrap gap-1.5">
                  {GAMES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGameId(g.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-[13px] font-semibold transition-colors",
                        gameId === g.id
                          ? "text-white"
                          : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
                      )}
                      style={gameId === g.id ? { background: g.color } : undefined}
                    >
                      {g.emoji} {g.short}
                    </button>
                  ))}
                </div>
              </div>
              <input
                className="input"
                placeholder="한 줄 캡션 (편집은 없어, 솔직하게)"
                value={caption}
                maxLength={40}
                onChange={(e) => setCaption(e.target.value)}
              />
            </>
          )}

          {/* 액션 */}
          <div className="flex justify-end gap-2">
            {phase === "preview" && (
              <button className="btn w-full" onClick={startRecording}>
                <Camera size={16} /> {duration}초 촬영 시작
              </button>
            )}
            {phase === "recording" && (
              <button className="btn btn-danger w-full" disabled>
                녹화 중... {countdown}초
              </button>
            )}
            {(phase === "review" || phase === "nocam") && (
              <>
                {phase === "review" && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setBlob(null);
                      setBlobUrl(null);
                      setPhase("preview");
                    }}
                  >
                    다시 찍기
                  </button>
                )}
                <button className="btn btn-success flex-1" onClick={save} disabled={saving}>
                  {saving ? "저장 중..." : "기록하기"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
