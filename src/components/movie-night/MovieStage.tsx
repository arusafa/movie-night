"use client";

import { useEffect, useState, type RefObject } from "react";

import CameraPreview from "./CameraPreview";

interface MovieStageProps {
  roomId: string;

  partnerConnected: boolean;

  remoteCameraAvailable: boolean;

  remoteScreenAvailable: boolean;

  remoteCameraVideoRef: RefObject<HTMLVideoElement | null>;

  remoteScreenVideoRef: RefObject<HTMLVideoElement | null>;

  micOn: boolean;

  cameraOn: boolean;

  localStream: MediaStream | null;

  sharing: boolean;

  onToggleMicrophone: () => void;

  onToggleCamera: () => void;

  onShareScreen: () => void;

  onSendLove: () => void;
}

export default function MovieStage({
  roomId,
  partnerConnected,

  remoteCameraAvailable,
  remoteScreenAvailable,

  remoteCameraVideoRef,
  remoteScreenVideoRef,

  micOn,
  cameraOn,
  localStream,
  sharing,

  onToggleMicrophone,
  onToggleCamera,
  onShareScreen,
  onSendLove,
}: MovieStageProps) {
  const [screenShareSupported, setScreenShareSupported] = useState(true);

  useEffect(() => {
    setScreenShareSupported(
      typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getDisplayMedia),
    );
  }, []);

  const hasRemoteVideo = remoteCameraAvailable || remoteScreenAvailable;

  return (
    <section className="flex flex-col bg-[#08060c] md:h-full md:min-h-0">
      {/* ================================================= */}
      {/* VIDEO                                            */}
      {/* ================================================= */}

      <div className="p-3 pb-2 sm:p-4 md:min-h-0 md:flex-1">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl md:h-full md:min-h-[220px] md:aspect-auto">
          {/* ================================================= */}
          {/* REMOTE SCREEN                                    */}
          {/* ================================================= */}

          <video
            ref={remoteScreenVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 h-full w-full bg-black object-cover transition-opacity duration-200 ${
              remoteScreenAvailable
                ? "z-10 opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          />

          {/* ================================================= */}
          {/* REMOTE CAMERA                                    */}
          {/* ================================================= */}

          <video
            ref={remoteCameraVideoRef}
            autoPlay
            playsInline
            className={
              remoteScreenAvailable
                ? `
                  absolute
                  bottom-3
                  right-3
                  z-20
                  aspect-video
                  w-[30%]
                  min-w-[105px]
                  max-w-[180px]
                  rounded-xl
                  border
                  border-white/20
                  bg-black
                  object-cover
                  shadow-2xl
                  transition-opacity
                  duration-200
                  sm:bottom-4
                  sm:right-4
                  sm:max-w-[210px]
                  ${
                    remoteCameraAvailable
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }
                `
                : `
                  absolute
                  inset-0
                  z-10
                  h-full
                  w-full
                  bg-black
                  object-cover
                  transition-opacity
                  duration-200
                  ${
                    remoteCameraAvailable
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }
                `
            }
          />

          {/* ================================================= */}
          {/* EMPTY STATE                                      */}
          {/* ================================================= */}

          {!hasRemoteVideo && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
              {!partnerConnected ? (
                <>
                  <div className="mb-2 text-4xl sm:text-5xl">💕</div>

                  <h2 className="text-base font-semibold sm:text-xl">
                    Waiting for your girlfriend
                  </h2>

                  <p className="mt-1 text-xs text-white/40 sm:text-sm">
                    Send her this room code
                  </p>

                  <div className="mt-3 rounded-xl bg-white/5 px-4 py-2 font-mono text-lg tracking-widest text-pink-400 sm:px-5 sm:py-3 sm:text-xl">
                    {roomId}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 text-4xl sm:text-5xl">🎬</div>

                  <h2 className="text-lg font-semibold sm:text-xl">
                    You&apos;re together ❤️
                  </h2>

                  <p className="mt-1 text-xs text-white/40 sm:text-sm">
                    Waiting for her camera or screen.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* REMOTE CAMERA LABEL WHEN SCREEN IS SHARED        */}
          {/* ================================================= */}

          {remoteScreenAvailable && remoteCameraAvailable && (
            <div className="pointer-events-none absolute bottom-5 right-5 z-[25] rounded-full bg-black/70 px-2 py-1 text-[9px] text-white backdrop-blur-md sm:bottom-6 sm:right-6 sm:text-[10px]">
              My Love 💕
            </div>
          )}

          {/* ================================================= */}
          {/* YOUR SCREEN SHARE BADGE                           */}
          {/* ================================================= */}

          {sharing && (
            <div className="absolute left-3 top-3 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur-xl sm:text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
              You&apos;re sharing
            </div>
          )}

          {/* ================================================= */}
          {/* YOUR CAMERA — ALWAYS BOTTOM LEFT                  */}
          {/* ================================================= */}

          <CameraPreview enabled={cameraOn} stream={localStream} />
        </div>
      </div>

      {/* ================================================= */}
      {/* CONTROLS                                         */}
      {/* ================================================= */}

      <div className="shrink-0 border-t border-white/10 bg-[#0d0910] px-3 py-3">
        <div className="flex items-center justify-center gap-2">
          {/* CAMERA */}

          <button
            type="button"
            onClick={onToggleCamera}
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            className={`flex h-12 w-14 touch-manipulation items-center justify-center rounded-xl text-xl transition-all active:scale-95 ${
              cameraOn
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                : "bg-white/[0.07] text-white/80"
            }`}
          >
            {cameraOn ? "📹" : "🚫"}
          </button>

          {/* MICROPHONE */}

          <button
            type="button"
            onClick={onToggleMicrophone}
            aria-label={micOn ? "Mute microphone" : "Turn microphone on"}
            className={`flex h-12 w-14 touch-manipulation items-center justify-center rounded-xl text-xl transition-all active:scale-95 ${
              micOn
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                : "bg-white/[0.07] text-white/80"
            }`}
          >
            {micOn ? "🎤" : "🔇"}
          </button>

          {/* SCREEN */}

          <button
            type="button"
            onClick={screenShareSupported ? onShareScreen : undefined}
            disabled={!screenShareSupported}
            aria-label={
              screenShareSupported
                ? sharing
                  ? "Stop sharing"
                  : "Share screen"
                : "Screen sharing unavailable"
            }
            className={`flex h-12 w-14 touch-manipulation items-center justify-center rounded-xl text-xl transition-all ${
              !screenShareSupported
                ? "cursor-not-allowed bg-white/[0.03] text-white/20"
                : sharing
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 active:scale-95"
                  : "bg-white/[0.07] text-white/80 active:scale-95"
            }`}
          >
            🖥️
          </button>

          {/* LOVE */}

          <button
            type="button"
            onClick={onSendLove}
            aria-label="Send love"
            className="flex h-12 w-14 touch-manipulation items-center justify-center rounded-xl bg-pink-500/10 text-xl transition-all active:scale-95"
          >
            ❤️
          </button>
        </div>

        {!screenShareSupported && (
          <p className="mx-auto mt-2 max-w-xs text-center text-[10px] leading-4 text-white/25">
            Screen sharing isn&apos;t available on iPhone. You can still watch
            your partner&apos;s screen.
          </p>
        )}

        {screenShareSupported && (cameraOn || sharing) && (
          <p className="mt-2 text-center text-[10px] text-white/25">
            {sharing && cameraOn
              ? "Screen + camera"
              : sharing
                ? "Sharing screen"
                : "Camera on"}
          </p>
        )}
      </div>
    </section>
  );
}
