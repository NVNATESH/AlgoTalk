export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
export type ModuleDifficulty = 'Easy' | 'Medium' | 'Hard';
export type Priority = 'P0' | 'P1' | 'P2';
export type GoalType = 'custom' | 'recommended' | 'company_prep' | 'quest' | 'ai_generated';
export type GoalCategory = 'dsa' | 'system_design' | 'sql' | 'dbms' | 'fullstack' | 'ai_ml' | 'aptitude' | 'company' | 'other';

export interface GoalResource {
  title: string;
  url: string;
  type: 'youtube' | 'docs' | 'blog' | 'github' | 'practice' | 'cheatsheet' | 'pdf' | 'article';
}

export interface GoalModule {
  moduleId: string;
  title: string;
  description: string;
  topics: string[];
  difficulty: ModuleDifficulty;
  status: ModuleStatus;
  estimatedHours: number;
  actualMinutes: number;
  quizScore: number | null;
  problemSlugs: string[];
  problemsSolved: number;
  completedAt: string | null;
  dueDate: string | null;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  description: string;
  topic: string;
  difficulty: Difficulty;
  priority: Priority;
  goalType: GoalType;
  category: GoalCategory;
  companyTarget: string | null;
  roleTarget: string | null;
  questOrder: number;
  isLocked: boolean;
  prerequisiteGoalId: string | null;
  aiPlanSource: string | null;
  sourcePrompt: string;
  resources: GoalResource[];
  xpReward: number;
  badgeKey: string | null;
  isPublic: boolean;
  templateId: string | null;
  modules: GoalModule[];
  progress: number;
  status: GoalStatus;
  isFocus: boolean;
  estimatedHours: number;
  actualMinutes: number;
  weeklyHours: number;
  startDate: string;
  deadline: string;
  completedAt: string | null;
  streak: number;
  riskScore: number;
  rationale: string;
  createdAt: string;
  updatedAt: string;
  // Only on recommended template listings
  enrolled?: boolean;
}

export interface GeneratedRoadmap {
  name: string;
  icon: string;
  description: string;
  estimatedHours: number;
  rationale: string;
  modules: Array<{
    title: string;
    description: string;
    topics: string[];
    estimatedHours: number;
    difficulty: ModuleDifficulty;
  }>;
}
