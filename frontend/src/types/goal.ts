export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
export type ModuleDifficulty = 'Easy' | 'Medium' | 'Hard';
export type Priority = 'P0' | 'P1' | 'P2';

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
