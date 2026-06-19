'use client';

export function RecordingIndicator({ elapsed }: { elapsed: number }) {
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-medium text-red-600">
        Recording • {mins}:{secs}
      </span>
    </div>
  );
}
