'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Copy,
  Download,
  Globe,
  Headphones,
  KeyRound,
  Laptop,
  Loader2,
  Mic,
  Moon,
  Palette,
  Plug,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  Volume2,
  Webhook,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/stores/authStore';
import { api, ApiError, getAccessToken } from '@/lib/api';

interface IntegrationSummary {
  platform: string;
  handle: string;
  isActive: boolean;
  lastSyncAt: string | null;
  submissionCount: number;
}

const PLATFORM_LABEL: Record<string, string> = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  atcoder: 'AtCoder',
  gfg: 'GFG',
  hackerearth: 'HackerEarth',
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, hydrated, updatePreferences, changePassword, deleteAccount } = useAuth();

  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);

  useEffect(() => {
    if (!hydrated || !user) return;
    api<{ integrations: IntegrationSummary[] }>('/integrations', { auth: true })
      .then((r) => setIntegrations(r.integrations))
      .catch(() => {});
  }, [hydrated, user]);

  if (!hydrated || !user) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage how AlgoTalk looks, behaves, and what's connected to your account.
          </p>
        </motion.div>

        <PreferencesCard user={user} updatePreferences={updatePreferences} />

        <VoiceCard user={user} updatePreferences={updatePreferences} />

        <NotificationPrefsCard user={user} updatePreferences={updatePreferences} />

        <IntegrationsCard integrations={integrations} />

        <BrowserExtensionCard />

        <TwoFactorCard />

        <SessionsCard />

        <WebhooksCard />

        <SecurityCard changePassword={changePassword} router={router} />

        <ExportCard username={user.username} />

        <DangerZone deleteAccount={deleteAccount} router={router} />
      </div>
    </AppShell>
  );
}

