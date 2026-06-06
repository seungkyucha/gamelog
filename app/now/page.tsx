"use client";

import { Avatar } from "@/components/Avatar";
import { ChannelHeader } from "@/components/ChannelHeader";
import { GAMES, ME_ID, MEMBERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Camera, Eye, Gamepad2, MonitorUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function grabFrame(video: HTMLVideoElement, maxW = 640, mirror = false): string {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxW / (video.videoWidth || maxW));
  canvas.width = (video.videoWidth || maxW) * scale;
  canvas.height = (video.videoHeight || maxW * 0.75) * scale;
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    // 전면 카메라는 미러링을 이미지에 구워서 저장 (표시할 땐 반전 불필요)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6);
}

/** 체크인 모달: 전면+후면 동시 촬영 (BeReal 스타일) + (선택) 게임 화면 캡처 */
function CheckInModal({ onClose }: { onClose: () => void }) {
  const { setCheckIn, pushToast } = useStore();
  const frontVideoRef = useRef<HTMLVideoElement>(null);
  const rearVideoRef = useRef<HTMLVideoElement>(null);
  const frontStreamRef = useRef<MediaStream | null>(null);
  const rearStreamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const [frontReady, setFrontReady] = useState(false);
  const [dual, setDual] = useState(false); // 전면+후면 동시 스트림 성공 여부
  const [capturing, setCapturing] = useState(false);
  const [selfie, setSelfie] = useState<string | undefined>();
  const [rear, setRear] = useState<string | undefined>();
  const [screen, setScreen] = useState<string | undefined>();
  const [caption, setCaption] = useState("");
  const [gameId, setGameId] = useState(GAMES[0].id);

  const stopAll = useCallback(() => {
    frontStreamRef.current?.getTracks().forEach((t) => t.stop());
    rearStreamRef.current?.getTracks().forEach((t) => t.stop());
    frontStreamRef.current = null;
    rearStreamRef.current = null;
  }, []);

  /** 전면 스트림 + 가능하면 후면 스트림까지 동시에 연다 */
  const openStreams = useCallback(async () => {
    stopAll();
    setFrontReady(false);
    setDual(false);
    try {
      const front = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (cancelledRef.current) {
        front.getTracks().forEach((t) => t.stop());
        return;
      }
      frontStreamRef.current = front;
      setFrontReady(true);
    } catch {
      return; // 카메라 없음
    }
    // 후면 동시 스트림 시도 (지원 기기에서만 성공)
    try {
      const rearS = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
        audio: false,
      });
      if (cancelledRef.current) {
        rearS.getTracks().forEach((t) => t.stop());
        return;
      }
      rearStreamRef.current = rearS;
      setDual(true);
    } catch {
      setDual(false); // 동시 미지원 → 촬영 시 순차 폴백
    }
  }, [stopAll]);

  useEffect(() => {
    cancelledRef.current = false;
    openStreams();
    return () => {
      cancelledRef.current = true;
      stopAll();
    };
  }, [openStreams, stopAll]);

  // 스트림을 비디오 엘리먼트에 연결 (다시 찍기 후 재연결 포함)
  useEffect(() => {
    if (!selfie && frontReady && frontVideoRef.current && frontStreamRef.current) {
      frontVideoRef.current.srcObject = frontStreamRef.current;
      frontVideoRef.current.play().catch(() => {});
    }
  }, [selfie, frontReady]);
  useEffect(() => {
    if (dual && !rear && !screen && rearVideoRef.current && rearStreamRef.current) {
      rearVideoRef.current.srcObject = rearStreamRef.current;
      rearVideoRef.current.play().catch(() => {});
    }
  }, [dual, rear, screen]);

  /** 전면+후면 한 번에 촬영. 동시 스트림 미지원 기기는 전면 → 후면 순차 자동 촬영 */
  const captureBoth = useCallback(async () => {
    if (!frontVideoRef.current || !frontReady || capturing) return;
    setCapturing(true);
    setSelfie(grabFrame(frontVideoRef.current, 640, true));
    if (dual && rearVideoRef.current) {
      // 두 스트림이 살아있으면 같은 순간을 동시에 캡처
      setRear(grabFrame(rearVideoRef.current, 960));
    } else {
      // 순차 폴백: 전면을 멈추고 후면을 잠깐 열어 한 컷
      try {
        frontStreamRef.current?.getTracks().forEach((t) => t.stop());
        const rearS = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } },
          audio: false,
        });
        const v = rearVideoRef.current;
        if (v) {
          v.srcObject = rearS;
          await v.play().catch(() => {});
          await new Promise((r) => setTimeout(r, 600));
          setRear(grabFrame(v, 960));
        }
        rearS.getTracks().forEach((t) => t.stop());
      } catch {
        /* 후면 카메라 없음(데스크톱) — 셀카만 저장 */
      }
    }
    setCapturing(false);
  }, [dual, frontReady, capturing]);

  const retake = useCallback(() => {
    setSelfie(undefined);
    setRear(undefined);
    openStreams(); // 순차 폴백에서 전면이 멈췄을 수 있으니 다시 연다
  }, [openStreams]);

  const captureScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 300));
      setScreen(grabFrame(video, 960));
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* 사용자가 취소 */
    }
  }, []);

  const save = () => {
    setCheckIn({ caption: caption.trim() || "지금 이러고 있음", gameId, selfie, screen, rear });
    pushToast("체크인 완료! 친구들이 볼 수 있어", "👀");
    onClose();
  };

  const captured = Boolean(selfie || rear);
  const bigPhoto = screen ?? rear;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md animate-pop-in rounded-lg bg-bg-secondary shadow-elev-high"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 pt-4">
          <h3 className="text-lg font-bold text-txt-header">지금 뭐 해? 👀</h3>
          <button onClick={onClose} className="rounded p-1 text-txt-muted hover:bg-bg-modifier hover:text-txt-normal">
            <X size={20} />
          </button>
        </header>
        <div className="space-y-4 p-4">
          {/* BeReal 스타일: 후면/화면(크게) + 전면(작게 오버레이) */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-bg-tertiary">
            {bigPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bigPhoto} alt="후면/게임 화면" className="h-full w-full object-cover" />
            ) : (
              <>
                {/* 후면 라이브(동시 모드) 또는 순차 촬영 중 표시용 */}
                <video
                  ref={rearVideoRef}
                  className={cn("h-full w-full object-cover", !dual && !capturing && "hidden")}
                  muted
                  playsInline
                />
                {!dual && !capturing && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-txt-muted">
                    <Gamepad2 size={32} className="opacity-50" />
                    <p className="text-[13px]">동시 촬영을 누르면 전면+후면을 한 번에 찍어</p>
                  </div>
                )}
              </>
            )}
            <div className="absolute left-3 top-3 h-28 w-20 overflow-hidden rounded-lg border-2 border-bg-tertiary bg-bg-floating shadow-elev-high">
              {selfie ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selfie} alt="셀카" className="h-full w-full object-cover" />
              ) : (
                <video ref={frontVideoRef} className="h-full w-full -scale-x-100 object-cover" muted playsInline />
              )}
            </div>
            {dual && !captured && (
              <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xxs font-bold text-white">
                전면+후면 동시 📸
              </span>
            )}
            {capturing && (
              <span className="absolute bottom-2 right-2 animate-pulse-rec rounded-full bg-black/60 px-2 py-0.5 text-xxs font-bold text-white">
                후면 촬영 중...
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {captured ? (
              <button className="btn btn-sm btn-ghost flex-1" onClick={retake} disabled={capturing}>
                다시 찍기
              </button>
            ) : (
              <button className="btn btn-sm flex-1" onClick={captureBoth} disabled={!frontReady || capturing}>
                <Camera size={14} />{" "}
                {capturing ? "촬영 중..." : frontReady ? "동시 촬영 📸" : "카메라 없음"}
              </button>
            )}
            <button className="btn btn-sm btn-ghost flex-1" onClick={captureScreen}>
              <MonitorUp size={14} /> {screen ? "화면 다시 캡처" : "게임 화면 캡처 (선택)"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => setGameId(g.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[13px] font-semibold transition-colors",
                  gameId === g.id ? "text-white" : "bg-bg-input text-txt-muted hover:bg-bg-modifier"
                )}
                style={gameId === g.id ? { background: g.color } : undefined}
              >
                {g.emoji} {g.short}
              </button>
            ))}
          </div>

          <input
            className="input"
            placeholder="지금 상황 한 줄 (예: 랭크 연패 중...)"
            value={caption}
            maxLength={40}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button className="btn btn-success w-full" onClick={save}>
            체크인하기
          </button>
        </div>
      </div>
    </div>
  );
}

