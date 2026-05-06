'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Globe,
  Loader2,
  LogOut,
  Lock,
  Plus,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/profile/Avatar';
import { ChallengeCard } from '@/components/groups/ChallengeCard';
import { PostChallengeDialog } from '@/components/groups/PostChallengeDialog';
import { RequestMeetDialog } from '@/components/groups/RequestMeetDialog';
import { MeetsList } from '@/components/groups/MeetsList';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import type {
  Challenge,
  GroupDetail,
  LeaderboardRow,
  MeetRequest,
} from '@/types/group';
import { cn } from '@/lib/utils';

type Tab = 'challenges' | 'meets' | 'leaderboard' | 'members';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params?.id;
  const currentUser = useAuth((s) => s.user);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [meets, setMeets] = useState<MeetRequest[]>([]);
  const [tab, setTab] = useState<Tab>('challenges');
  const [postOpen, setPostOpen] = useState(false);
  const [meetTarget, setMeetTarget] = useState<Challenge | null>(null);

  // Fetch group + challenges + leaderboard + meets
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ group: GroupDetail }>(`/groups/${groupId}`, { auth: true }),
      api<{ challenges: Challenge[] }>(`/groups/${groupId}/challenges`, { auth: true }).catch(() => ({ challenges: [] })),
      api<{ leaderboard: LeaderboardRow[] }>(`/groups/${groupId}/leaderboard`, { auth: true }).catch(() => ({ leaderboard: [] })),
      api<{ meets: MeetRequest[] }>(`/groups/${groupId}/meets`, { auth: true }).catch(() => ({ meets: [] })),
    ])
      .then(([g, c, l, m]) => {
        if (cancelled) return;
        setGroup(g.group);
        setChallenges(c.challenges);
        setLeaderboard(l.leaderboard);
        setMeets(m.meets);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Periodic refresh of challenges so countdowns transition to "expired" on the server too
  useEffect(() => {
    if (!groupId || !group?.isMember) return;
    const id = setInterval(() => {
      api<{ challenges: Challenge[] }>(`/groups/${groupId}/challenges`, { auth: true })
        .then((r) => setChallenges(r.challenges))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [groupId, group?.isMember]);

  const refreshLeaderboard = async () => {
    if (!groupId) return;
    try {
      const r = await api<{ leaderboard: LeaderboardRow[] }>(`/groups/${groupId}/leaderboard`, {
        auth: true,
      });
      setLeaderboard(r.leaderboard);
    } catch {
      // ignore
    }
  };

  const handleLeave = async () => {
    if (!group) return;
    if (!confirm(`Leave "${group.name}"? You'll lose access to its challenges.`)) return;
    try {
      await api(`/groups/${group.id}/leave`, { method: 'POST', auth: true });
      toast.success('Left group');
      router.push('/groups');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not leave');
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    if (!confirm(`Delete "${group.name}"? This deletes all challenges and cannot be undone.`)) return;
    try {
      await api(`/groups/${group.id}`, { method: 'DELETE', auth: true });
      toast.success('Group deleted');
      router.push('/groups');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;
    if (!confirm('Remove this member?')) return;
    try {
      await api(`/groups/${group.id}/members/${memberId}`, {
        method: 'DELETE',
        auth: true,
      });
      setGroup({
        ...group,
        membersList: group.membersList.filter((m) => m.userId !== memberId),
        memberCount: group.memberCount - 1,
      });
      toast.success('Member removed');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not remove');
    }
  };

  const onChallengePosted = (c: Challenge) => {
    setChallenges((prev) => [c, ...prev]);
  };

  const onChallengeUpdate = (c: Challenge) => {
    setChallenges((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    refreshLeaderboard();
  };

  const onChallengeDelete = (id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  };

  const active = useMemo(() => challenges.filter((c) => !c.expired), [challenges]);
  const past = useMemo(() => challenges.filter((c) => c.expired), [challenges]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (error || !group) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-accent-rose" />
          <h2 className="mt-3 font-display text-xl font-semibold">Group unavailable</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <Link href="/groups" className="btn-primary mt-5 inline-flex">
            <ArrowLeft className="h-4 w-4" /> Back to groups
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" /> All groups
        </Link>
      </div>

      <header className="glass mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/20 text-3xl">
              {group.icon}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold leading-tight">{group.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                {group.privacy === 'private' ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                <span>{group.privacy}</span>
                <span>·</span>
                <span>{group.memberCount} members</span>
                {group.isAdmin && (
                  <span className="rounded-full bg-accent-violet/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-violet">
                    You're admin
                  </span>
                )}
              </div>
              {group.description && (
                <p className="mt-2 max-w-2xl text-sm text-zinc-400">{group.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {group.isMember && group.inviteCode && <InviteCodeChip code={group.inviteCode} />}
            {group.isMember && (
              <button onClick={() => setPostOpen(true)} className="btn-primary text-sm">
                <Plus className="h-4 w-4" /> New challenge
              </button>
            )}
            {group.isMember && !group.isAdmin && (
              <button onClick={handleLeave} className="btn-ghost text-sm">
                <LogOut className="h-4 w-4" /> Leave
              </button>
            )}
            {group.isAdmin && (
              <button
                onClick={handleDelete}
                className="btn-ghost text-sm text-accent-rose hover:bg-accent-rose/10"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-white/5 pb-2">
        <TabBtn active={tab === 'challenges'} onClick={() => setTab('challenges')}>
          Challenges
          <span className="ml-1 text-xs text-zinc-500">
            ({active.length} active{past.length > 0 ? ` / ${past.length} past` : ''})
          </span>
        </TabBtn>
        <TabBtn active={tab === 'meets'} onClick={() => setTab('meets')}>
          🤝 Meets
          {meets.filter((m) => m.status === 'pending').length > 0 && (
            <span className="ml-1 rounded-full bg-accent-violet/20 px-1.5 py-0.5 text-[9px] font-bold text-accent-violet">
              {meets.filter((m) => m.status === 'pending').length}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')}>
          <Trophy className="h-4 w-4" /> Leaderboard
        </TabBtn>
        <TabBtn active={tab === 'members'} onClick={() => setTab('members')}>
          <Users className="h-4 w-4" /> Members
          <span className="ml-1 text-xs text-zinc-500">({group.membersList.length})</span>
        </TabBtn>
      </div>

      {tab === 'challenges' && (
        <ChallengesTab
          group={group}
          active={active}
          past={past}
          currentUserId={currentUser?.id}
          onUpdate={onChallengeUpdate}
          onDelete={onChallengeDelete}
          onOpenPost={() => setPostOpen(true)}
          onRequestMeet={(c) => setMeetTarget(c)}
        />
      )}

      {tab === 'meets' && (
        <MeetsList
          meets={meets}
          groupId={group.id}
          currentUserId={currentUser?.id}
          onUpdate={(m) =>
            setMeets((prev) => prev.map((x) => (x.id === m.id ? m : x)))
          }
        />
      )}

      {tab === 'leaderboard' && <LeaderboardTab rows={leaderboard} />}

      {tab === 'members' && (
        <MembersTab
          group={group}
          currentUserId={currentUser?.id}
          onRemove={handleRemoveMember}
        />
      )}

      <PostChallengeDialog
        open={postOpen}
        onClose={() => setPostOpen(false)}
        groupId={group.id}
        onPosted={onChallengePosted}
      />
      <RequestMeetDialog
        open={!!meetTarget}
        onClose={() => setMeetTarget(null)}
        groupId={group.id}
        challenge={meetTarget}
        onCreated={(m) => {
          setMeets((prev) => [m, ...prev]);
          setTab('meets');
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

function InviteCodeChip({ code }: { code: string }) {
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
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
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

function ChallengesTab({
  group,
  active,
  past,
  currentUserId,
  onUpdate,
  onDelete,
  onOpenPost,
  onRequestMeet,
}: {
  group: GroupDetail;
  active: Challenge[];
  past: Challenge[];
  currentUserId?: string;
  onUpdate: (c: Challenge) => void;
  onDelete: (id: string) => void;
  onOpenPost: () => void;
  onRequestMeet: (c: Challenge) => void;
}) {
  if (!group.isMember) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-sm text-zinc-400">Join this group to see and participate in challenges.</p>
      </div>
    );
  }

  if (active.length === 0 && past.length === 0) {
    return (
      <div className="glass p-10 text-center">
        <div className="text-5xl">🏁</div>
        <h3 className="mt-3 font-display text-lg font-semibold">No challenges yet</h3>
        <p className="mt-1 text-sm text-zinc-400">Be the first to post one for the group.</p>
        <button onClick={onOpenPost} className="btn-primary mt-5">
          <Plus className="h-4 w-4" /> Post a challenge
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            🟢 Active ({active.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {active.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                groupId={group.id}
                isAdmin={group.isAdmin}
                currentUserId={currentUserId}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onRequestMeet={onRequestMeet}
              />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            ⏳ Past ({past.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {past.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                groupId={group.id}
                isAdmin={group.isAdmin}
                currentUserId={currentUserId}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onRequestMeet={onRequestMeet}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LeaderboardTab({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass p-10 text-center">
        <Trophy className="mx-auto h-10 w-10 text-zinc-600" />
        <h3 className="mt-3 font-display text-lg font-semibold">No scores yet</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Wait for the first 24h challenge to expire — points are awarded after the timer ends.
        </p>
      </div>
    );
  }
  return (
    <div className="glass overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-3 w-14">Rank</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">Points</th>
            <th className="hidden px-4 py-3 text-right md:table-cell">Attempts</th>
            <th className="px-4 py-3 text-right">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.userId}
              className={cn(
                'border-b border-white/5',
                i === 0 && 'bg-amber-500/5',
                i === 1 && 'bg-zinc-400/[0.04]',
                i === 2 && 'bg-orange-700/[0.06]'
              )}
            >
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 font-mono text-sm tabular-nums">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${r.rank}`}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/profile/${r.username}`}
                  className="flex items-center gap-2.5 hover:text-accent-violet"
                >
                  <Avatar name={r.name} src={r.profilePic || undefined} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="truncate text-xs text-zinc-500">@{r.username}</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-accent-violet">
                {r.points}
              </td>
              <td className="hidden px-4 py-3 text-right font-mono text-xs tabular-nums text-zinc-400 md:table-cell">
                {r.correct}/{r.problemsAttempted}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-zinc-300">
                {r.accuracy}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MembersTab({
  group,
  currentUserId,
  onRemove,
}: {
  group: GroupDetail;
  currentUserId?: string;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {group.membersList.map((m) => (
        <div
          key={m.userId}
          className="glass flex items-center justify-between gap-3 p-4"
        >
          <Link
            href={`/profile/${m.username}`}
            className="flex min-w-0 flex-1 items-center gap-3 hover:text-accent-violet"
          >
            <Avatar name={m.name} src={m.profilePic || undefined} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium text-zinc-100">
                {m.name}
                {m.role === 'admin' && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                    <Crown className="h-3 w-3" /> Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                @{m.username} · {m.level} · {m.xp} XP · joined{' '}
                {new Date(m.joinedAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
          {group.isAdmin && m.role !== 'admin' && m.userId !== currentUserId && (
            <button
              onClick={() => onRemove(m.userId)}
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-accent-rose/10 hover:text-accent-rose"
              title="Remove member"
              aria-label="Remove member"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
