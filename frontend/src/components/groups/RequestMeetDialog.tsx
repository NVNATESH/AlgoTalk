'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';
import { api, ApiError } from '@/lib/api';
import type { Challenge, MeetRequest } from '@/types/group';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  challenge: Challenge | null;
  onCreated: (m: MeetRequest) => void;
}

export function RequestMeetDialog({ open, onClose, groupId, challenge, onCreated }: Props) {
  const [preferredTime, setPreferredTime] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPreferredTime('');
      setMessage('');
    }
  }, [open]);

  const submit = async () => {
    if (!challenge) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { challengeId: challenge.id };
      if (preferredTime) {
        const iso = new Date(preferredTime).toISOString();
        body.preferredTime = iso;
      }
      if (message.trim()) body.message = message.trim();
      const r = await api<{ meet: MeetRequest }>(`/groups/${groupId}/meets`, {
        method: 'POST',
        auth: true,
        body,
      });
      toast.success('Meet requested — group members will see it.');
      onCreated(r.meet);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!challenge) return null;

  return (
    <Modal open={open} onClose={onClose} size="md" title="🤝 Request a meet">
      <p className="-mt-2 mb-4 text-sm text-zinc-400">
        Want help on <span className="font-medium text-zinc-200">"{challenge.title}"</span>? Send a meet
        request — any group member can accept and you'll be dropped into a fresh collab workspace.
      </p>

      <div className="space-y-4">
        <Field
          label="Preferred time (optional)"
          type="datetime-local"
          value={preferredTime}
          onChange={(e) => setPreferredTime(e.target.value)}
          hint="Leave empty if you're free anytime in the next 24 hours."
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Message <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="input-base resize-y"
            placeholder="What you've tried, what you're stuck on, anything specific you want help with..."
            maxLength={500}
          />
          <div className="mt-1 text-right text-[10px] text-zinc-500">{message.length}/500</div>
        </div>
        <div className="rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-3 text-xs">
          <div className="flex items-center gap-1.5 text-accent-violet">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold">When accepted:</span>
          </div>
          <p className="mt-1 text-zinc-300">
            A new collab room is created with both of you as writers (3-slot RBAC). The challenge
            description is loaded as starter content.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3 border-t border-white/5 pt-4">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button onClick={submit} disabled={submitting} className="btn-primary">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request meet'}
        </button>
      </div>
    </Modal>
  );
}
