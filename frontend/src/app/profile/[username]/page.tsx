'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Code2,
  Edit3,
  Flame,
  Github,
  GraduationCap,
  Linkedin,
  Loader2,
  MapPin,
  FileSearch,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Twitter,
  XCircle,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/profile/Avatar';
import { DifficultyArc } from '@/components/profile/DifficultyArc';
import { ActivityHeatmap } from '@/components/profile/ActivityHeatmap';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { api, ApiError } from '@/lib/api';
import type { ProfileResponse, PublicProfile } from '@/types/profile';
import type { Badge } from '@/types/badge';
import { cn } from '@/lib/utils';

const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JS',
  java: 'Java',
  cpp: 'C++',
};

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  tle: 'TLE',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
  mle: 'MLE',
  execution_error: 'Exec Error',
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setLoading(true);
    api<ProfileResponse>(`/profile/${username}`, { auth: true })
      .then((r) => !cancelled && setData(r))
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : 'Failed to load profile';
        setError(msg);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [username]);

  // Once profile loads we know isSelf — for own profile use /badges/me which triggers
  // check-and-award; for others, use the read-only public endpoint.
  useEffect(() => {
    if (!data || !username) return;
    let cancelled = false;
    const url = data.isSelf ? '/badges/me' : `/badges/user/${username}`;
    api<{ badges: Badge[] }>(url, { auth: true })
      .then((r) => !cancelled && setBadges(r.badges))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data?.isSelf, username]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-accent-rose" />
          <h2 className="mt-3 font-display text-xl font-semibold">Profile unavailable</h2>
          <p className="mt-2 text-sm text-zinc-400">{error ?? 'User not found.'}</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary mt-5">
            Back to dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  const { profile, stats, activityCalendar, recentSubmissions, isSelf, isFollowing } = data;
  const trendDelta = stats.recentTrend.solvedThisWeek - stats.recentTrend.solvedLastWeek;

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* SIDEBAR */}
        <ProfileSidebar
          profile={profile}
          isSelf={isSelf}
          isFollowing={isFollowing}
          onFollowChange={(next) => setData((d) => (d ? { ...d, isFollowing: next } : d))}
          badges={badges}
          onEdit={() => setEditOpen(true)}
          onUpdated={(next) => setData((d) => (d ? { ...d, profile: next } : d))}
        />

        {/* MAIN COLUMN */}
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard
              icon={CheckCircle2}
              label="Solved"
              value={String(stats.totalSolved)}
              sub={
                stats.externalSolved > 0
                  ? `${stats.externalSolved} from external · / ${stats.totalProblems}`
                  : `/ ${stats.totalProblems} total`
              }
              tint="emerald"
            />
            <StatCard
              icon={Code2}
              label="Submissions"
              value={String(stats.totalSubmissions)}
              sub={`${stats.recentTrend.submissionsThisWeek} this week`}
              tint="violet"
            />
            <StatCard
              icon={Target}
              label="Acceptance"
              value={`${stats.acceptanceRate}%`}
              sub={`${stats.acceptedSubmissions} accepted`}
              tint="cyan"
            />
            <StatCard
              icon={Flame}
              label="Streak"
              value={stats.currentStreak > 0 ? `🔥 ${stats.currentStreak}` : '—'}
              sub={`max ${stats.maxStreak}`}
              tint="amber"
            />
            <StatCard
              icon={Trophy}
              label="XP"
              value={String(profile.xp)}
              sub={profile.level}
              tint="fuchsia"
            />
          </div>

          {/* This week trend */}
          {(stats.recentTrend.solvedThisWeek > 0 || stats.recentTrend.solvedLastWeek > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'glass flex items-center gap-3 p-4',
                trendDelta > 0
                  ? 'border-accent-emerald/20'
                  : trendDelta < 0
                    ? 'border-amber-500/20'
                    : ''
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  trendDelta >= 0
                    ? 'bg-accent-emerald/15 text-accent-emerald'
                    : 'bg-amber-500/15 text-amber-300'
                )}
              >
                {trendDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
              <div className="flex-1 text-sm">
                <span className="font-medium">
                  {stats.recentTrend.solvedThisWeek} solved this week
                </span>
                <span className="text-zinc-500">
                  {' '}— {trendDelta >= 0 ? '+' : ''}{trendDelta} vs last week
                </span>
              </div>
            </motion.div>
          )}

          {/* Difficulty + Goals row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="glass col-span-1 p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Problem solving</h3>
                <Link
                  href="/problems"
                  className="text-xs text-zinc-400 hover:text-accent-violet inline-flex items-center gap-1"
                >
                  Browse <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <DifficultyArc data={stats.byDifficulty} />
            </section>

            <section className="glass p-5">
              <h3 className="font-display text-base font-semibold">At a glance</h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                <Glance icon={Sparkles} label="Active goals" value={String(stats.goalsActive)} />
                <Glance
                  icon={CheckCircle2}
                  label="Goals completed"
                  value={String(stats.goalsCompleted)}
                />
                <Glance
                  icon={Zap}
                  label="Best runtime"
                  value={stats.bestRuntimeMs ? `${stats.bestRuntimeMs}ms` : '—'}
                />
                <Glance icon={Flame} label="Active days" value={`${stats.activeDays} / 365`} />
              </ul>
              {stats.byLanguage.length > 0 && (
                <div className="mt-5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Languages used
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {stats.byLanguage.map((l) => (
                      <span
                        key={l.language}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300"
                      >
                        {LANG_LABEL[l.language] ?? l.language}{' '}
                        <span className="text-zinc-500">{l.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Activity heatmap */}
          <section className="glass p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold">Activity</h3>
                <p className="text-xs text-zinc-500">
                  {stats.activeDays} active day{stats.activeDays === 1 ? '' : 's'} ·{' '}
                  {stats.totalSubmissions} submissions in the last year
                </p>
              </div>
              {stats.externalSubmissions > 0 && (
                <div className="rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1 text-[11px] text-accent-cyan">
                  {stats.externalSubmissions} synced from{' '}
                  {stats.externalPlatforms.map(prettyPlatform).join(' · ')}
                </div>
              )}
            </div>
            <ActivityHeatmap calendar={activityCalendar} />
          </section>

          {/* Achievements */}
          {badges.length > 0 && (
            <section className="glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Achievements</h3>
                <span className="text-xs text-zinc-500">
                  {badges.filter((b) => b.earned).length}/{badges.length} unlocked
                </span>
              </div>
              <BadgeGrid badges={badges} showLocked={isSelf} />
            </section>
          )}

          {/* Recent activity */}
          <section className="glass p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Recent submissions</h3>
              <span className="text-xs text-zinc-500">{recentSubmissions.length} most recent</span>
            </div>
            {recentSubmissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                No submissions yet.{' '}
                <Link href="/problems" className="link-accent">
                  Solve a problem
                </Link>
                .
              </div>
            ) : (
              <ul className="space-y-2">
                {recentSubmissions.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-3',
                      s.status === 'accepted'
                        ? 'border-accent-emerald/30 bg-accent-emerald/5'
                        : 'border-white/10 bg-white/[0.02]'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {s.status === 'accepted' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-emerald" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-accent-rose" />
                      )}
                      <div className="min-w-0">
                        {s.problem ? (
                          <Link
                            href={`/solve/${s.problem.slug}`}
                            className="truncate font-medium text-zinc-100 hover:text-accent-violet"
                          >
                            {s.problem.title}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">(deleted problem)</span>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                          <span>{STATUS_LABEL[s.status] ?? s.status}</span>
                          <span>·</span>
                          <span>{LANG_LABEL[s.language] ?? s.language}</span>
                          {s.problem && (
                            <>
                              <span>·</span>
                              <DifficultyChip difficulty={s.problem.difficulty} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isSelf && s.reviewId && (
                        <Link
                          href="/reviews"
                          className="inline-flex items-center gap-1 rounded-md bg-accent-violet/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-violet transition hover:bg-accent-violet/20"
                          title="AI review available"
                        >
                          <FileSearch className="h-3 w-3" />
                          Review
                        </Link>
                      )}
                      <span className="text-xs text-zinc-500">{timeAgo(s.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onUpdated={(next) => setData((d) => (d ? { ...d, profile: next } : d))}
      />
    </AppShell>
  );
}

function ProfileSidebar({
  profile,
  isSelf,
  isFollowing,
  onFollowChange,
  badges,
  onEdit,
}: {
  profile: PublicProfile;
  isSelf: boolean;
  isFollowing: boolean;
  onFollowChange: (next: boolean) => void;
  badges: Badge[];
  onEdit: () => void;
  onUpdated: (next: PublicProfile) => void;
}) {
  const links: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; href: string }> = [];
  if (profile.socialLinks.github)
    links.push({ icon: Github, label: 'GitHub', href: ensureProto(profile.socialLinks.github) });
  if (profile.socialLinks.linkedin)
    links.push({ icon: Linkedin, label: 'LinkedIn', href: ensureProto(profile.socialLinks.linkedin) });
  if (profile.socialLinks.twitter)
    links.push({ icon: Twitter, label: 'Twitter', href: ensureProto(profile.socialLinks.twitter) });

  return (
    <aside className="glass h-fit p-6">
      <div className="flex flex-col items-center text-center">
        <Avatar name={profile.name} src={profile.profilePic || undefined} size="xl" />
        <h1 className="mt-4 font-display text-2xl font-bold">{profile.name}</h1>
        <p className="text-sm text-zinc-400">@{profile.username}</p>

        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-300">
          <span className="rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-0.5 font-semibold text-accent-violet">
            {profile.level}
          </span>
          <span className="font-mono tabular-nums">{profile.xp.toLocaleString()} XP</span>
        </div>

        {isSelf ? (
          <button onClick={onEdit} className="btn-ghost mt-4 w-full text-sm">
            <Edit3 className="h-4 w-4" /> Edit profile
          </button>
        ) : (
          <FollowButton
            username={profile.username}
            isFollowing={isFollowing}
            onChange={onFollowChange}
          />
        )}
      </div>

      {profile.bio && (
        <p className="mt-5 whitespace-pre-wrap text-sm text-zinc-300">{profile.bio}</p>
      )}

      <ul className="mt-5 space-y-2 text-sm text-zinc-300">
        {profile.location && (
          <SidebarRow icon={MapPin} text={profile.location} />
        )}
        {profile.education && (
          <SidebarRow icon={GraduationCap} text={profile.education} />
        )}
      </ul>

      {links.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {links.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:border-accent-violet/40 hover:text-zinc-100"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </a>
          ))}
        </div>
      )}

      {profile.skills.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Skills
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-xs text-zinc-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {badges.filter((b) => b.earned).length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Recent badges
            </span>
            <span className="text-[10px] text-zinc-500">
              {badges.filter((b) => b.earned).length} earned
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges
              .filter((b) => b.earned)
              .slice(0, 6)
              .map((b, i) => (
                <RecentBadgePill key={b.key} badge={b} glow={i === 0} />
              ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/5 pt-4 text-center">
        <FollowStat label="Followers" value={profile.followersCount} />
        <FollowStat label="Following" value={profile.followingCount} />
      </div>

      <div className="mt-3 text-center text-[10px] text-zinc-500">
        Joined {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      </div>
    </aside>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tint: 'violet' | 'emerald' | 'cyan' | 'amber' | 'fuchsia';
}) {
  const map = {
    violet: 'from-accent-violet/30 to-accent-violet/5 text-accent-violet',
    emerald: 'from-accent-emerald/30 to-accent-emerald/5 text-accent-emerald',
    cyan: 'from-accent-cyan/30 to-accent-cyan/5 text-accent-cyan',
    amber: 'from-amber-500/30 to-amber-500/5 text-amber-300',
    fuchsia: 'from-accent-fuchsia/30 to-accent-fuchsia/5 text-accent-fuchsia',
  } as const;
  return (
    <div className="glass p-4">
      <div
        className={cn(
          'mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br',
          map[tint]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function Glance({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-mono tabular-nums text-zinc-100">{value}</span>
    </li>
  );
}

function FollowStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function RecentBadgePill({ badge, glow }: { badge: Badge; glow: boolean }) {
  return (
    <div
      title={`${badge.name} — ${badge.description}`}
      className={cn(
        'group relative flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition',
        badge.tier === 'platinum' && 'border-cyan-300/40 bg-cyan-300/10',
        badge.tier === 'gold' && 'border-amber-400/40 bg-amber-400/10',
        badge.tier === 'silver' && 'border-zinc-400/30 bg-zinc-400/10',
        badge.tier === 'bronze' && 'border-orange-700/40 bg-orange-700/10'
      )}
    >
      {glow && (
        <motion.span
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.65, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-accent-violet/40 to-accent-fuchsia/30 blur-md"
        />
      )}
      <span className="relative">{badge.icon}</span>
    </div>
  );
}

function SidebarRow({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <li className="flex items-center gap-2 text-zinc-300">
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <span className="truncate">{text}</span>
    </li>
  );
}

function DifficultyChip({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={cn(
        'rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase',
        difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
        difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
      )}
    >
      {difficulty}
    </span>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ensureProto(url: string) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^@/, '')}`;
}

function prettyPlatform(p: string): string {
  const map: Record<string, string> = {
    leetcode: 'LeetCode',
    codeforces: 'Codeforces',
    codechef: 'CodeChef',
    hackerrank: 'HackerRank',
    atcoder: 'AtCoder',
    gfg: 'GFG',
    hackerearth: 'HackerEarth',
  };
  return map[p] ?? p;
}

function FollowButton({
  username,
  isFollowing,
  onChange,
}: {
  username: string;
  isFollowing: boolean;
  onChange: (next: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      if (isFollowing) {
        await api(`/profile/${username}/follow`, { method: 'DELETE', auth: true });
        onChange(false);
      } else {
        await api(`/profile/${username}/follow`, { method: 'POST', auth: true });
        onChange(true);
      }
    } catch (e) {
      // Surface failure but leave UI in sync with server next refresh
      console.warn('follow toggle failed', e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        'mt-4 w-full rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50',
        isFollowing
          ? 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
          : 'bg-accent-violet text-white hover:bg-accent-violet/90'
      )}
    >
      {busy ? 'Saving…' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
