"use client";

import { Avatar } from "@/components/Avatar";
import { ChannelHeader } from "@/components/ChannelHeader";
import { GAMES, ME_ID, MEMBERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Camera, Eye, Gamepad2, MonitorUp, SwitchCamera, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Facing = "user" | "environment";

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

/** 체크인 모달: 셀카 + (선택) 게임 화면 캡처 */
function CheckInModal({ onClose }: { onClose: () => void }) {
  const { setCheckIn, pushToast } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const [camReady, setCamReady] = useState(false);
  const [facing, setFacing] = useState<Facing>("user");
  const [hasMultiCam, setHasMultiCam] = useState(false);
  const [selfie, setSelfie] = useState<string | undefined>();
  const [screen, setScreen] = useState<string | undefined>();
  const [caption, setCaption] = useState("");
  const [gameId, setGameId] = useState(GAMES[0].id);

  const startStream = useCallback(async (face: Facing) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face },
        audio: false,
      });
      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setFacing(face);
      setCamReady(true);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultiCam(devices.filter((d) => d.kind === "videoinput").length > 1);
      } catch {
        /* 무시 */
      }
    } catch {
      if (!cancelledRef.current) setCamReady(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    startStream("user");
    return () => {
      cancelledRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startStream]);

  const flipCamera = useCallback(() => {
    setSelfie(undefined); // 전환하면 다시 찍기
    startStream(facing === "user" ? "environment" : "user");
  }, [facing, startStream]);

  const captureSelfie = useCallback(() => {
    if (videoRef.current && camReady)
      setSelfie(grabFrame(videoRef.current, 640, facing === "user"));
  }, [camReady, facing]);

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
    setCheckIn({ caption: caption.trim() || "지금 이러고 있음", gameId, selfie, screen });
    pushToast("체크인 완료! 친구들이 볼 수 있어", "👀");
    onClose();
  };

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
          {/* BeReal 스타일: 화면(크게) + 셀카(작게 오버레이) */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-bg-tertiary">
            {screen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={screen} alt="게임 화면" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-txt-muted">
                <Gamepad2 size={32} className="opacity-50" />
                <p className="text-[13px]">게임 화면을 캡처해봐 (선택)</p>
              </div>
            )}
            <div className="absolute left-3 top-3 h-28 w-20 overflow-hidden rounded-lg border-2 border-bg-tertiary bg-bg-floating shadow-elev-high">
              {selfie ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selfie} alt="셀카" className="h-full w-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  className={cn("h-full w-full object-cover", facing === "user" && "-scale-x-100")}
                  muted
                  playsInline
                />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-sm flex-1" onClick={captureSelfie} disabled={!camReady || !!selfie}>
              <Camera size={14} /> {selfie ? "셀카 완료 ✓" : camReady ? "찰칵" : "카메라 없음"}
            </button>
            {hasMultiCam && (
              <button
                className="btn btn-sm btn-ghost shrink-0"
                onClick={flipCamera}
                title={facing === "user" ? "후면 카메라로 전환" : "전면 카메라로 전환"}
              >
                <SwitchCamera size={14} /> {facing === "user" ? "후면" : "전면"}
              </button>
            )}
            <button className="btn btn-sm btn-ghost flex-1" onClick={captureScreen}>
              <MonitorUp size={14} /> {screen ? "화면 다시 캡처" : "게임 화면 캡처"}
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
                {checkInToday.screen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={checkInToday.screen} alt="게임 화면" className="h-full w-full object-cover" />
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