function PreferencesCard({
  user,
  updatePreferences,
}: {
  user: { preferences: { theme: 'dark' | 'light'; notifications: boolean; soundEffects: boolean } };
  updatePreferences: (p: Partial<{ theme: 'dark' | 'light'; notifications: boolean; soundEffects: boolean }>) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const update = async (field: string, value: any) => {
    setBusy(field);
    try {
      await updatePreferences({ [field]: value });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to update');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader icon={Palette} title="Preferences" subtitle="Look, feel, and notifications." />

      <div className="mt-5 space-y-4">
        <Row
          icon={user.preferences.theme === 'dark' ? Moon : Sun}
          label="Theme"
          hint="Dark mode is the only fully-styled theme right now — light mode is a UI preview."
        >
          <div className="flex rounded-xl border border-white/10 p-1">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                disabled={busy === 'theme'}
                onClick={() => user.preferences.theme !== t && update('theme', t)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition ' +
                  (user.preferences.theme === t
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-zinc-100')
                }
              >
                {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            ))}
          </div>
        </Row>

        <Row icon={Bell} label="Notifications" hint="In-app bell + badges. Doesn't affect email.">
          <Toggle
            checked={user.preferences.notifications}
            disabled={busy === 'notifications'}
            onChange={(v) => update('notifications', v)}
          />
        </Row>

        <Row
          icon={Volume2}
          label="Sound effects"
          hint="UI clicks, notification chimes, focus session start/end."
        >
          <Toggle
            checked={user.preferences.soundEffects}
            disabled={busy === 'soundEffects'}
            onChange={(v) => update('soundEffects', v)}
          />
        </Row>
      </div>
    </section>
  );
}

function VoiceCard({
  user,
  updatePreferences,
}: {
  user: { preferences: { voiceMuteByDefault: boolean } };
  updatePreferences: (p: { voiceMuteByDefault: boolean }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const update = async (value: boolean) => {
    setBusy(true);
    try {
      await updatePreferences({ voiceMuteByDefault: value });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader
        icon={Headphones}
        title="Voice"
        subtitle="Behavior when you join a collab room's voice mesh."
      />
      <div className="mt-5">
        <Row
          icon={Mic}
          label="Push-to-talk mode"
          hint="Join voice muted. Hold Space to talk; release to mute again. Click the mic button to unmute continuously."
        >
          <Toggle
            checked={user.preferences.voiceMuteByDefault}
            disabled={busy}
            onChange={update}
          />
        </Row>
      </div>
    </section>
  );
}

interface NotificationTypeMeta {
  key: string;
  label: string;
  hint: string;
  icon: string;
}

const NOTIFICATION_TYPE_META: NotificationTypeMeta[] = [
  { key: 'badge_earned', label: 'Badge earned', hint: 'When you unlock an achievement.', icon: '🏆' },
  { key: 'goal_completed', label: 'Goal completed', hint: 'When you finish a learning goal.', icon: '🎯' },
  { key: 'goal_module_completed', label: 'Module completed', hint: 'When you finish a module within a goal.', icon: '✅' },
  { key: 'quiz_passed', label: 'Quiz passed', hint: 'When you score ≥70% on a module quiz.', icon: '🧠' },
  { key: 'challenge_posted', label: 'Challenge posted', hint: 'When someone posts a 24h challenge in a group you\'re in.', icon: '📢' },
  { key: 'challenge_won', label: 'Challenge won', hint: 'When you score points on a resolved challenge.', icon: '🏅' },
  { key: 'challenge_resolved', label: 'Challenge resolved', hint: 'Summary when a 24h challenge ends.', icon: '⏰' },
  { key: 'sync_complete', label: 'Sync complete', hint: 'When LeetCode/Codeforces/etc. pulls in new submissions.', icon: '🌐' },
  { key: 'sync_failed', label: 'Sync failed', hint: 'When an external platform sync errors out.', icon: '⚠️' },
  { key: 'group_joined', label: 'Group joined', hint: 'When someone joins a group you admin.', icon: '👥' },
  { key: 'mentor_replied', label: 'Mentor replied', hint: 'AI mentor / system messages and tests.', icon: '🤖' },
  { key: 'contest_started', label: 'Contest started', hint: 'When a contest you registered for begins.', icon: '🏁' },
  { key: 'contest_report_ready', label: 'Contest report ready', hint: 'Post-contest AI analysis is ready to view.', icon: '📊' },
];

function NotificationPrefsCard({
  user,
  updatePreferences,
}: {
  user: { preferences: { notificationPrefs?: Record<string, boolean>; notifications: boolean } };
  updatePreferences: (p: { notificationPrefs: Record<string, boolean> }) => Promise<void>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const masterOff = user.preferences.notifications === false;
  const map = user.preferences.notificationPrefs ?? {};

  const isEnabled = (key: string) =>
    !masterOff && (map[key] === undefined ? true : map[key] === true);

  const update = async (key: string, value: boolean) => {
    setBusyKey(key);
    try {
      await updatePreferences({ notificationPrefs: { [key]: value } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to update');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader
        icon={Bell}
        title="Notification types"
        subtitle="Pick which events ping you. Turning a type off skips both the bell and the slide-in toast."
      />
      {masterOff && (
        <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-200">
          Notifications are off via the master switch above. Re-enable to use these per-type
          toggles.
        </p>
      )}
      <ul className="mt-5 space-y-1.5">
        {NOTIFICATION_TYPE_META.map((m) => (
          <li
            key={m.key}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 text-base leading-none">{m.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{m.label}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">{m.hint}</div>
              </div>
            </div>
            <Toggle
              checked={isEnabled(m.key)}
              disabled={masterOff || busyKey === m.key}
              onChange={(v) => update(m.key, v)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function IntegrationsCard({ integrations }: { integrations: IntegrationSummary[] }) {
  const active = integrations.filter((i) => i.isActive);
  return (
    <section className="glass p-6">
      <SectionHeader
        icon={Globe}
        title="Connected platforms"
        subtitle="External coding profiles that contribute to your AlgoTalk stats."
      />

      <div className="mt-5">
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No platforms connected yet.{' '}
            <Link href="/integrations" className="link-accent">
              Connect LeetCode or Codeforces
            </Link>{' '}
            to merge external solves into your profile and analyzer.
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((i) => (
              <li
                key={i.platform}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">
                    {PLATFORM_LABEL[i.platform] ?? i.platform}{' '}
                    <span className="text-zinc-500">· {i.handle}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {(i.submissionCount ?? 0).toLocaleString()} submissions
                    {i.lastSyncAt && ` · last synced ${timeAgo(i.lastSyncAt)}`}
                  </div>
                </div>
                <Link
                  href="/integrations"
                  className="text-[11px] text-zinc-400 hover:text-accent-violet inline-flex items-center gap-1"
                >
                  Manage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SecurityCard({
  changePassword,
  router,
}: {
  changePassword: (current: string, next: string) => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (next.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      toast.success('Password changed — please log in again');
      router.push('/login');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader icon={KeyRound} title="Account & security" subtitle="Change your password." />

      <form onSubmit={submit} className="mt-5 space-y-3">
        <Field
          label="Current password"
          type="password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          required
        />
        <Field
          label="New password"
          type="password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Field
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
        />
        <p className="text-[11px] text-zinc-500">
          Changing your password signs you out of every session, including this one.
        </p>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Change password
          </button>
        </div>
      </form>
    </section>
  );
}

interface ExtensionTokenSummary {
  id: string;
  label: string;
  tokenPreview: string;
  lastUsedAt: string | null;
  createdAt: string;
}

function BrowserExtensionCard() {
  const [tokens, setTokens] = useState<ExtensionTokenSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; label: string } | null>(null);

  const load = async () => {
    try {
      const r = await api<{ tokens: ExtensionTokenSummary[] }>('/extension/tokens', {
        auth: true,
      });
      setTokens(r.tokens);
    } catch {
      setTokens([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const mint = async () => {
    setBusy(true);
    try {
      const r = await api<{ token: string; label: string; id: string }>('/extension/tokens', {
        method: 'POST',
        auth: true,
        body: { label: 'Browser extension' },
      });
      setNewToken({ token: r.token, label: r.label });
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Mint failed');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this token? The extension paired to it will stop working.')) return;
    try {
      await api(`/extension/tokens/${id}`, { method: 'DELETE', auth: true });
      toast.success('Revoked');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Revoke failed');
    }
  };

  const copyToken = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken.token);
      toast.success('Token copied');
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader
        icon={Plug}
        title="Browser extension"
        subtitle="Pair the AlgoTalk Capture extension to forward your contest verdicts in real time (~1s vs the 60s server-side poll)."
      />
      <div className="mt-5 space-y-3">
        {tokens === null ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading tokens…
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-[11px] text-zinc-500">
            No paired extensions. Mint a token below, then paste it into the extension popup.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="font-mono text-zinc-300">{t.tokenPreview}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-400">{t.label}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    Created {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt && ` · last used ${new Date(t.lastUsedAt).toLocaleString()}`}
                    {!t.lastUsedAt && ' · not used yet'}
                  </div>
                </div>
                <button
                  onClick={() => revoke(t.id)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-accent-rose/10 hover:text-accent-rose"
                  title="Revoke"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button onClick={mint} disabled={busy} className="btn-primary text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Mint pairing token
          </button>
          <a
            href="https://github.com/anthropics/claude-code"
            className="text-[11px] text-zinc-500 hover:text-accent-violet"
          >
            How to install →
          </a>
        </div>
      </div>

      {newToken && (
        <div className="mt-4 rounded-xl border border-accent-emerald/30 bg-accent-emerald/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-emerald/15 text-accent-emerald">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-emerald">
                Token created — copy it now
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                This is the only time you'll see the full token. Paste it into the extension's popup
                under "Pairing token", then save.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-white/10 bg-bg/60 px-2 py-1 font-mono text-[11px] text-zinc-100">
                  {newToken.token}
                </code>
                <button onClick={copyToken} className="btn-ghost text-xs">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  onClick={() => setNewToken(null)}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ExportCard({ username }: { username: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/auth/me/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = 'Failed to export';
        try {
          msg = (JSON.parse(text) as { message?: string }).message ?? msg;
        } catch {
          /* noop */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `learnhub-${username}-${stamp}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader
        icon={Download}
        title="Export your data"
        subtitle="Download a JSON file with everything AlgoTalk has stored about you."
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-sm text-zinc-400">
          Includes profile, submissions, extracted external solves, goals, badges,
          notifications, group memberships, rooms, meets, interview sessions, and
          mentor chat metadata. Limited to one export per hour.
        </div>
        <button
          onClick={download}
          disabled={busy}
          className="btn-primary shrink-0"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download JSON
        </button>
      </div>
    </section>
  );
}

function DangerZone({
  deleteAccount,
  router,
}: {
  deleteAccount: (password: string) => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = confirmText === 'DELETE' && password.length > 0;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await deleteAccount(password);
      toast.success('Account deleted');
      router.push('/login');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to delete account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass border-accent-rose/20 p-6">
      <SectionHeader
        icon={ShieldAlert}
        title="Danger zone"
        subtitle="Permanent actions — these can't be undone."
        tint="rose"
      />

      <div className="mt-5">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-accent-rose/30 bg-accent-rose/5 px-4 py-2 text-sm font-medium text-accent-rose transition hover:bg-accent-rose/10"
          >
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-accent-rose/30 bg-accent-rose/5 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-accent-rose" />
              <div className="text-sm">
                <p className="font-medium text-zinc-100">This is irreversible.</p>
                <p className="mt-1 text-zinc-400">
                  Your profile, follower graph, and account record will be deleted. Your past
                  submissions, badges, and group/room memberships will become orphaned and won't
                  be visible anywhere.
                </p>
              </div>
            </div>

            <Field
              label="Confirm your password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
            <Field
              label='Type "DELETE" to confirm'
              type="text"
              value={confirmText}
              onChange={setConfirmText}
              autoComplete="off"
            />

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDelete}
                disabled={!canSubmit || busy}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-rose px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-rose/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete forever
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setPassword('');
                  setConfirmText('');
                }}
                className="btn-ghost px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TwoFactorCard() {
  const { user, hydrate } = useAuth();
  const enabled = !!user?.twoFactorEnabled;
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const start = async () => {
    setBusy(true);
    try {
      const r = await api<{ secret: string; otpauthUri: string }>('/auth/me/2fa/start', {
        method: 'POST',
        auth: true,
      });
      setSetup(r);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(confirmCode)) {
      toast.error('Enter the 6-digit code from your authenticator');
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ recoveryCodes: string[] }>('/auth/me/2fa/confirm', {
        method: 'POST',
        auth: true,
        body: { code: confirmCode },
      });
      setRecoveryCodes(r.recoveryCodes);
      setSetup(null);
      setConfirmCode('');
      toast.success('Two-factor enabled');
      // Refresh user state so the card flips to "enabled"
      const refreshed = await api<{ user: { twoFactorEnabled: boolean } }>('/auth/me', {
        auth: true,
      }).catch(() => null);
      if (refreshed?.user) useAuth.setState((s) => ({ user: s.user ? { ...s.user, twoFactorEnabled: true } : s.user }));
      void hydrate;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/auth/me/2fa/disable', {
        method: 'POST',
        auth: true,
        body: {
          password: disablePassword,
          code: disableCode || undefined,
        },
      });
      setDisablePassword('');
      setDisableCode('');
      toast.success('Two-factor disabled');
      useAuth.setState((s) => ({ user: s.user ? { ...s.user, twoFactorEnabled: false } : s.user }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Disable failed');
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    const code = prompt('Enter your current 6-digit code to regenerate recovery codes:');
    if (!code || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      const r = await api<{ recoveryCodes: string[] }>('/auth/me/2fa/regenerate-codes', {
        method: 'POST',
        auth: true,
        body: { code },
      });
      setRecoveryCodes(r.recoveryCodes);
      toast.success('Recovery codes regenerated');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Regenerate failed');
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join('\n')).then(
      () => toast.success('Recovery codes copied'),
      () => toast.error('Copy failed')
    );
  };

  return (
    <section className="glass p-6">
      <SectionHeader
        icon={ShieldCheck}
        title="Two-factor authentication"
        subtitle={
          enabled
            ? 'Active. Authenticator code required at every login.'
            : 'Add an authenticator app code on top of your password.'
        }
      />
      <div className="mt-5 space-y-4">
        {!enabled && !setup && (
          <button onClick={start} disabled={busy} className="btn-primary text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Enable 2FA
          </button>
        )}

        {setup && (
          <div className="rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
              Step 1 — Add to your authenticator
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Scan the QR (open the URI on a device with a camera-enabled app), or paste the secret
              into Google Authenticator / 1Password / Authy / Microsoft Authenticator.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
              <a
                href={setup.otpauthUri}
                target="_blank"
                rel="noreferrer"
                className="flex h-[160px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-center text-[11px] text-zinc-400 hover:text-accent-violet"
              >
                Open in authenticator →
              </a>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Secret (manual entry)
                </div>
                <code className="mt-1 block rounded-md border border-white/10 bg-bg/60 px-2 py-1 font-mono text-[11px] text-zinc-100 break-all">
                  {setup.secret}
                </code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(setup.secret).then(
                      () => toast.success('Secret copied'),
                      () => toast.error('Copy failed')
                    )
                  }
                  className="mt-2 text-[11px] text-accent-violet hover:underline"
                >
                  Copy secret
                </button>
              </div>
            </div>

            <form onSubmit={confirm} className="mt-4 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Step 2 — Enter the code
                </span>
                <input
                  inputMode="numeric"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="mt-1 w-32 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center font-mono text-base tracking-[0.3em] text-zinc-100 outline-none transition focus:border-accent-violet/40"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-primary text-xs">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Verify & enable
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetup(null);
                  setConfirmCode('');
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-200"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {recoveryCodes && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Save these recovery codes
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Each works exactly once. Use one if you lose your authenticator. They will not be shown
              again.
            </p>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-white/10 bg-bg/60 p-2 font-mono text-[12px] text-zinc-100">
              {recoveryCodes.join('\n')}
            </pre>
            <div className="mt-2 flex gap-2">
              <button onClick={copyCodes} className="btn-ghost text-xs">
                <Copy className="h-3.5 w-3.5" /> Copy all
              </button>
              <button
                onClick={() => setRecoveryCodes(null)}
                className="text-[11px] text-zinc-500 hover:text-zinc-200"
              >
                I've saved them — dismiss
              </button>
            </div>
          </div>
        )}

        {enabled && !setup && (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-2 text-[12px] text-accent-emerald">
              <ShieldCheck className="h-4 w-4" /> Two-factor is on. You'll be asked for a code on
              every login.
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={regenerate} disabled={busy} className="btn-ghost text-xs">
                Regenerate recovery codes
              </button>
            </div>
            <form
              onSubmit={disable}
              className="mt-2 space-y-2 rounded-xl border border-accent-rose/20 bg-accent-rose/5 p-3"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-rose">
                Disable 2FA
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="block flex-1 min-w-[180px]">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Password
                  </span>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-accent-violet/40"
                  />
                </label>
                <label className="block w-32">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Current code
                  </span>
                  <input
                    inputMode="numeric"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center font-mono text-sm tracking-[0.3em] text-zinc-100 outline-none focus:border-accent-violet/40"
                  />
                </label>
                <button type="submit" disabled={busy || !disablePassword} className="btn-ghost text-xs text-accent-rose hover:bg-accent-rose/10">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Turn off
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

interface SessionRow {
  id: string;
  device: string;
  ip: string;
  active: boolean;
  createdAt: string;
  lastSeenAt: string;
}

function SessionsCard() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await api<{ sessions: SessionRow[] }>('/sessions', { auth: true });
      setSessions(r.sessions);
    } catch {
      setSessions([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const revoke = async (id: string) => {
    if (
      !confirm(
        'Revoke this session? Note: with the current single-token-version scheme this signs you out of every device — same as "revoke all".'
      )
    )
      return;
    setBusy(id);
    try {
      await api(`/sessions/${id}`, { method: 'DELETE', auth: true });
      toast.success('Session revoked. You will need to log in again.');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Revoke failed');
    } finally {
      setBusy(null);
    }
  };

  const revokeAll = async () => {
    if (!confirm('Sign out from all devices including this one?')) return;
    setBusy('all');
    try {
      await api('/sessions/all', { method: 'DELETE', auth: true });
      toast.success('All sessions revoked');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Revoke failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader
        icon={Laptop}
        title="Active sessions"
        subtitle="Logins recorded on your account. Revoking forces a re-login."
      />
      <div className="mt-5 space-y-3">
        {sessions === null ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No active sessions tracked yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-zinc-200">{s.device}</span>
                    {s.active ? (
                      <span className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent-emerald">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                        Stale
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {s.ip || 'unknown ip'} · started {timeAgo(s.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => revoke(s.id)}
                  disabled={busy === s.id}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-accent-rose/10 hover:text-accent-rose disabled:opacity-50"
                  title="Revoke"
                >
                  {busy === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end pt-1">
          <button
            onClick={revokeAll}
            disabled={busy === 'all'}
            className="text-[11px] text-accent-rose hover:underline disabled:opacity-50"
          >
            {busy === 'all' ? 'Signing out…' : 'Sign out everywhere'}
          </button>
        </div>
      </div>
    </section>
  );
}

interface WebhookRow {
  id: string;
  url: string;
  label: string;
  events: string[];
  active: boolean;
  lastDeliveredAt: string | null;
  lastStatus: number | null;
  failureCount: number;
  createdAt: string;
}

interface IncomingTokenRow {
  id: string;
  label: string;
  tokenPreview: string;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

function WebhooksCard() {
  const [hooks, setHooks] = useState<WebhookRow[] | null>(null);
  const [tokens, setTokens] = useState<IncomingTokenRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ secret: string; url: string } | null>(null);
  const [revealedToken, setRevealedToken] = useState<{ token: string } | null>(null);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');

  const loadHooks = async () => {
    try {
      const r = await api<{ webhooks: WebhookRow[] }>('/webhooks', { auth: true });
      setHooks(r.webhooks);
    } catch {
      setHooks([]);
    }
  };

  const loadTokens = async () => {
    try {
      const r = await api<{ tokens: IncomingTokenRow[] }>('/webhooks/incoming-tokens', {
        auth: true,
      });
      setTokens(r.tokens);
    } catch {
      setTokens([]);
    }
  };

  useEffect(() => {
    void loadHooks();
    void loadTokens();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ id: string; url: string; secret: string }>('/webhooks', {
        method: 'POST',
        auth: true,
        body: { url: url.trim(), label: label.trim() || undefined },
      });
      setRevealed({ secret: r.secret, url: r.url });
      setUrl('');
      setLabel('');
      void loadHooks();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api(`/webhooks/${id}`, { method: 'DELETE', auth: true });
      void loadHooks();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const toggle = async (h: WebhookRow) => {
    try {
      await api(`/webhooks/${h.id}`, {
        method: 'PATCH',
        auth: true,
        body: { active: !h.active },
      });
      void loadHooks();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const mintToken = async () => {
    setBusy(true);
    try {
      const r = await api<{ token: string }>('/webhooks/incoming-tokens', {
        method: 'POST',
        auth: true,
        body: { label: 'Incoming token' },
      });
      setRevealedToken({ token: r.token });
      void loadTokens();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Mint failed');
    } finally {
      setBusy(false);
    }
  };

  const revokeToken = async (id: string) => {
    if (!confirm('Revoke this incoming token?')) return;
    try {
      await api(`/webhooks/incoming-tokens/${id}`, { method: 'DELETE', auth: true });
      void loadTokens();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Revoke failed');
    }
  };

  return (
    <section className="glass p-6">
      <SectionHeader
        icon={Webhook}
        title="Webhooks & automation"
        subtitle="Forward your activity to your own scripts, n8n, Make, Discord, or anywhere else."
      />

      <div className="mt-5 space-y-5">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Outgoing webhooks
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            We POST <code className="rounded bg-white/5 px-1">{`{event, data, deliveredAt}`}</code>{' '}
            with an <code className="rounded bg-white/5 px-1">X-AlgoTalk-Signature</code> HMAC-SHA256
            header so your receiver can verify the source.
          </p>

          <div className="mt-3 space-y-1.5">
            {hooks === null ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : hooks.length === 0 ? (
              <p className="text-[11px] text-zinc-500">
                No webhooks yet. Add one below — paste any URL that accepts POST JSON.
              </p>
            ) : (
              hooks.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate text-zinc-200">
                        {h.label || h.url}
                      </span>
                      {h.active ? (
                        <span className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-1.5 py-0.5 text-[10px] text-accent-emerald">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-zinc-500">
                          Paused
                        </span>
                      )}
                      {h.failureCount >= 3 && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                          {h.failureCount} fails
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                      {h.url}
                    </div>
                    <div className="mt-0.5 text-[10px] text-zinc-600">
                      events: {h.events.join(', ')}
                      {h.lastDeliveredAt && ` · last ${timeAgo(h.lastDeliveredAt)}`}
                      {h.lastStatus !== null && ` (${h.lastStatus})`}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggle(h)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      {h.active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => remove(h.id)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-accent-rose/10 hover:text-accent-rose"
                      title="Delete"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={create} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block flex-1 min-w-[200px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Webhook URL
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-accent-violet/40"
              />
            </label>
            <label className="block w-[180px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Label (optional)
              </span>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="My Discord bot"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-accent-violet/40"
              />
            </label>
            <button type="submit" disabled={busy} className="btn-primary text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add webhook
            </button>
          </form>

          {revealed && (
            <div className="mt-3 rounded-xl border border-accent-emerald/30 bg-accent-emerald/5 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-emerald">
                Webhook secret — copy it now
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Use this to verify the HMAC signature on incoming webhook deliveries. We won't show it
                again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-white/10 bg-bg/60 px-2 py-1 font-mono text-[11px] text-zinc-100">
                  {revealed.secret}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(revealed.secret).then(
                      () => toast.success('Copied'),
                      () => toast.error('Copy failed')
                    );
                  }}
                  className="btn-ghost text-xs"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  onClick={() => setRevealed(null)}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/5 pt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Incoming webhook tokens
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            POST to <code className="rounded bg-white/5 px-1">/api/webhooks/incoming/&lt;token&gt;</code>{' '}
            with{' '}
            <code className="rounded bg-white/5 px-1">{`{kind:"submission", problemUrl, status}`}</code>{' '}
            to log activity from your own scripts.
          </p>

          <div className="mt-3 space-y-1.5">
            {tokens === null ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-[11px] text-zinc-500">No tokens yet.</p>
            ) : (
              tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="font-mono text-zinc-300">{t.tokenPreview}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-400">{t.label}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {t.usageCount} call{t.usageCount === 1 ? '' : 's'}
                      {t.lastUsedAt && ` · last used ${timeAgo(t.lastUsedAt)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeToken(t.id)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-accent-rose/10 hover:text-accent-rose"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-3">
            <button onClick={mintToken} disabled={busy} className="btn-primary text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Mint incoming token
            </button>
          </div>

          {revealedToken && (
            <div className="mt-3 rounded-xl border border-accent-emerald/30 bg-accent-emerald/5 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-emerald">
                Incoming token — copy it now
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-white/10 bg-bg/60 px-2 py-1 font-mono text-[11px] text-zinc-100">
                  {revealedToken.token}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(revealedToken.token).then(
                      () => toast.success('Copied'),
                      () => toast.error('Copy failed')
                    );
                  }}
                  className="btn-ghost text-xs"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  onClick={() => setRevealedToken(null)}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tint?: 'rose';
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' +
          (tint === 'rose'
            ? 'bg-accent-rose/15 text-accent-rose'
            : 'bg-accent-violet/15 text-accent-violet')
        }
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          {hint && <div className="mt-0.5 text-[11px] text-zinc-500">{hint}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        'relative h-6 w-11 rounded-full transition disabled:opacity-50 ' +
        (checked ? 'bg-accent-violet' : 'bg-white/10')
      }
    >
      <span
        className={
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ' +
          (checked ? 'translate-x-5' : 'translate-x-0.5')
        }
      />
    </button>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: {
  label: string;
  type: 'text' | 'password';
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-accent-violet/40 focus:ring-2 focus:ring-accent-violet/20"
      />
    </label>
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
