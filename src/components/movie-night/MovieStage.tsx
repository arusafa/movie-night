"use client";

import { useEffect, useState, type RefObject } from "react";

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
  /*
   * =========================================================
   * SCREEN SHARE SUPPORT
   * =========================================================
   *
   * Desktop Chrome / Firefox / Edge:
   * usually true.
   *
   * iPhone / iOS browsers:
   * usually false.
   */

  const [screenShareSupported, setScreenShareSupported] = useState(true);

  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getDisplayMedia);

    setScreenShareSupported(supported);
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#08060c]">
      {/* ================================================= */}
      {/* VIDEO AREA                                       */}
      {/* ================================================= */}

      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          {/* ================================================= */}
          {/* PARTNER VIDEO                                    */}
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
          {/* EMPTY STATE                                      */}
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

                  <p className="mt-2 max-w-sm text-sm text-white/40">
                    Turn on your camera or share your screen.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* SCREEN SHARE BADGE                               */}
          {/* ================================================= */}

          {sharing && (
            <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-xl">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
              Sharing screen
            </div>
          )}

          {/* ================================================= */}
          {/* LOCAL CAMERA PREVIEW                             */}
          {/* ================================================= */}

          <CameraPreview enabled={cameraOn} stream={localStream} />
        </div>
      </div>

      {/* ================================================= */}
      {/* CONTROLS                                         */}
      {/* ================================================= */}

      <div className="relative z-40 shrink-0 border-t border-white/10 bg-[#0d0910] px-3 py-3 sm:px-4">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {/* ================================================= */}
          {/* CAMERA                                           */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={onToggleCamera}
            title={cameraOn ? "Turn camera off" : "Turn camera on"}
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            className={`flex h-12 min-w-12 touch-manipulation items-center justify-center rounded-xl px-3 transition-all active:scale-95 ${
              cameraOn
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                : "bg-white/[0.07] text-white/80 hover:bg-white/10"
            }`}
          >
            <span className="text-lg">{cameraOn ? "📹" : "🚫"}</span>
          </button>

          {/* ================================================= */}
          {/* MICROPHONE                                       */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={onToggleMicrophone}
            title={micOn ? "Mute microphone" : "Turn microphone on"}
            aria-label={micOn ? "Mute microphone" : "Turn microphone on"}
            className={`flex h-12 min-w-12 touch-manipulation items-center justify-center rounded-xl px-3 transition-all active:scale-95 ${
              micOn
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                : "bg-white/[0.07] text-white/80 hover:bg-white/10"
            }`}
          >
            <span className="text-lg">{micOn ? "🎤" : "🔇"}</span>
          </button>

          {/* ================================================= */}
          {/* SCREEN SHARE                                     */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={screenShareSupported ? onShareScreen : undefined}
            disabled={!screenShareSupported}
            title={
              !screenShareSupported
                ? "Screen sharing is not supported on this browser"
                : sharing
                  ? "Stop sharing"
                  : "Share screen"
            }
            aria-label={
              !screenShareSupported
                ? "Screen sharing unavailable"
                : sharing
                  ? "Stop sharing"
                  : "Share screen"
            }
            className={`flex h-12 min-w-12 touch-manipulation items-center justify-center rounded-xl px-3 transition-all ${
              !screenShareSupported
                ? "cursor-not-allowed bg-white/[0.03] text-white/20"
                : sharing
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400 active:scale-95"
                  : "bg-white/[0.07] text-white/80 hover:bg-white/10 active:scale-95"
            }`}
          >
            <span className="text-lg">🖥️</span>
          </button>

          {/* ================================================= */}
          {/* LOVE                                             */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={onSendLove}
            title="Send love"
            aria-label="Send love"
            className="flex h-12 min-w-12 touch-manipulation items-center justify-center rounded-xl bg-pink-500/10 px-3 text-xl transition-all hover:scale-105 hover:bg-pink-500/20 active:scale-95"
          >
            ❤️
          </button>
        </div>

        {/* ================================================= */}
        {/* STATUS                                           */}
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

        {/* ================================================= */}
        {/* MOBILE / IOS SCREEN SHARE MESSAGE                 */}
        {/* ================================================= */}

        {!screenShareSupported && (
          <p className="mx-auto mt-2 max-w-sm px-4 text-center text-[10px] leading-relaxed text-white/30">
            Screen sharing isn&apos;t available in this browser. You can still
            use camera, microphone, chat and watch your partner&apos;s shared
            screen.
          </p>
        )}
      </div>
    </section>
  );
}
