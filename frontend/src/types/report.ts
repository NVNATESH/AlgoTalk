export interface WeeklyReport {
  userId: string;
  userName: string;
  weekStart: string;
  weekEnd: string;
  goalsActive: number;
  goalsCompleted: number;
  totalMinutes: number;
  xpEarned: number;
  rank: string;
  streakBest: number;
  topGoals: Array<{ name: string; progress: number; icon: string }>;
  upcomingDeadlines: Array<{ name: string; deadline: string; progress: number }>;
}

export interface GoalReport {
  goalId: string;
  name: string;
  icon: string;
  progress: number;
  status: string;
  modulesCompleted: number;
  totalModules: number;
  hoursLogged: number;
  streak: number;
  quizScores: Array<{ moduleTitle: string; bestScore: number }>;
  weakTopics: string[];
  strongTopics: string[];
}

export interface DashboardReport {
  user: {
    name: string;
    xp: number;
    rank: string;
    level: string;
  };
  summary: {
    activeGoals: number;
    completedGoals: number;
    totalHoursLogged: number;
    bestStreak: number;
    badgesEarned: number;
    problemsSolved: number;
  };
  topGoals: Array<{ name: string; icon: string; progress: number; goalType: string }>;
  upcomingDeadlines: Array<{ name: string; deadline: string; progress: number; daysLeft: number }>;
  weeklyProgress: {
    goalsWorkedOn: number;
    minutesThisWeek: number;
  };
}
