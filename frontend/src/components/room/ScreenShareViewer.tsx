'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Monitor, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScreenShareViewer({
  stream,
  presenterName,
}: {
  stream: MediaStream;
  presenterName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hidden, setHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    return () => {
      if (v) v.srcObject = null;
    };
  }, [stream]);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-bg-card/95 px-3 py-2 text-xs text-accent-cyan shadow-xl backdrop-blur-xl hover:bg-accent-cyan/10"
      >
        <Monitor className="h-3.5 w-3.5" />
        Show {presenterName}'s screen
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        'fixed z-40 overflow-hidden rounded-xl border border-white/10 bg-bg-card/95 shadow-2xl backdrop-blur-xl',
        expanded
          ? 'inset-4 md:inset-12'
          : 'bottom-4 right-4 w-[360px] max-w-[calc(100vw-2rem)]'
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Monitor className="h-3.5 w-3.5 shrink-0 text-accent-cyan" />
          <span className="truncate text-[11px] font-medium text-zinc-100">
            {presenterName}
            <span className="ml-1 text-zinc-500">is sharing</span>
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            title={expanded ? 'Shrink' : 'Expand'}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setHidden(true)}
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            title="Hide"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted // remote screen audio comes through the audio peer connection, not video
        className={cn(
          'block w-full bg-black',
          expanded ? 'h-[calc(100%-2rem)] object-contain' : 'aspect-video object-contain'
        )}
      />
    </motion.div>
  );
}
