export interface PublicProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  bio: string;
  location: string;
  education: string;
  profilePic: string;
  socialLinks: { github: string; linkedin: string; twitter: string };
  skills: string[];
  followersCount: number;
  followingCount: number;
  xp: number;
  level: string;
  joinedAt: string;
}

export interface ProfileStats {
  totalSolved: number;
  totalProblems: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  bestRuntimeMs: number | null;
  byDifficulty: {
    Easy: { solved: number; total: number };
    Medium: { solved: number; total: number };
    Hard: { solved: number; total: number };
  };
  currentStreak: number;
  maxStreak: number;
  activeDays: number;
  recentTrend: {
    solvedThisWeek: number;
    solvedLastWeek: number;
    submissionsThisWeek: number;
  };
  byLanguage: Array<{ language: string; count: number }>;
  goalsActive: number;
  goalsCompleted: number;
  externalSolved: number;
  externalSubmissions: number;
  externalPlatforms: string[];
}

export interface ActivityCell {
  date: string;
  count: number;
  accepted: number;
  external: number;
  externalAccepted: number;
}

export interface RecentSubmission {
  id: string;
  status: string;
  language: string;
  runtimeMs: number;
  createdAt: string;
  problem: { slug: string; title: string; difficulty: string } | null;
  reviewId: string | null;
}

export interface ProfileResponse {
  profile: PublicProfile;
  stats: ProfileStats;
  activityCalendar: ActivityCell[];
  recentSubmissions: RecentSubmission[];
  isSelf: boolean;
  isFollowing: boolean;
}
