'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Globe,
  LogIn,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';
import { api, ApiError } from '@/lib/api';
import type { Room } from '@/types/room';
import { cn } from '@/lib/utils';

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'plaintext'] as const;
const ICONS = ['ðŸ¤', 'ðŸ§‘â€ðŸ’»', 'ðŸ§ ', 'ðŸš€', 'ðŸ”¥', 'ðŸ“', 'ðŸŽ¯', 'ðŸŒ'];

export default function RoomsListPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ rooms: Room[] }>('/rooms', { auth: true })
      .then((r) => !cancelled && setRooms(r.rooms))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load rooms');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
            <Users className="h-3 w-3" /> Collab Workspace
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">ðŸ¤ Rooms</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time pair-coding with Yjs CRDT. 3 writers, 57 read-only spectators.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setJoinOpen(true)} className="btn-ghost">
            <LogIn className="h-4 w-4" /> Join with code
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New room
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-36 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass p-6">
          <div className="flex items-start gap-2 text-sm text-accent-rose">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r, i) => (
            <RoomCard key={r.id} room={r} index={i} />
          ))}
        </div>
      )}

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(r) => setRooms((prev) => [r, ...prev])}
      />
      <JoinByCodeDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(r) =>
          setRooms((prev) => {
            if (prev.find((x) => x.id === r.id)) {
              return prev.map((x) => (x.id === r.id ? r : x));
            }
            return [r, ...prev];
          })
        }
      />
    </AppShell>
  );
}

function RoomCard({ room, index }: { room: Room; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
    >
      <Link href={`/rooms/${room.id}`} className="glass block p-4 transition hover:border-white/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/20 text-2xl">
              {room.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold leading-tight">{room.name}</h3>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                <RolePill role={room.myRole} isAsker={room.isAsker} />
                <span>Â·</span>
                <span>
                  {room.writerCount}/{room.maxWriters} writers
                </span>
                <span>Â·</span>
                <span>{room.readOnlyCount} viewers</span>
              </div>
            </div>
          </div>
        </div>
        {room.description && (
          <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{room.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono">
            {room.language}
          </span>
          <span>created {room.createdAt ? new Date(room.createdAt).toLocaleDateString() : ''}</span>
        </div>
      </Link>
    </motion.div>
  );
}

function RolePill({ role, isAsker }: { role: Room['myRole']; isAsker: boolean }) {
  if (isAsker) {
    return (
      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
        ASKER
      </span>
    );
  }
  if (role === 'writer') {
    return (
      <span className="rounded-full bg-accent-violet/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-violet">
        WRITER
      </span>
    );
  }
  if (role === 'readonly') {
    return (
      <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
        VIEWER
      </span>
    );
  }
  return null;
}

function EmptyState({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="glass flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
        <Users className="h-7 w-7 text-accent-violet" />
      </div>
      <h3 className="font-display text-2xl font-bold">Pair-code in real time</h3>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Create a room and invite up to 60 people. CRDT-powered editor â€” every keystroke syncs
        instantly. The asker controls who has write access.
      </p>
      <div className="mt-6 flex gap-2">
        <button onClick={onJoin} className="btn-ghost">
          <LogIn className="h-4 w-4" /> Join with code
        </button>
        <button onClick={onCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Create your first room
        </button>
      </div>
    </div>
  );
}

function CreateRoomDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (r: Room) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('ðŸ¤');
  const [language, setLanguage] = useState<string>('javascript');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setIcon('ðŸ¤');
      setLanguage('javascript');
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Room name must be at least 2 chars');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ room: Room }>('/rooms', {
        method: 'POST',
        auth: true,
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          language,
        },
      });
      toast.success(`Created "${r.room.name}"`);
      onCreated(r.room);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not create');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="New collaborative room">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Room icon</label>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition',
                  icon === e
                    ? 'border-accent-violet/60 bg-accent-violet/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Two Sum pair session"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Description <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-base resize-y"
            placeholder="What are you collaborating on?"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Language</label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-medium transition',
                  language === l
                    ? 'border-accent-violet/60 bg-accent-violet/10 text-white'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create room'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function JoinByCodeDialog({
  open,
  onClose,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  onJoined: (r: Room) => void;
}) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setCode('');
  }, [open]);

  const submit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const r = await api<{ room: Room }>('/rooms/join', {
        method: 'POST',
        auth: true,
        body: { inviteCode: trimmed },
      });
      toast.success(`Joined ${r.room.name}`);
      onJoined(r.room);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not join');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Join a room">
      <p className="-mt-2 mb-4 text-sm text-zinc-400">Paste an invite code from the room asker.</p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. 1391D1C6FD"
        className="input-base text-center font-mono uppercase tracking-widest"
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button onClick={submit} disabled={submitting || !code.trim()} className="btn-primary">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
        </button>
      </div>
    </Modal>
  );
}
