'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/profile/Avatar';
import { Countdown } from './Countdown';
import { api, ApiError } from '@/lib/api';
import type { MeetRequest } from '@/types/group';
import { cn } from '@/lib/utils';

interface Props {
  meets: MeetRequest[];
  groupId: string;
  currentUserId?: string;
  onUpdate: (m: MeetRequest) => void;
}

export function MeetsList({ meets, groupId, currentUserId, onUpdate }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const accept = async (meetId: string) => {
    setBusy(meetId);
    try {
      const r = await api<{ meet: MeetRequest; roomId: string }>(
        `/groups/${groupId}/meets/${meetId}/accept`,
        { method: 'POST', auth: true }
      );
      onUpdate(r.meet);
      toast.success('Meet accepted — opening workspace…');
      router.push(`/rooms/${r.roomId}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Accept failed');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (meetId: string) => {
    if (!confirm('Cancel this meet request?')) return;
    setBusy(meetId);
    try {
      const r = await api<{ meet: MeetRequest }>(
        `/groups/${groupId}/meets/${meetId}/cancel`,
        { method: 'POST', auth: true }
      );
      onUpdate(r.meet);
      toast.success('Cancelled');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Cancel failed');
    } finally {
      setBusy(null);
    }
  };

  if (meets.length === 0) {
    return (
      <div className="glass p-10 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
          <Users className="h-6 w-6 text-accent-violet" />
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold">No meet requests yet</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Stuck on a challenge? Request a pair-coding meet from any active challenge — group
          members will see it here and can accept.
        </p>
      </div>
    );
  }

  const pending = meets.filter((m) => m.status === 'pending');
  const past = meets.filter((m) => m.status !== 'pending');

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            🟢 Open requests · {pending.length}
          </h3>
          <div className="space-y-3">
            {pending.map((m, i) => (
              <MeetCard
                key={m.id}
                meet={m}
                isMine={m.requesterId === currentUserId}
                busy={busy === m.id}
                onAccept={() => accept(m.id)}
                onCancel={() => cancel(m.id)}
                index={i}
              />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            ⏳ Past · {past.length}
          </h3>
          <div className="space-y-2">
            {past.map((m) => (
              <PastMeetCard key={m.id} meet={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MeetCard({
  meet,
  isMine,
  busy,
  onAccept,
  onCancel,
  index,
}: {
  meet: MeetRequest;
  isMine: boolean;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass relative overflow-hidden p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {meet.requester ? (
            <Link href={`/profile/${meet.requester.username}`}>
              <Avatar
                name={meet.requester.name}
                src={meet.requester.profilePic || undefined}
                size="md"
              />
            </Link>
          ) : (
            <Avatar name="?" size="md" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              {meet.requester ? (
                <Link
                  href={`/profile/${meet.requester.username}`}
                  className="font-display text-base font-semibold hover:text-accent-violet"
                >
                  {meet.requester.name}
                  {isMine && <span className="ml-1 text-xs text-zinc-500">(you)</span>}
                </Link>
              ) : (
                <span className="font-medium">Someone</span>
              )}
              <span className="text-sm text-zinc-400">
                wants to pair on{' '}
                <span className="font-semibold text-zinc-100">
                  "{meet.challengeTitle ?? 'a challenge'}"
                </span>
              </span>
            </div>

            {meet.message && (
              <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm italic text-zinc-300">
                "{meet.message}"
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              {meet.preferredTime && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Prefers{' '}
                  {new Date(meet.preferredTime).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Expires{' '}
                <Countdown to={meet.expiresAt} />
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isMine ? (
            <button onClick={onCancel} disabled={busy} className="btn-ghost text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Cancel
            </button>
          ) : (
            <button onClick={onAccept} disabled={busy} className="btn-primary text-xs">
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Accepting…
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Accept & open
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PastMeetCard({ meet }: { meet: MeetRequest }) {
  const isAccepted = meet.status === 'accepted' && !!meet.roomId;
  return (
    <div
      className={cn(
        'glass flex items-center justify-between gap-3 p-3 text-sm',
        isAccepted && 'border-accent-emerald/20'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {meet.requester ? (
          <Avatar name={meet.requester.name} src={meet.requester.profilePic || undefined} size="sm" />
        ) : (
          <Avatar name="?" size="sm" />
        )}
        <div className="min-w-0">
          <div className="truncate text-zinc-200">
            {meet.requester?.name ?? 'Someone'} ·{' '}
            <span className="text-zinc-500">"{meet.challengeTitle ?? '—'}"</span>
          </div>
          <div className="text-[10px] text-zinc-500">
            <StatusPill status={meet.status} />
            {meet.acceptor && (
              <span className="ml-2">accepted by {meet.acceptor.name}</span>
            )}
          </div>
        </div>
      </div>
      {isAccepted && meet.roomId && (
        <Link
          href={`/rooms/${meet.roomId}`}
          className="btn-ghost shrink-0 text-xs"
          title="Open the workspace"
        >
          <ExternalLink className="h-3 w-3" /> Open room
        </Link>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: MeetRequest['status'] }) {
  const cls =
    status === 'accepted'
      ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
      : status === 'cancelled'
        ? 'border-white/10 bg-white/5 text-zinc-500'
        : status === 'expired'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          : 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet';
  return (
    <span
      className={cn(
        'rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
        cls
      )}
    >
      {status}
    </span>
  );
}
