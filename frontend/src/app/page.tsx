'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Users, Trophy, Brain, ArrowRight } from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI Mentor', desc: 'Gemini-powered explanations, hints, and code reviews on demand.' },
  { icon: Users, title: 'Live Collab', desc: '60-user rooms with 3-writer RBAC, Yjs CRDT, and WebRTC audio.' },
  { icon: Trophy, title: '24h Challenges', desc: 'Group challenges across LeetCode, Codeforces, CodeChef and more.' },
  { icon: Sparkles, title: 'Smart Goals', desc: 'Adaptive learning roadmaps, Pomodoro focus, and weekly insights.' },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="gradient-text">AlgoTalk</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-5xl px-8 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-xl">
            <Sparkles className="h-3 w-3 text-accent-violet" />
            Powered by Google Gemini
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-tight md:text-7xl">
            Learn, collaborate, and{' '}
            <span className="gradient-text">level up</span>
            <br /> in real time.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            One platform for AI-driven learning, group coding challenges, and cross-platform
            competitive-programming intelligence — all live, all dynamic.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn-primary">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-ghost">
              I already have an account
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-8 pb-32">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass p-6 hover:border-white/20 transition"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet to-accent-fuchsia">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
