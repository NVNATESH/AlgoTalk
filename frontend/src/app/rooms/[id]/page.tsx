'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Loader2,
  LogOut,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/profile/Avatar';
import type { AwarenessUser, ConnectionStatus } from '@/components/room/RoomCollabEditor';
import { useAuth } from '@/stores/authStore';

// y-websocket touches `window` at module load — force client-only.
const RoomCollabEditor = dynamic(
  () => import('@/components/room/RoomCollabEditor').then((m) => m.RoomCollabEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Loading editor…
      </div>
    ),
  }
);
import { api, ApiError } from '@/lib/api';
import type { Room, RoomParticipant } from '@/types/room';
import { cn } from '@/lib/utils';
import { RoomVoiceBar } from '@/components/room/RoomVoiceBar';

export default function RoomWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params?.id;
  const user = useAuth((s) => s.user);

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false, syncing: false });
  const [presence, setPresence] = useState<AwarenessUser[]>([]);

  const refreshRoom = async () => {
    if (!roomId) return;
    try {
      const out = await api<{ room: Room & { membersList?: RoomParticipant[] }; participants?: RoomParticipant[] }>(
        `/rooms/${roomId}/participants`,
        { auth: true }
      );
      setRoom(out.room);
      setParticipants(out.participants ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ room: Room }>(`/rooms/${roomId}`, { auth: true }),
      api<{ participants: RoomParticipant[]; room: Room }>(
        `/rooms/${roomId}/participants`,
        { auth: true }
      ).catch(() => null),
    ])
      .then(([roomRes, partRes]) => {
        if (cancelled) return;
        setRoom(roomRes.room);
        if (partRes) setParticipants(partRes.participants);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load room');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const handleLeave = async () => {
    if (!room) return;
    if (!confirm(`Leave "${room.name}"?`)) return;
    try {
      await api(`/rooms/${room.id}/leave`, { method: 'POST', auth: true });
      toast.success('Left room');
      router.push('/rooms');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not leave');
    }
  };

  const handleDelete = async () => {
    if (!room) return;
    if (!confirm(`Delete "${room.name}"? Everyone gets disconnected.`)) return;
    try {
      await api(`/rooms/${room.id}`, { method: 'DELETE', auth: true });
      toast.success('Room deleted');
      router.push('/rooms');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const handleEndMeeting = async () => {
    if (!room?.groupId) return;
    if (!confirm('End this meeting? The workspace stays but no one can rejoin.')) return;
    try {
      await api(`/groups/${room.groupId}/end-meeting`, { method: 'POST', auth: true });
      toast.success('Meeting ended');
      router.push(`/groups/${room.groupId}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not end meeting');
    }
  };

  const handleGrant = async (targetUserId: string) => {
    if (!room) return;
    try {
      const r = await api<{ room: Room }>(`/rooms/${room.id}/grant-write`, {
        method: 'POST',
        auth: true,
        body: { userId: targetUserId },
      });
      setRoom(r.room);
      toast.success('Write access granted');
      void refreshRoom();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Grant failed');
    }
  };

  const handleRevoke = async (targetUserId: string) => {
    if (!room) return;
    try {
      const r = await api<{ room: Room }>(`/rooms/${room.id}/revoke-write`, {
        method: 'POST',
        auth: true,
        body: { userId: targetUserId },
      });
      setRoom(r.room);
      toast.success('Write access revoked');
      void refreshRoom();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Revoke failed');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (error || !room) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-accent-rose" />
          <h2 className="mt-3 font-display text-xl font-semibold">Room unavailable</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {error ?? "You may not be a member yet — try the invite code."}
          </p>
          <Link href="/rooms" className="btn-primary mt-5 inline-flex">
            <ArrowLeft className="h-4 w-4" /> Back to rooms
          </Link>
        </div>
      </AppShell>
    );
  }

  const myRole = room.myRole;
  if (!myRole) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 font-display text-xl font-semibold">Not a member</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Ask the room owner for an invite code, then use "Join with code" on the rooms page.
          </p>
          <Link href="/rooms" className="btn-primary mt-5 inline-flex">
            <ArrowLeft className="h-4 w-4" /> Back to rooms
          </Link>
        </div>
      </AppShell>
    );
  }

  const canEdit = myRole === 'asker' || myRole === 'writer';

  return (
    <AppShell>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/rooms" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> All rooms
        </Link>
        <ConnectionPill status={status} />
      </div>

      <header className="glass mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/20 text-2xl">
              {room.icon}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold leading-tight">{room.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <RolePill role={myRole} />
                <span>·</span>
                <span>
                  {room.writerCount}/{room.maxWriters} writers
                </span>
                <span>·</span>
                <span>
                  {room.readOnlyCount}/{room.maxReadOnly} viewers
                </span>
                <span>·</span>
                <span className="font-mono">{room.language}</span>
              </div>
              {room.description && (
                <p className="mt-2 max-w-2xl text-sm text-zinc-400">{room.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {room.inviteCode && <InviteChip code={room.inviteCode} />}
            {!room.isAsker && (
              <button onClick={handleLeave} className="btn-ghost text-sm">
                <LogOut className="h-4 w-4" /> Leave
              </button>
            )}
            {room.isAsker && (
              <button
                onClick={handleDelete}
                className="btn-ghost text-sm text-accent-rose hover:bg-accent-rose/10"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            {room.groupId && (
              <button
                onClick={handleEndMeeting}
                className="btn-ghost text-sm text-amber-300 hover:bg-amber-500/10"
              >
                <LogOut className="h-4 w-4" /> End Meeting
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
        {/* Editor */}
        <section className="glass flex h-[640px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Whiteboard
              </span>
              {!canEdit && (
                <span className="flex items-center gap-1 rounded-full bg-zinc-700/30 px-2 py-0.5 text-[10px] text-zinc-400">
                  <Lock className="h-3 w-3" /> Read-only
                </span>
              )}
              {canEdit && (
                <span className="flex items-center gap-1 rounded-full bg-accent-violet/15 px-2 py-0.5 text-[10px] text-accent-violet">
                  <Pencil className="h-3 w-3" /> You can edit
                </span>
              )}
            </div>
            <PresenceStrip presence={presence} />
          </div>
          <div className="min-h-0 flex-1">
            {user ? (
              <RoomCollabEditor
                roomId={room.id}
                language={room.language}
                readOnly={!canEdit}
                initialContent={room.initialContent ?? ''}
                user={{ id: user.id, name: user.name, username: user.username }}
                onStatusChange={setStatus}
                onAwarenessChange={setPresence}
              />
            ) : null}
          </div>
        </section>

        {/* Side panel */}
        <aside className="space-y-3">
          {user && <RoomVoiceBar roomId={room.id} selfName={user.name} />}
          <ParticipantList
            participants={participants}
            askerId={room.asker}
            isAsker={room.isAsker}
            currentUserId={user?.id}
            presence={presence}
            onlineWriterCount={
              presence.filter((p) => {
                const part = participants.find((x) => x.userId === p.userId);
                return part?.role === 'asker' || part?.role === 'writer';
              }).length
            }
            onGrant={handleGrant}
            onRevoke={handleRevoke}
            canGrant={room.writerCount < room.maxWriters}
          />
        </aside>
      </div>
    </AppShell>
  );
}

function ConnectionPill({ status }: { status: ConnectionStatus }) {
  if (!status.connected) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
        <WifiOff className="h-3 w-3" /> Connecting…
      </span>
    );
  }
  if (status.syncing) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-1 text-[11px] text-accent-violet">
        <Loader2 className="h-3 w-3 animate-spin" /> Syncing
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-2.5 py-1 text-[11px] text-accent-emerald">
      <Wifi className="h-3 w-3" /> Live
    </span>
  );
}

function RolePill({ role }: { role: 'asker' | 'writer' | 'readonly' }) {
  const cls =
    role === 'asker'
      ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
      : role === 'writer'
        ? 'border-accent-violet/30 bg-accent-violet/15 text-accent-violet'
        : 'border-white/10 bg-white/5 text-zinc-400';
  const label = role === 'asker' ? 'Asker' : role === 'writer' ? 'Writer' : 'Viewer';
  return (
    <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', cls)}>
      {label}
    </span>
  );
}

function InviteChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Invite code copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
      title="Copy invite code"
    >
      <span className="text-zinc-500">Invite:</span>
      <span className="font-mono font-semibold tracking-wider text-zinc-100">{code}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-accent-emerald" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-zinc-400" />
      )}
    </button>
  );
}

function PresenceStrip({ presence }: { presence: AwarenessUser[] }) {
  if (presence.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        <AnimatePresence>
          {presence.slice(0, 6).map((p) => (
            <motion.div
              key={p.clientId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg-elevated text-[10px] font-bold text-white shadow"
              style={{ backgroundColor: p.color }}
              title={p.isSelf ? `${p.name} (you)` : p.name}
            >
              {p.name.charAt(0).toUpperCase()}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <span className="text-[10px] text-zinc-500">
        {presence.length} live
      </span>
    </div>
  );
}

function ParticipantList({
  participants,
  askerId,
  isAsker,
  currentUserId,
  presence,
  onGrant,
  onRevoke,
  canGrant,
}: {
  participants: RoomParticipant[];
  askerId: string;
  isAsker: boolean;
  currentUserId?: string;
  presence: AwarenessUser[];
  onlineWriterCount: number;
  onGrant: (id: string) => void;
  onRevoke: (id: string) => void;
  canGrant: boolean;
}) {
  const onlineByUser = useMemo(
    () => new Map(presence.map((p) => [p.userId, p] as const)),
    [presence]
  );

  const writers = participants.filter((p) => p.role === 'asker' || p.role === 'writer');
  const viewers = participants.filter((p) => p.role === 'readonly');

  return (
    <div className="glass overflow-hidden">
      <div className="border-b border-white/5 px-4 py-3">
        <h3 className="font-display text-sm font-semibold">Participants</h3>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          {participants.length} member{participants.length === 1 ? '' : 's'} · {presence.length} online
        </p>
      </div>

      <div className="max-h-[560px] overflow-y-auto">
        <div className="px-4 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Writers · {writers.length}/3
          </div>
          <ul className="mt-2 space-y-1">
            {writers.map((p) => (
              <ParticipantRow
                key={p.userId}
                participant={p}
                online={!!onlineByUser.get(p.userId)}
                onlineColor={onlineByUser.get(p.userId)?.color}
                isAsker={p.userId === askerId}
                isMe={p.userId === currentUserId}
                actorIsAsker={isAsker}
                onRevoke={p.userId !== askerId ? () => onRevoke(p.userId) : undefined}
              />
            ))}
            {writers.length === 0 && (
              <li className="text-xs text-zinc-500">(none)</li>
            )}
          </ul>
        </div>

        <div className="px-4 pb-3 pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Viewers · {viewers.length}
          </div>
          {viewers.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">(none)</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {viewers.map((p) => (
                <ParticipantRow
                  key={p.userId}
                  participant={p}
                  online={!!onlineByUser.get(p.userId)}
                  onlineColor={onlineByUser.get(p.userId)?.color}
                  isAsker={false}
                  isMe={p.userId === currentUserId}
                  actorIsAsker={isAsker}
                  onGrant={isAsker && canGrant ? () => onGrant(p.userId) : undefined}
                />
              ))}
            </ul>
          )}
          {isAsker && !canGrant && viewers.length > 0 && (
            <p className="mt-2 text-[10px] text-zinc-500">
              Writer slots full — revoke someone to promote a viewer.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant: p,
  online,
  onlineColor,
  isAsker,
  isMe,
  actorIsAsker,
  onGrant,
  onRevoke,
}: {
  participant: RoomParticipant;
  online: boolean;
  onlineColor?: string;
  isAsker: boolean;
  isMe: boolean;
  actorIsAsker: boolean;
  onGrant?: () => void;
  onRevoke?: () => void;
}) {
  return (
    <li className="group flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
      <div className="relative flex min-w-0 items-center gap-2">
        <Avatar name={p.name} src={p.profilePic || undefined} size="sm" />
        {online && (
          <span
            className="absolute bottom-0 right-0 -mr-0.5 -mb-0.5 h-2 w-2 rounded-full ring-2 ring-bg-elevated"
            style={{ backgroundColor: onlineColor ?? '#10b981' }}
            title="Online"
          />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1 truncate text-xs font-medium text-zinc-100">
            <span className="truncate">{p.name}</span>
            {isAsker && <Crown className="h-3 w-3 shrink-0 text-amber-300" />}
            {isMe && <span className="text-[9px] text-zinc-500">(you)</span>}
          </div>
          <div className="truncate text-[10px] text-zinc-500">@{p.username}</div>
        </div>
      </div>
      {actorIsAsker && (onGrant || onRevoke) && !isMe && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {onGrant && (
            <button
              onClick={onGrant}
              className="rounded-md p-1 text-zinc-500 hover:bg-accent-violet/20 hover:text-accent-violet"
              title="Grant write access"
              aria-label="Grant write"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {onRevoke && (
            <button
              onClick={onRevoke}
              className="rounded-md p-1 text-zinc-500 hover:bg-amber-500/20 hover:text-amber-300"
              title="Revoke write access"
              aria-label="Revoke write"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
