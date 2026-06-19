'use client';
import type { RefObject } from 'react';

export function VideoPanel({ videoRef }: { videoRef: RefObject<HTMLVideoElement> }) {
  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-3 left-3 right-3 bg-black/60 rounded-md px-3 py-2">
        <p className="text-white text-sm font-medium">AI Agent</p>
        <p className="text-gray-300 text-xs">Listening…</p>
      </div>
    </div>
  );
}
