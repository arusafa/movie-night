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

    void video.play().catch(() => {});

    return () => {
      video.srcObject = null;
    };
  }, [enabled, stream]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="absolute bottom-3 left-3 z-30 w-[30%] min-w-[105px] max-w-[180px] overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl shadow-black/60 sm:bottom-4 sm:left-4 sm:max-w-[210px]">
      <div className="relative aspect-video bg-[#111]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full scale-x-[-1] object-cover"
        />

        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 rounded-full bg-black/75 px-2 py-1 text-[9px] text-white backdrop-blur-md sm:bottom-2 sm:left-2 sm:px-2.5 sm:text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          You
        </div>
      </div>
    </div>
  );
}
