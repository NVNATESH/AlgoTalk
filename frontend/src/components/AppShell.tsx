'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Brain, Code2, Eye, Globe, LogOut, LayoutDashboard, Mic, Settings, Sparkles, Trophy, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useUi } from '@/stores/uiStore';
import { NotificationBell } from '@/components/NotificationBell';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, loading, logout } = useAuth();
  const distractionFree = useUi((s) => s.distractionFree);
  const setDistractionFree = useUi((s) => s.setDistractionFree);

  useEffect(() => {
    if (hydrated && !loading && !user) router.replace('/login');
  }, [hydrated, loading, user, router]);

  if (!hydrated || loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    router.push('/login');
  };

  return (
    <div className={cn('min-h-screen transition', distractionFree && 'df-mode')}>
      {!distractionFree && (
        <header className="sticky top-0 z-30 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/dashboard"
              className="font-display text-xl font-bold gradient-text"
              aria-label="Home"
            >
              {/* Brand mark only — name removed per request. */}
              <span className="inline-block h-5 w-5 rounded-md bg-gradient-to-br from-accent-violet to-accent-fuchsia" />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/dashboard" active={pathname === '/dashboard'}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </NavLink>
              <NavLink
                href="/problems"
                active={
                  (pathname?.startsWith('/problems') ?? false) ||
                  (pathname?.startsWith('/solve') ?? false)
                }
              >
                <Code2 className="h-4 w-4" /> Problems
              </NavLink>
              <NavLink
                href="/groups"
                active={pathname?.startsWith('/groups') ?? false}
              >
                <Trophy className="h-4 w-4" /> Groups
              </NavLink>
              <NavLink
                href="/contests"
                active={pathname?.startsWith('/contests') ?? false}
              >
                <Trophy className="h-4 w-4" /> Contests
              </NavLink>
              <NavLink
                href="/interview"
                active={pathname?.startsWith('/interview') ?? false}
              >
                <Mic className="h-4 w-4" /> Interview
              </NavLink>
              <NavLink
                href="/rooms"
                active={pathname?.startsWith('/rooms') ?? false}
              >
                <Users className="h-4 w-4" /> Rooms
              </NavLink>
              <NavLink
                href="/analyzer"
                active={pathname?.startsWith('/analyzer') ?? false}
              >
                <Brain className="h-4 w-4" /> Analyzer
              </NavLink>
              <NavLink
                href="/integrations"
                active={pathname?.startsWith('/integrations') ?? false}
              >
                <Globe className="h-4 w-4" /> Sync
              </NavLink>
              <NavLink
                href="/rewind"
                active={pathname?.startsWith('/rewind') ?? false}
              >
                <Sparkles className="h-4 w-4" /> Rewind
              </NavLink>
              <NavLink
                href={`/profile/${user.username}`}
                active={pathname?.startsWith('/profile') ?? false}
              >
                <UserIcon className="h-4 w-4" /> Profile
              </NavLink>
            </nav>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link
                href={`/profile/${user.username}`}
                className="hidden text-right md:block group"
                title="View your profile"
              >
                <div className="text-sm font-medium leading-tight group-hover:text-accent-violet transition">{user.name}</div>
                <div className="text-xs text-zinc-500">@{user.username}</div>
              </Link>
              <Link
                href="/settings"
                className={cn(
                  'btn-ghost px-3 py-2 text-sm',
                  pathname?.startsWith('/settings') && 'bg-white/10 text-white'
                )}
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button onClick={handleLogout} className="btn-ghost px-3 py-2 text-sm" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
      )}
      {distractionFree && (
        <button
          onClick={() => setDistractionFree(false)}
          className="fixed left-4 top-4 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-bg-elevated/70 px-3 py-1.5 text-[11px] font-medium text-zinc-400 backdrop-blur hover:text-zinc-100"
          aria-label="Exit distraction-free mode"
        >
          <Eye className="h-3 w-3" /> Exit focus
        </button>
      )}
      <main
        className={cn(
          'mx-auto max-w-7xl px-6 py-8 md:px-8',
          distractionFree && 'pt-14 md:pt-16'
        )}
      >
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ' +
        (active
          ? 'bg-white/10 text-white'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100')
      }
    >
      {children}
    </Link>
  );
}
