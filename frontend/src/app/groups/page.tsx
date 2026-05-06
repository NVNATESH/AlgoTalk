'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Globe,
  Loader2,
  Lock,
  LogIn,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';
import { api, ApiError } from '@/lib/api';
import type { GroupSummary } from '@/types/group';
import { cn } from '@/lib/utils';

type Tab = 'mine' | 'explore';

export default function GroupsPage() {
  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<GroupSummary[]>([]);
  const [pub, setPub] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ groups: GroupSummary[] }>('/groups', { auth: true }),
      api<{ groups: GroupSummary[] }>(
        `/groups/explore${debounced ? `?search=${encodeURIComponent(debounced)}` : ''}`,
        { auth: true }
      ),
    ])
      .then(([m, p]) => {
        if (cancelled) return;
        setMine(m.groups);
        setPub(p.groups);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof ApiError ? e.message : 'Failed to load groups');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const groups = tab === 'mine' ? mine : pub;
  const refresh = (g: GroupSummary) => {
    if (g.isMember) {
      setMine((prev) => {
        if (prev.find((x) => x.id === g.id)) return prev.map((x) => (x.id === g.id ? g : x));
        return [g, ...prev];
      });
    }
    setPub((prev) => prev.map((x) => (x.id === g.id ? g : x)));
  };

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">🏟️ Groups</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Post 24h coding & aptitude challenges. Climb the leaderboard.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setJoinOpen(true)} className="btn-ghost">
            <LogIn className="h-4 w-4" /> Join with code
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New group
          </button>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
        <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')}>
          <Users className="h-4 w-4" /> My groups
          <span className="ml-1 text-xs text-zinc-500">({mine.length})</span>
        </TabBtn>
        <TabBtn active={tab === 'explore'} onClick={() => setTab('explore')}>
          <Globe className="h-4 w-4" /> Explore
        </TabBtn>
        {tab === 'explore' && (
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="input-base pl-9"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-36 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState tab={tab} onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <GroupCard key={g.id} group={g} index={i} onJoined={refresh} />
          ))}
        </div>
      )}

      <CreateGroupDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(g) => {
          setMine((prev) => [g, ...prev.filter((x) => x.id !== g.id)]);
        }}
      />
      <JoinByCodeDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(g) => {
          setMine((prev) => {
            if (prev.find((x) => x.id === g.id)) return prev.map((x) => (x.id === g.id ? g : x));
            return [g, ...prev];
          });
          setTab('mine');
        }}
      />
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
      )}
    >
      {children}
    </button>
  );
}

function GroupCard({
  group,
  index,
  onJoined,
}: {
  group: GroupSummary;
  index: number;
  onJoined: (g: GroupSummary) => void;
}) {
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const r = await api<{ group: GroupSummary }>(`/groups/${group.id}/join`, {
        method: 'POST',
        auth: true,
      });
      onJoined(r.group);
      toast.success(`Joined ${r.group.name}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not join');
    } finally {
      setJoining(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass flex flex-col gap-3 p-4 transition hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/20 text-2xl">
            {group.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold leading-tight">{group.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
              {group.privacy === 'private' ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              <span>{group.privacy}</span>
              <span>·</span>
              <span>
                {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
              </span>
              {group.isAdmin && <span className="rounded-full bg-accent-violet/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-violet">Admin</span>}
            </div>
          </div>
        </div>
      </div>

      {group.description && (
        <p className="line-clamp-2 text-sm text-zinc-400">{group.description}</p>
      )}

      <div className="mt-auto flex items-center gap-2">
        <Link href={`/groups/${group.id}`} className="btn-ghost flex-1 text-xs">
          Open <ChevronRight className="h-3.5 w-3.5" />
        </Link>
        {!group.isMember && group.privacy === 'public' && (
          <button onClick={handleJoin} disabled={joining} className="btn-primary text-xs">
            {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Join'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ tab, onCreate }: { tab: Tab; onCreate: () => void }) {
  return (
    <div className="glass p-10 text-center">
      <div className="text-5xl">🏟️</div>
      <h3 className="mt-3 font-display text-lg font-semibold">
        {tab === 'mine' ? 'You\'re not in any groups yet' : 'No public groups match'}
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        {tab === 'mine'
          ? 'Create one or join a public group to start posting daily challenges.'
          : 'Try a different search, or create your own.'}
      </p>
      <button onClick={onCreate} className="btn-primary mt-5">
        <Plus className="h-4 w-4" /> Create a group
      </button>
    </div>
  );
}

function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (g: GroupSummary) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('👥');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setIcon('👥');
      setPrivacy('public');
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Group name must be at least 2 chars');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ group: GroupSummary }>('/groups', {
        method: 'POST',
        auth: true,
        body: { name: name.trim(), description: description.trim() || undefined, icon, privacy },
      });
      toast.success(`Created "${r.group.name}"`);
      onCreated(r.group);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not create');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="New group">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Group icon</label>
          <div className="flex flex-wrap gap-1.5">
            {['👥', '🧠', '🚀', '🎯', '🔥', '💎', '⚡', '🏆', '🌟', '🦾'].map((e) => (
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
          placeholder="e.g. DSA Daily, FAANG Prep..."
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
            placeholder="What is this group about?"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Privacy</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPrivacy('public')}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                privacy === 'public'
                  ? 'border-accent-violet/60 bg-accent-violet/10 text-white'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              )}
            >
              <Globe className="h-4 w-4" />
              <div>
                <div className="font-medium">Public</div>
                <div className="text-[10px] text-zinc-500">Listed in Explore, anyone can join</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPrivacy('private')}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                privacy === 'private'
                  ? 'border-accent-violet/60 bg-accent-violet/10 text-white'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              )}
            >
              <Lock className="h-4 w-4" />
              <div>
                <div className="font-medium">Private</div>
                <div className="text-[10px] text-zinc-500">Invite-code only</div>
              </div>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Create</>}
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
  onJoined: (g: GroupSummary) => void;
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
      const r = await api<{ group: GroupSummary }>('/groups/join', {
        method: 'POST',
        auth: true,
        body: { inviteCode: trimmed },
      });
      toast.success(`Joined ${r.group.name}`);
      onJoined(r.group);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not join');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Join by invite code">
      <p className="-mt-2 mb-4 text-sm text-zinc-400">
        Paste a code shared by a group admin.
      </p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. 78A0D564"
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
