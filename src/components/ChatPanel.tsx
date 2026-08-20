"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "me" | "partner";
  timestamp?: number;
}

interface ChatPanelProps {
  message: string;
  setMessage: (value: string) => void;
  messages: ChatMessage[];
  onSendMessage: () => void;
}

const QUICK_REACTIONS = ["❤️", "🥰", "😂", "😭", "🍿", "😘"];

export default function ChatPanel({
  message,
  setMessage,
  messages,
  onSendMessage,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [showReactions, setShowReactions] = useState(false);

  /*
   * Keep the newest message visible.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /*
   * Enter sends.
   *
   * Shift + Enter creates a new line.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (message.trim()) {
        onSendMessage();
      }
    }
  }

  /*
   * Add an emoji without closing the keyboard.
   */
  function addReaction(emoji: string) {
    setMessage(`${message}${emoji}`);
    setShowReactions(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function formatTime(timestamp?: number) {
    if (!timestamp) {
      return "";
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
  }

  return (
    <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#0b0910] lg:border-l lg:border-t-0">
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      {/* ================================================= */}
      {/* MESSAGES                                          */}
      {/* ================================================= */}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <div className="max-w-[230px] text-center">
              <div className="mt-5 flex justify-center gap-2">
                {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addReaction(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-lg transition hover:scale-110 hover:bg-white/10"
                    aria-label={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((chatMessage, index) => {
              const isMine = chatMessage.sender === "me";

              const previous = messages[index - 1];

              const sameSender = previous?.sender === chatMessage.sender;

              return (
                <div
                  key={chatMessage.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[90%] items-end gap-2 ${
                      isMine ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* AVATAR */}

                    {!sameSender ? (
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                          isMine ? "bg-pink-500/20" : "bg-white/10"
                        }`}
                      >
                        {isMine ? "💗" : "🥰"}
                      </div>
                    ) : (
                      <div className="w-7 shrink-0" />
                    )}

                    {/* MESSAGE */}

                    <div>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-5 ${
                          isMine
                            ? "rounded-br-md bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/10"
                            : "rounded-bl-md border border-white/10 bg-white/[0.07] text-white/90"
                        }`}
                      >
                        {chatMessage.text}
                      </div>

                      {chatMessage.timestamp && (
                        <div
                          className={`mt-1 px-1 text-[10px] text-white/20 ${
                            isMine ? "text-right" : "text-left"
                          }`}
                        >
                          {formatTime(chatMessage.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* COMPOSER                                          */}
      {/* ================================================= */}

      <div className="shrink-0 border-t border-white/10 p-4">
        {/* EMOJI PICKER */}

        {showReactions && (
          <div className="mb-3 flex items-center gap-1 rounded-2xl border border-white/10 bg-[#15121a] p-2 shadow-xl">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addReaction(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:scale-110 hover:bg-white/10"
                aria-label={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition focus-within:border-pink-500/40 focus-within:bg-white/[0.06]">
          {/* EMOJI */}

          <button
            type="button"
            onClick={() => setShowReactions((value) => !value)}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Add emoji"
          >
            ☺
          </button>

          {/* INPUT */}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Say something..."
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-white outline-none placeholder:text-white/25"
          />

          {/* SEND */}

          <button
            type="button"
            onClick={onSendMessage}
            disabled={!message.trim()}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Send message"
          >
            ↑
          </button>
        </div>

        <p className="mt-2 px-1 text-[10px] text-white/20">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </aside>
  );
}
