/**
 * Badge catalog — define each badge's metadata and a synchronous criteria function
 * that operates on a pre-fetched `BadgeContext` (so we don't hit the DB per badge).
 */

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface BadgeContext {
  goalCount: number;
  goalsCompleted: number;
  bestGoalStreak: number;
  totalActualMinutes: number;

  distinctSolved: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  languagesUsed: number;
  hardSolved: number;

  quizzesPassed: number; // bestPercentage >= 70

  integrationsConnected: number;
  extractedSubmissions: number;
  externalSolved: number;

  groupsCreated: number;
  largestOwnedGroupSize: number;
  challengesWon: number; // points awarded > 0
}

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  icon: string; // emoji
  tier: BadgeTier;
  category: 'goals' | 'problems' | 'consistency' | 'quizzes' | 'social' | 'platform' | 'mastery';
  criteria: (ctx: BadgeContext) => boolean;
  /** Progress toward earning, used for "next badge" UI. Returns 0..1. */
  progress?: (ctx: BadgeContext) => number;
}

const ratio = (have: number, need: number) => Math.min(1, have / Math.max(1, need));

export const BADGES: BadgeDef[] = [
  // === Goals ===
  {
    key: 'first_goal',
    name: 'First Goal',
    description: 'Created your first learning goal',
    icon: '🎯',
    tier: 'bronze',
    category: 'goals',
    criteria: (c) => c.goalCount >= 1,
    progress: (c) => ratio(c.goalCount, 1),
  },
  {
    key: 'goal_completed',
    name: 'Roadmap Finisher',
    description: 'Completed your first learning goal end-to-end',
    icon: '🏆',
    tier: 'silver',
    category: 'goals',
    criteria: (c) => c.goalsCompleted >= 1,
    progress: (c) => ratio(c.goalsCompleted, 1),
  },
  {
    key: 'goal_completed_5',
    name: 'Roadmap Master',
    description: 'Completed 5 learning goals',
    icon: '🎓',
    tier: 'gold',
    category: 'goals',
    criteria: (c) => c.goalsCompleted >= 5,
    progress: (c) => ratio(c.goalsCompleted, 5),
  },

  // === Problems ===
  {
    key: 'first_solve',
    name: 'First Solve',
    description: 'Solved your first problem',
    icon: '✅',
    tier: 'bronze',
    category: 'problems',
    criteria: (c) => c.distinctSolved >= 1,
    progress: (c) => ratio(c.distinctSolved, 1),
  },
  {
    key: 'solver_10',
    name: 'Getting Started',
    description: 'Solved 10 distinct problems',
    icon: '🚀',
    tier: 'silver',
    category: 'problems',
    criteria: (c) => c.distinctSolved >= 10,
    progress: (c) => ratio(c.distinctSolved, 10),
  },
  {
    key: 'solver_50',
    name: 'Half Century',
    description: 'Solved 50 distinct problems',
    icon: '🥈',
    tier: 'gold',
    category: 'problems',
    criteria: (c) => c.distinctSolved >= 50,
    progress: (c) => ratio(c.distinctSolved, 50),
  },
  {
    key: 'solver_100',
    name: 'Centurion',
    description: 'Solved 100 distinct problems',
    icon: '🥇',
    tier: 'platinum',
    category: 'problems',
    criteria: (c) => c.distinctSolved >= 100,
    progress: (c) => ratio(c.distinctSolved, 100),
  },
  {
    key: 'first_hard',
    name: 'Hard Mode',
    description: 'Conquered your first Hard problem',
    icon: '💎',
    tier: 'gold',
    category: 'mastery',
    criteria: (c) => c.hardSolved >= 1,
    progress: (c) => ratio(c.hardSolved, 1),
  },

  // === Quizzes ===
  {
    key: 'quiz_master',
    name: 'Quiz Master',
    description: 'Passed 10 module quizzes (≥70%)',
    icon: '🧠',
    tier: 'gold',
    category: 'quizzes',
    criteria: (c) => c.quizzesPassed >= 10,
    progress: (c) => ratio(c.quizzesPassed, 10),
  },

  // === Consistency / Time ===
  {
    key: 'streak_7',
    name: 'Consistency King',
    description: '7-day activity streak on a goal',
    icon: '🔥',
    tier: 'silver',
    category: 'consistency',
    criteria: (c) => c.bestGoalStreak >= 7,
    progress: (c) => ratio(c.bestGoalStreak, 7),
  },
  {
    key: 'streak_30',
    name: 'Iron Will',
    description: '30-day activity streak on a goal',
    icon: '⚡',
    tier: 'platinum',
    category: 'consistency',
    criteria: (c) => c.bestGoalStreak >= 30,
    progress: (c) => ratio(c.bestGoalStreak, 30),
  },
  {
    key: 'pomodoro_pro',
    name: 'Pomodoro Pro',
    description: 'Logged 25 hours of focus time',
    icon: '🍅',
    tier: 'gold',
    category: 'consistency',
    criteria: (c) => c.totalActualMinutes >= 25 * 60,
    progress: (c) => ratio(c.totalActualMinutes, 25 * 60),
  },

  // === Social ===
  {
    key: 'group_leader',
    name: 'Group Leader',
    description: 'Created a group with 5+ members',
    icon: '👥',
    tier: 'silver',
    category: 'social',
    criteria: (c) => c.largestOwnedGroupSize >= 5,
    progress: (c) => ratio(c.largestOwnedGroupSize, 5),
  },
  {
    key: 'challenge_champ',
    name: 'Challenge Champion',
    description: 'Won 10 group challenges',
    icon: '🏅',
    tier: 'gold',
    category: 'social',
    criteria: (c) => c.challengesWon >= 10,
    progress: (c) => ratio(c.challengesWon, 10),
  },

  // === Multi-platform ===
  {
    key: 'multi_platform',
    name: 'Multi-Platform',
    description: 'Connected 2+ external coding platforms',
    icon: '🌍',
    tier: 'silver',
    category: 'platform',
    criteria: (c) => c.integrationsConnected >= 2,
    progress: (c) => ratio(c.integrationsConnected, 2),
  },
  {
    key: 'polyglot',
    name: 'Polyglot',
    description: 'Submitted in 3+ programming languages',
    icon: '🌐',
    tier: 'silver',
    category: 'mastery',
    criteria: (c) => c.languagesUsed >= 3,
    progress: (c) => ratio(c.languagesUsed, 3),
  },

  // === Quest & Recommended Goals ===
  {
    key: 'quest_first',
    name: 'Quest Starter',
    description: 'Completed your first quest-based goal',
    icon: '🎮',
    tier: 'bronze',
    category: 'goals',
    criteria: (c) => c.goalsCompleted >= 1,
    progress: (c) => ratio(c.goalsCompleted, 1),
  },
  {
    key: 'quest_master',
    name: 'Quest Master',
    description: 'Completed 10 quest-based goals',
    icon: '🏰',
    tier: 'platinum',
    category: 'goals',
    criteria: (c) => c.goalsCompleted >= 10,
    progress: (c) => ratio(c.goalsCompleted, 10),
  },
  {
    key: 'company_prep_5',
    name: 'Company Hunter',
    description: 'Completed 5 company preparation goals',
    icon: '🏢',
    tier: 'gold',
    category: 'goals',
    criteria: (c) => c.goalsCompleted >= 5,
    progress: (c) => ratio(c.goalsCompleted, 5),
  },
  {
    key: 'ai_plan_3',
    name: 'AI Architect',
    description: 'Created 3 AI-generated learning plans',
    icon: '🤖',
    tier: 'silver',
    category: 'goals',
    criteria: (c) => c.goalCount >= 3,
    progress: (c) => ratio(c.goalCount, 3),
  },
  {
    key: 'centurion_hours',
    name: '100 Hours Club',
    description: 'Logged 100+ hours of focused learning',
    icon: '⏳',
    tier: 'platinum',
    category: 'consistency',
    criteria: (c) => c.totalActualMinutes >= 100 * 60,
    progress: (c) => ratio(c.totalActualMinutes, 100 * 60),
  },
];

export const BADGE_BY_KEY = new Map<string, BadgeDef>(BADGES.map((b) => [b.key, b] as const));

export const TIER_RANK: Record<BadgeTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};
