"use client";

interface IncomingMessagePopupProps {
  message:
    | string
    | null;
}

export default function IncomingMessagePopup({
  message,
}: IncomingMessagePopupProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[70] flex justify-center px-4">
      <div className="w-full max-w-md animate-[slideDown_0.35s_ease-out] rounded-2xl border border-pink-400/20 bg-[#1a101d]/95 p-5 shadow-2xl shadow-pink-500/20 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-xl">
            💬
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-pink-300">
                My Love
              </p>

              <span className="h-1 w-1 rounded-full bg-white/30" />

              <p className="text-xs text-white/30">
                now
              </p>
            </div>

            <p className="mt-1 break-words text-base leading-relaxed text-white">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}