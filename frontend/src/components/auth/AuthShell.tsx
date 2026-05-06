'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="absolute left-6 top-6 font-display text-lg font-bold gradient-text hover:opacity-80"
      >
        LearnHub
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass w-full max-w-md p-8"
      >
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>}
      </motion.div>
    </main>
  );
}
