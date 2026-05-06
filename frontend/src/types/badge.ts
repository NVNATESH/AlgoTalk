export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  category: string;
  earned: boolean;
  earnedAt: string | null;
  progress: number; // 0..1
}

export interface BadgesResponse {
  badges: Badge[];
  newlyAwarded: Badge[];
}