/** 기능 ③ 게이머 BeReal — 동시 접속 인증 + 합류(LFG) */
export default function NowPage() {
  const { checkInToday, joinRequests, requestJoin, pushToast } = useStore();
  const [modal, setModal] = useState(false);
  const me = MEMBERS.find((m) => m.id === ME_ID)!;
  const friends = MEMBERS.filter((m) => m.id !== ME_ID);
  const myGame = checkInToday ? GAMES.find((g) => g.id === checkInToday.gameId) : undefined;

  return (
    <>
      <ChannelHeader
        icon={Eye}
        name="지금-뭐해"
        topic="오늘의 체크인 — 지금 하는 게임을 인증하고, 친구 판에 합류해."
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[740px] space-y-5 p-4 pb-10">
          {/* 오늘의 체크인 */}
          {checkInToday ? (
            <div className="card overflow-hidden p-0">
              <div className="relative aspect-video bg-bg-tertiary">
                {checkInToday.screen ?? checkInToday.rear ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={checkInToday.screen ?? checkInToday.rear}
                    alt="후면/게임 화면"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #5865F2, #23A55A)" }}
                  >
                    <span className="text-5xl">{myGame?.emoji ?? "🎮"}</span>
                  </div>
                )}
                {checkInToday.selfie && (
                  <div className="absolute left-3 top-3 h-28 w-20 overflow-hidden rounded-lg border-2 border-bg-secondary shadow-elev-high">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={checkInToday.selfie} alt="셀카" className="h-full w-full object-cover" />
                  </div>
                )}
                <span className="absolute right-2 top-2 rounded-full bg-status-online px-2 py-0.5 text-xxs font-bold text-white">
                  ✓ {checkInToday.time} 체크인
                </span>
              </div>
              <div className="flex items-center gap-2 p-3">
                <Avatar member={me} size={28} />
                <div>
                  <p className="text-[14px] font-bold text-txt-header">
                    {me.name} · {myGame?.emoji} {myGame?.name}
                  </p>
                  <p className="text-[13px] text-txt-muted">{checkInToday.caption}</p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setModal(true)}
              className="flex w-full flex-col items-center gap-1 rounded-lg bg-gradient-to-br from-brand to-status-online py-7 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="text-4xl">👀</span>
              <span className="text-xl font-black text-white">지금 뭐 해?</span>
              <span className="text-[13px] font-medium text-white/80">
                셀카 + 게임 화면으로 오늘의 체크인
              </span>
            </button>
          )}

          {/* 친구들 현황 */}
          <div>
            <p className="group-label mb-2">파티원은 지금</p>
            <div className="space-y-2">
              {friends.map((f) => {
                const game = GAMES.find((g) => g.id === f.playingGameId);
                const requested = joinRequests.includes(f.id);
                return (
                  <div key={f.id} className="card flex items-center gap-3">
                    <Avatar member={f} size={40} showStatus ringColor="#2B2D31" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-txt-header">{f.name}</p>
                      {f.status === "ingame" && game ? (
                        <p className="text-[13px] text-txt-muted">
                          {game.emoji} <span className="font-semibold" style={{ color: game.color }}>{game.name}</span>{" "}
                          {f.sinceMin}분째 플레이 중
                        </p>
                      ) : (
                        <p className="text-[13px] text-txt-muted">온라인 · 게임 대기 중</p>
                      )}
                    </div>
                    {f.status === "ingame" ? (
                      <button
                        className={cn("btn btn-sm", requested && "btn-ghost")}
                        disabled={requested}
                        onClick={() => {
                          requestJoin(f.id);
                          pushToast(`${f.name}에게 합류 요청을 보냈어!`, "🎮");
                        }}
                      >
                        {requested ? "요청 보냄 ✓" : "나도 합류 🎮"}
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => pushToast(`${f.name}을(를) 콕 찔렀어`, "👉")}
                      >
                        콕 찌르기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xxs text-txt-faint">
            체크인은 하루에 한 번 · 보는 사람은 우리 파티뿐이야
          </p>
        </div>
      </div>
      {modal && <CheckInModal onClose={() => setModal(false)} />}
    </>
  );
}
