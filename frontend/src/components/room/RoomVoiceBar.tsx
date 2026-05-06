'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones,
  Loader2,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Volume2,
} from 'lucide-react';
import { useVoiceMesh, type VoicePeer } from '@/hooks/useVoiceMesh';
import { useAuth } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { ScreenShareViewer } from './ScreenShareViewer';

const PTT_KEY_LABEL = 'Space';

export function RoomVoiceBar({
  roomId,
  selfName,
}: {
  roomId: string;
  selfName: string;
}) {
  const muteByDefault = useAuth((s) => s.user?.preferences.voiceMuteByDefault ?? false);
  const {
    state,
    joinVoice,
    leaveVoice,
    toggleMute,
    setPeerVolume,
    startScreenShare,
    stopScreenShare,
  } = useVoiceMesh(roomId, { muteByDefault, pttKey: 'Space' });

  const inVoice = state.status === 'connected' || state.status === 'connecting';
  const sharingPeers = state.peers.filter((p) => p.screenStream);

  return (
    <>
      <div className="glass overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-accent-violet" />
            <h3 className="font-display text-sm font-semibold">Voice</h3>
            {state.status === 'connected' && (
              <span className="flex items-center gap-1 rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-emerald">
                Live · {state.peers.length + 1}/4
              </span>
            )}
          </div>
          {!inVoice ? (
            <button
              onClick={joinVoice}
              disabled={state.status === 'full'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-emerald/15 px-2.5 py-1 text-xs font-medium text-accent-emerald transition hover:bg-accent-emerald/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic className="h-3.5 w-3.5" />
              Join voice
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition',
                  state.pttActive
                    ? 'bg-accent-emerald/20 text-accent-emerald'
                    : state.muted
                      ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                      : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                )}
                title={state.muted ? 'Unmute' : 'Mute'}
              >
                {state.muted && !state.pttActive ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
                {state.pttActive ? 'Talking' : state.muted ? 'Muted' : 'Live'}
              </button>
              <button
                onClick={state.sharingScreen ? stopScreenShare : startScreenShare}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition',
                  state.sharingScreen
                    ? 'bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                )}
                title={state.sharingScreen ? 'Stop screen share' : 'Share screen'}
              >
                {state.sharingScreen ? (
                  <MonitorOff className="h-3.5 w-3.5" />
                ) : (
                  <MonitorUp className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={leaveVoice}
                className="inline-flex items-center gap-1 rounded-lg bg-accent-rose/15 px-2 py-1 text-xs font-medium text-accent-rose transition hover:bg-accent-rose/25"
                title="Leave voice"
              >
                <PhoneOff className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          {state.status === 'idle' && (
            <p className="text-[11px] text-zinc-500">
              Click <span className="text-accent-emerald">Join voice</span> to talk with others in
              this room. Up to 4 speakers in a P2P mesh.
              {muteByDefault && (
                <>
                  {' '}You'll join muted — hold{' '}
                  <kbd className="rounded border border-white/10 bg-white/5 px-1 text-[10px] font-mono">
                    {PTT_KEY_LABEL}
                  </kbd>{' '}
                  to talk.
                </>
              )}
            </p>
          )}
          {state.status === 'connecting' && (
            <p className="flex items-center gap-2 text-[11px] text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
            </p>
          )}
          {state.status === 'error' && (
            <p className="text-[11px] text-accent-rose">{state.error ?? 'Voice error'}</p>
          )}
          {state.status === 'full' && (
            <p className="text-[11px] text-amber-300">
              Voice mesh is full (max 4). Wait for someone to leave.
            </p>
          )}
          {state.status === 'connected' && (
            <>
              <ul className="space-y-1.5">
                <SpeakerRow
                  name={`${selfName} (you)`}
                  speaking={state.pttActive}
                  muted={state.muted}
                  isSelf
                />
                <AnimatePresence>
                  {state.peers.map((p) => (
                    <motion.div
                      key={p.connId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                    >
                      <RemoteSpeakerRow peer={p} onVolumeChange={setPeerVolume} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ul>
              {muteByDefault && (
                <p className="mt-3 text-[10px] text-zinc-500">
                  Hold{' '}
                  <kbd className="rounded border border-white/10 bg-white/5 px-1 text-[10px] font-mono">
                    {PTT_KEY_LABEL}
                  </kbd>{' '}
                  to talk · click <span className="text-zinc-400">Muted</span> to unmute
                  continuously.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {sharingPeers.map((p) => (
        <ScreenShareViewer
          key={p.connId}
          stream={p.screenStream!}
          presenterName={p.name}
        />
      ))}
    </>
  );
}

function SpeakerRow({
  name,
  speaking,
  muted,
  isSelf,
}: {
  name: string;
  speaking: boolean;
  muted: boolean;
  isSelf?: boolean;
}) {
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 transition',
        speaking
          ? 'border-accent-emerald/40 bg-accent-emerald/5'
          : 'border-white/5 bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'relative flex h-1.5 w-1.5 rounded-full',
            speaking ? 'bg-accent-emerald' : 'bg-zinc-600'
          )}
        >
          {speaking && (
            <motion.span
              animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-accent-emerald"
            />
          )}
        </span>
        <span className="text-xs text-zinc-100">{name}</span>
      </div>
      {muted ? (
        <MicOff className="h-3 w-3 text-amber-300" />
      ) : isSelf ? (
        <Mic className="h-3 w-3 text-accent-emerald" />
      ) : (
        <Volume2 className="h-3 w-3 text-zinc-500" />
      )}
    </li>
  );
}

function RemoteSpeakerRow({
  peer,
  onVolumeChange,
}: {
  peer: VoicePeer;
  onVolumeChange: (connId: string, vol: number) => void;
}) {
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 transition',
        peer.speaking
          ? 'border-accent-emerald/40 bg-accent-emerald/5'
          : 'border-white/5 bg-white/[0.02]'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'relative flex h-1.5 w-1.5 shrink-0 rounded-full',
            peer.speaking ? 'bg-accent-emerald' : 'bg-zinc-600'
          )}
        >
          {peer.speaking && (
            <motion.span
              animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-accent-emerald"
            />
          )}
        </span>
        <span className="truncate text-xs text-zinc-100">{peer.name}</span>
        {peer.screenStream && (
          <span
            className="shrink-0 rounded-full bg-accent-cyan/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-cyan"
            title="Sharing screen"
          >
            Screen
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Volume2 className="h-3 w-3 text-zinc-500" />
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(peer.volume * 100)}
          onChange={(e) => onVolumeChange(peer.connId, Number(e.target.value) / 100)}
          className="voice-volume h-1 w-12 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-violet"
          aria-label={`Volume for ${peer.name}`}
        />
      </div>
    </li>
  );
}
