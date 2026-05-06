'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { MentorChat } from './MentorChat';
import { useMentor, selectThread } from '@/stores/mentorStore';

interface MentorButtonProps {
  goalId: string;
  goalName: string;
  goalIcon: string;
  moduleId?: string;
  moduleTitle?: string;
}

export function MentorButton({
  goalId,
  goalName,
  goalIcon,
  moduleId = '',
  moduleTitle,
}: MentorButtonProps) {
  const [open, setOpen] = useState(false);
  const thread = useMentor(selectThread(goalId, moduleId));
  const loadThread = useMentor((s) => s.loadThread);

  useEffect(() => {
    void loadThread(goalId, moduleId);
  }, [goalId, moduleId, loadThread]);

  const messageCount = thread.messages.length;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-accent-violet/30 transition hover:shadow-accent-fuchsia/50"
        aria-label="Open AI Mentor"
      >
        <Bot className="h-5 w-5" />
        <span className="hidden md:inline">Ask Mentor</span>
        {messageCount > 0 && (
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold tabular-nums">
            {messageCount}
          </span>
        )}
        <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia opacity-40 blur-xl" />
      </motion.button>

      <MentorChat
        open={open}
        onClose={() => setOpen(false)}
        goalId={goalId}
        goalName={goalName}
        goalIcon={goalIcon}
        moduleId={moduleId}
        moduleTitle={moduleTitle}
      />
    </>
  );
}
