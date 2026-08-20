"use client";

import { useEffect, useRef } from "react";

interface CameraPreviewProps {
  enabled: boolean;

  stream: MediaStream | null;
}

export default function CameraPreview({ enabled, stream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!enabled || !stream) {
      video.srcObject = null;

      return;
    }

    video.srcObject = stream;

    void video.play().catch(() => {
      // Ignore autoplay issue.
    });

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [enabled, stream]);

  if (!enabled || !stream) {
    return null;
  }

  return (
    <div className="absolute bottom-4 right-4 z-30 w-36 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl shadow-black/60 sm:bottom-5 sm:right-5 sm:w-52">
      <div className="relative aspect-video bg-[#111]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full scale-x-[-1] object-cover"
        />

        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-white backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          You
        </div>
      </div>
    </div>
  );
}
