export type MixedMode = 'practice' | 'timed' | 'contest';
export type MixedDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface MixedPracticeRequest {
  topics: string[];
  difficulty?: MixedDifficulty[];
  count?: number;
  mode?: MixedMode;
  durationMinutes?: number;
  companies?: string[];
}

export interface MixedPracticePlanDay {
  day: number;
  focus: string;
  problems: string[];
}

export interface MixedPracticeInsights {
  pickedSlugs: string[];
  reasoning: string;
  difficulty_curve: string;
  weak_topic_focus: string;
  daily_plan: MixedPracticePlanDay[];
  expected_outcome: string;
}

export interface MixedPracticeProblem {
  slug: string;
  title: string;
  difficulty: MixedDifficulty;
  tags: string[];
  companyTags: string[];
}

export interface MixedPracticeResult {
  topics: string[];
  count: number;
  mode: MixedMode;
  problems: MixedPracticeProblem[];
  insights: MixedPracticeInsights;
  weakTopicCoverage: { topic: string; problems: number }[];
}
