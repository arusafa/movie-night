"use client";

import { useEffect, useState } from "react";

import MovieStage from "./MovieStage";
import ChatPanel from "../ChatPanel";
import IncomingMessagePopup from "../IncomingMessagePopup";

import { useMovieRoom } from "@/hooks/useMovieRoom";

interface MovieRoomProps {
  roomId: string;
}

export default function MovieRoom({ roomId }: MovieRoomProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const room = useMovieRoom({
    roomId,
    enabled: mounted,
  });

  if (!mounted) {
    return <main className="min-h-screen bg-[#08060c]" />;
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#08060c] text-white">
      <IncomingMessagePopup message={room.popupMessage} />

      {/* JOIN NOTIFICATION */}

      {room.joinNotification && (
        <div className="fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-pink-400/20 bg-[#1a101d]/95 px-4 py-3 shadow-2xl shadow-pink-500/20 backdrop-blur-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-xl">
              💕
            </div>

            <div>
              <p className="text-sm font-semibold">My Love has joined</p>

              <p className="mt-0.5 text-xs text-pink-200/60">
                Get the popcorn ready 🍿
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LOVE */}

      {room.loveNotification && (
        <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
          <div className="animate-bounce text-7xl drop-shadow-[0_0_30px_rgba(236,72,153,0.7)] sm:text-8xl">
            ❤️
          </div>
        </div>
      )}

      {/* HEADER */}

      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#08060c] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-xl">
            💕
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-tight sm:text-base">
              Movie Night
            </h1>

            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  room.webRtcConnected
                    ? "bg-green-400"
                    : room.partnerConnected
                      ? "bg-yellow-400"
                      : "bg-white/30"
                }`}
              />

              <p className="truncate text-sm text-white/40 sm:text-xs">
                {room.webRtcConnected
                  ? "Connected"
                  : room.partnerConnected
                    ? "Connecting..."
                    : "Waiting..."}
              </p>
            </div>
          </div>
        </div>

        <div className="ml-3 shrink-0 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
          <span className="font-mono text-sm font-semibold text-pink-400">
            {roomId}
          </span>
        </div>
      </header>

      {/* MOBILE FIRST BODY */}

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* VIDEO */}

        <div className="shrink-0 md:min-h-0 md:min-w-0 md:overflow-hidden">
          <MovieStage
            roomId={roomId}
            partnerConnected={room.partnerConnected}
            remoteVideoAvailable={room.remoteVideoAvailable}
            remoteVideoRef={room.remoteVideoRef}
            micOn={room.micOn}
            cameraOn={room.cameraOn}
            localStream={room.localStream}
            sharing={room.sharing}
            onToggleMicrophone={room.toggleMicrophone}
            onToggleCamera={room.toggleCamera}
            onShareScreen={room.shareScreen}
            onSendLove={room.sendLove}
          />
        </div>

        {/* CHAT */}

        <div className="min-h-0 flex-1 border-t border-white/10 md:border-l md:border-t-0">
          <ChatPanel
            message={room.message}
            setMessage={room.setMessage}
            messages={room.messages}
            onSendMessage={room.sendMessage}
          />
        </div>
      </div>
    </main>
  );
}
