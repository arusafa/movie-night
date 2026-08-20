"use client";

import type { RefObject } from "react";

import CameraPreview from "./CameraPreview";

interface MovieStageProps {
  roomId: string;

  partnerConnected: boolean;

  remoteVideoAvailable: boolean;

  remoteVideoRef: RefObject<HTMLVideoElement | null>;

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
  remoteVideoAvailable,
  remoteVideoRef,
  micOn,
  cameraOn,
  localStream,
  sharing,
  onToggleMicrophone,
  onToggleCamera,
  onShareScreen,
  onSendLove,
}: MovieStageProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[#08060c]">
      {/* ================================================= */}
      {/* VIDEO AREA                                        */}
      {/* ================================================= */}

      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          {/* ================================================= */}
          {/* PARTNER VIDEO                                     */}
          {/* ================================================= */}

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-200 ${
              remoteVideoAvailable ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* ================================================= */}
          {/* EMPTY STATE                                       */}
          {/* ================================================= */}

          {!remoteVideoAvailable && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
              {!partnerConnected ? (
                <>
                  <div className="mb-4 text-5xl">💕</div>

                  <h2 className="text-lg font-semibold sm:text-xl">
                    Waiting for your girlfriend
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    Send her this room code:
                  </p>

                  <div className="mt-4 rounded-xl bg-white/5 px-5 py-3 font-mono text-xl tracking-widest text-pink-400">
                    {roomId}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 text-5xl">🎬</div>

                  <h2 className="text-lg font-semibold sm:text-xl">
                    You&apos;re together ❤️
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    Turn on your camera or share your screen.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* SCREEN SHARE BADGE                                */}
          {/* ================================================= */}

          {sharing && (
            <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-xl">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
              Sharing screen
            </div>
          )}

          {/* ================================================= */}
          {/* YOUR LOCAL CAMERA                                 */}
          {/* ================================================= */}

          <CameraPreview enabled={cameraOn} stream={localStream} />
        </div>
      </div>

      {/* ================================================= */}
      {/* CONTROLS                                         */}
      {/* ================================================= */}

      <div className="relative z-40 shrink-0 border-t border-white/10 bg-[#0d0910] px-3 py-3 sm:px-4">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {/* CAMERA */}

          <button
            type="button"
            onClick={onToggleCamera}
            title={cameraOn ? "Turn camera off" : "Turn camera on"}
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            className={`flex h-12 min-w-12 items-center justify-center rounded-xl px-3 transition-all active:scale-95 ${
              cameraOn
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                : "bg-white/[0.07] text-white/80 hover:bg-white/10"
            }`}
          >
            <span className="text-lg">{cameraOn ? "📹" : "🚫"}</span>
          </button>

          {/* MICROPHONE */}

          <button
            type="button"
            onClick={onToggleMicrophone}
            title={micOn ? "Mute microphone" : "Turn microphone on"}
            aria-label={micOn ? "Mute microphone" : "Turn microphone on"}
            className={`flex h-12 min-w-12 items-center justify-center rounded-xl px-3 transition-all active:scale-95 ${
              micOn
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                : "bg-white/[0.07] text-white/80 hover:bg-white/10"
            }`}
          >
            <span className="text-lg">{micOn ? "🎤" : "🔇"}</span>
          </button>

          {/* SCREEN SHARE */}

          <button
            type="button"
            onClick={onShareScreen}
            title={sharing ? "Stop sharing" : "Share screen"}
            aria-label={sharing ? "Stop sharing" : "Share screen"}
            className={`flex h-12 min-w-12 items-center justify-center rounded-xl px-3 transition-all active:scale-95 ${
              sharing
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                : "bg-white/[0.07] text-white/80 hover:bg-white/10"
            }`}
          >
            <span className="text-lg">🖥️</span>
          </button>

          {/* LOVE */}

          <button
            type="button"
            onClick={onSendLove}
            title="Send love"
            aria-label="Send love"
            className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-pink-500/10 px-3 text-xl transition-all hover:scale-105 hover:bg-pink-500/20 active:scale-95"
          >
            ❤️
          </button>
        </div>

        {/* ================================================= */}
        {/* CURRENT LOCAL STATE                               */}
        {/* ================================================= */}

        {(cameraOn || sharing) && (
          <p className="mt-2 text-center text-[10px] text-white/30">
            {sharing && cameraOn
              ? "Sharing screen + camera."
              : sharing
                ? "Sharing your screen."
                : "Camera is on."}
          </p>
        )}
      </div>
    </section>
  );
}
