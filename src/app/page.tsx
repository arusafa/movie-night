"use client";

import { useState } from "react";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");

  function createRoom() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    window.location.href = `/room/${code}`;
  }

  function joinRoom() {
    const code = roomCode.trim().toUpperCase();

    if (!code) return;

    window.location.href = `/room/${code}`;
  }

  return (
    <main className="min-h-screen bg-[#0b0710] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-10">
          <div className="text-6xl mb-5">💕</div>

          <h1 className="text-4xl font-bold tracking-tight">
            Movie Night
          </h1>

          <p className="mt-3 text-white/60 text-lg">
            Watch anything together.
          </p>
        </div>

        <button
          onClick={createRoom}
          className="w-full rounded-xl bg-pink-500 px-6 py-4 font-semibold
                     transition hover:bg-pink-400 active:scale-[0.98]"
        >
          Create a room
        </button>

        <div className="flex items-center gap-4 my-8">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm text-white/40">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="text-left">
          <label className="text-sm text-white/50">
            Room code
          </label>

          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") joinRoom();
            }}
            placeholder="e.g. A7K92X"
            maxLength={6}
            className="mt-2 w-full rounded-xl border border-white/10
                       bg-white/5 px-4 py-4 text-center text-lg
                       tracking-[0.3em] uppercase outline-none
                       focus:border-pink-500"
          />

          <button
            onClick={joinRoom}
            className="mt-3 w-full rounded-xl border border-white/10
                       bg-white/5 px-6 py-4 font-semibold
                       transition hover:bg-white/10 active:scale-[0.98]"
          >
            Join room
          </button>
        </div>

        <p className="mt-10 text-xs text-white/30">
          Private rooms for two ❤️
        </p>
      </div>
    </main>
  );
}