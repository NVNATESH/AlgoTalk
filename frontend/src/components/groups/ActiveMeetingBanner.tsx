'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LogIn, Pin, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Avatar } from '@/components/profile/Avatar';
import type { ActiveMeeting } from '@/types/group';

interface Props {
  groupId: string;
  meeting: ActiveMeeting;
  isAdmin: boolean;
  onEnded: () => void;
}

/**
 * Discord/Slack-style pinned banner for the single active meeting in a group.
 * Renders at the top of the group detail page above the tab strip.
 */
export function ActiveMeetingBanner({ groupId, meeting, isAdmin, onEnded }: Props) {
  const [ending, setEnding] = useState(false);

  const elapsed = Math.max(
    0,
    Math.round((Date.now() - new Date(meeting.createdAt).getTime()) / 60_000)
  );

  const handleEnd = async () => {
    if (!confirm('End this meeting? Everyone will lose live editing access.')) return;
    setEnding(true);
    try {
      await api(`/groups/${groupId}/active-meeting/end`, { method: 'POST', auth: true });
      toast.success('Meeting ended');
      onEnded();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not end meeting');
    } finally {
      setEnding(false);
    }
  };

  const previewParticipants = meeting.participants.slice(0, 4);
  const overflow = Math.max(0, meeting.participantCount - previewParticipants.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-5 overflow-hidden rounded-2xl border border-accent-emerald/30 bg-gradient-to-r from-accent-emerald/10 via-accent-emerald/5 to-transparent p-4 shadow-lg"
    >
      <div className="absolute -left-2 top-1/2 h-12 w-1 -translate-y-1/2 rounded-r-full bg-accent-emerald" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-emerald/20 text-xl">
            {meeting.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-emerald">
              <Pin className="h-3 w-3" />
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-emerald opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-emerald" />
              </span>
              Live meeting · {elapsed}m
            </div>
            <div className="font-display text-sm font-semibold text-zinc-100">{meeting.name}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
              <Users className="h-3 w-3" /> {meeting.participantCount} in the room
              {previewParticipants.length > 0 && (
                <div className="flex -space-x-1.5">
                  {previewParticipants.map((p) => (
                    <Avatar
                      key={p.userId}
                      name={p.name}
                      src={p.profilePic || undefined}
                      size="xs"
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-bg bg-white/10 text-[9px] text-zinc-300">
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/rooms/${meeting.roomId}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-emerald px-3 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-accent-emerald/90"
          >
            <LogIn className="h-3.5 w-3.5" /> Join meeting
          </Link>
          {isAdmin && (
            <button
              onClick={handleEnd}
              disabled={ending}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:border-accent-rose/40 hover:bg-accent-rose/10 hover:text-accent-rose disabled:opacity-50"
            >
              <X className="mr-1 inline h-3.5 w-3.5" /> End
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
