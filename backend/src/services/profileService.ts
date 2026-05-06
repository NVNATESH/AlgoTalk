import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { Goal } from '../models/Goal.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';
import { CodeReview } from '../models/CodeReview.js';
import { ApiError } from '../utils/ApiError.js';

const HEATMAP_DAYS = 365;

const DIFFICULTY_MAP: Record<string, 'Easy' | 'Medium' | 'Hard' | null> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  unknown: null,
};

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfDayLocal = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

interface ActivityCell {
  date: string;
  count: number;
  accepted: number;
  external: number;
  externalAccepted: number;
}

export interface ProfileStats {
  totalSolved: number;
  totalProblems: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number; // 0-100
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

export interface PublicProfile {
  id: string;
  name: string;
  username: string;
  email?: string; // only for own profile
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

export interface RecentSubmission {
  id: string;
  status: string;
  language: string;
  runtimeMs: number;
  createdAt: string;
  problem: { slug: string; title: string; difficulty: string } | null;
  reviewId: string | null;
}

interface FullProfileResponse {
  profile: PublicProfile;
  stats: ProfileStats;
  activityCalendar: ActivityCell[];
  recentSubmissions: RecentSubmission[];
  isSelf: boolean;
  isFollowing: boolean;
}

export async function getProfileByUsername(
  username: string,
  viewerId?: string
): Promise<FullProfileResponse> {
  const user = await User.findOne({ username: username.toLowerCase().trim() }).lean();
  if (!user) throw ApiError.notFound('User not found');

  const userId = user._id;
  const isSelf = !!viewerId && viewerId === String(userId);
  const isFollowingResolved =
    !isSelf && !!viewerId && (user.followers ?? []).some((f: any) => String(f) === viewerId);

  // Fire as many queries as we can in parallel.
  const [
    allSubsRaw,
    totalProblems,
    problemDifficultyAgg,
    goalsAgg,
    extractedRaw,
  ] = await Promise.all([
    Submission.find({ userId })
      .select('problemId status language runtimeMs createdAt')
      .sort({ createdAt: 1 })
      .lean(),
    Problem.estimatedDocumentCount(),
    Problem.aggregate([{ $group: { _id: '$difficulty', count: { $sum: 1 } } }]),
    Goal.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ExtractedSubmission.find({ userId })
      .select('platform problemId status language difficulty submittedAt')
      .sort({ submittedAt: 1 })
      .lean(),
  ]);

  // Bucket: total submissions / accepted distinct / per-language
  const acceptedProblemIds = new Set<string>();
  let bestRuntimeMs: number | null = null;
  const langCount = new Map<string, number>();
  let acceptedSubmissions = 0;

  for (const s of allSubsRaw) {
    if (s.status === 'accepted') {
      acceptedProblemIds.add(String(s.problemId));
      acceptedSubmissions++;
      if (typeof s.runtimeMs === 'number' && s.runtimeMs > 0) {
        if (bestRuntimeMs === null || s.runtimeMs < bestRuntimeMs) bestRuntimeMs = s.runtimeMs;
      }
    }
    langCount.set(s.language, (langCount.get(s.language) ?? 0) + 1);
  }

  // External submissions: bucket per (platform, problemId) so duplicates collapse
  const externalAcceptedKeys = new Set<string>();
  const externalAcceptedByDifficulty: Record<'Easy' | 'Medium' | 'Hard', Set<string>> = {
    Easy: new Set(),
    Medium: new Set(),
    Hard: new Set(),
  };
  const externalPlatformsSet = new Set<string>();
  let externalAcceptedTotal = 0;
  for (const e of extractedRaw) {
    const key = `${e.platform}:${e.problemId}`;
    externalPlatformsSet.add(e.platform);
    if (e.language) langCount.set(e.language, (langCount.get(e.language) ?? 0) + 1);
    if (e.status === 'accepted') {
      externalAcceptedTotal++;
      if (!externalAcceptedKeys.has(key)) {
        externalAcceptedKeys.add(key);
        const diff = DIFFICULTY_MAP[e.difficulty];
        if (diff) externalAcceptedByDifficulty[diff].add(key);
      }
    }
  }
  const externalSolvedDistinct = externalAcceptedKeys.size;
  const externalSubmissionsTotal = extractedRaw.length;

  // Look up difficulty for accepted problems
  let byDifficulty = {
    Easy: { solved: 0, total: 0 },
    Medium: { solved: 0, total: 0 },
    Hard: { solved: 0, total: 0 },
  };
  for (const row of problemDifficultyAgg as Array<{ _id: string; count: number }>) {
    if (row._id in byDifficulty) {
      (byDifficulty as any)[row._id].total = row.count;
    }
  }
  if (acceptedProblemIds.size > 0) {
    const acceptedDocs = await Problem.find({
      _id: { $in: Array.from(acceptedProblemIds).map((id) => new Types.ObjectId(id)) },
    })
      .select('difficulty')
      .lean();
    for (const p of acceptedDocs) {
      if (p.difficulty in byDifficulty) {
        (byDifficulty as any)[p.difficulty].solved++;
      }
    }
  }
  // Fold external accepted into byDifficulty — both solved AND total grow so the
  // ratio stays meaningful for users with mostly-external history.
  for (const diff of ['Easy', 'Medium', 'Hard'] as const) {
    const n = externalAcceptedByDifficulty[diff].size;
    byDifficulty[diff].solved += n;
    byDifficulty[diff].total += n;
  }

  // Activity calendar — last 365 days inclusive of today
  const today = startOfDayLocal(new Date());
  const cellByKey = new Map<string, ActivityCell>();
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = ymd(d);
    cellByKey.set(key, { date: key, count: 0, accepted: 0, external: 0, externalAccepted: 0 });
  }
  for (const s of allSubsRaw) {
    const key = ymd(s.createdAt as Date);
    const cell = cellByKey.get(key);
    if (cell) {
      cell.count++;
      if (s.status === 'accepted') cell.accepted++;
    }
  }
  for (const e of extractedRaw) {
    const key = ymd(e.submittedAt as Date);
    const cell = cellByKey.get(key);
    if (cell) {
      cell.count++;
      cell.external++;
      if (e.status === 'accepted') {
        cell.accepted++;
        cell.externalAccepted++;
      }
    }
  }
  const calendar = Array.from(cellByKey.values());

  // Streaks
  let activeDays = 0;
  let maxStreak = 0;
  let run = 0;
  for (const cell of calendar) {
    if (cell.count > 0) {
      activeDays++;
      run++;
      if (run > maxStreak) maxStreak = run;
    } else {
      run = 0;
    }
  }
  // current streak = trailing run from today backward
  let currentStreak = 0;
  for (let i = calendar.length - 1; i >= 0; i--) {
    if (calendar[i].count > 0) currentStreak++;
    else break;
  }

  // Recent trend (this week vs last week, by accepted-problem-firsts)
  const weekStart = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offsetDays);
    return d;
  };
  const sevenAgo = weekStart(7);
  const fourteenAgo = weekStart(14);

  const seenAccepted = new Set<string>();
  let solvedThisWeek = 0;
  let solvedLastWeek = 0;
  let submissionsThisWeek = 0;

  for (const s of allSubsRaw) {
    const t = new Date(s.createdAt as Date);
    if (t >= sevenAgo) submissionsThisWeek++;
    if (s.status === 'accepted') {
      const key = `internal:${String(s.problemId)}`;
      if (!seenAccepted.has(key)) {
        seenAccepted.add(key);
        if (t >= sevenAgo) solvedThisWeek++;
        else if (t >= fourteenAgo) solvedLastWeek++;
      }
    }
  }
  for (const e of extractedRaw) {
    const t = new Date(e.submittedAt as Date);
    if (t >= sevenAgo) submissionsThisWeek++;
    if (e.status === 'accepted') {
      const key = `${e.platform}:${e.problemId}`;
      if (!seenAccepted.has(key)) {
        seenAccepted.add(key);
        if (t >= sevenAgo) solvedThisWeek++;
        else if (t >= fourteenAgo) solvedLastWeek++;
      }
    }
  }

  // Recent submissions (last 10, with problem info joined)
  const recentDocs = allSubsRaw.slice(-10).reverse();
  const recentProblemIds = Array.from(new Set(recentDocs.map((s) => String(s.problemId))));
  const recentSubIds = recentDocs.map((s) => s._id);
  const probMap = new Map<string, { slug: string; title: string; difficulty: string }>();
  const reviewIdBySubmission = new Map<string, string>();
  if (recentDocs.length > 0) {
    const [probs, reviewRows] = await Promise.all([
      recentProblemIds.length
        ? Problem.find({
            _id: { $in: recentProblemIds.map((id) => new Types.ObjectId(id)) },
          })
            .select('slug title difficulty')
            .lean()
        : Promise.resolve([] as any[]),
      CodeReview.find({ submissionId: { $in: recentSubIds } })
        .select('_id submissionId')
        .lean(),
    ]);
    for (const p of probs) {
      probMap.set(String(p._id), { slug: p.slug, title: p.title, difficulty: p.difficulty });
    }
    for (const r of reviewRows as Array<{ _id: any; submissionId: any }>) {
      reviewIdBySubmission.set(String(r.submissionId), String(r._id));
    }
  }
  const recentSubmissions: RecentSubmission[] = recentDocs.map((s) => ({
    id: String(s._id),
    status: s.status,
    language: s.language,
    runtimeMs: s.runtimeMs ?? 0,
    createdAt: (s.createdAt as Date).toISOString(),
    problem: probMap.get(String(s.problemId)) ?? null,
    reviewId: reviewIdBySubmission.get(String(s._id)) ?? null,
  }));

  // Goals
  const goalsByStatus = new Map<string, number>();
  for (const row of goalsAgg as Array<{ _id: string; count: number }>) {
    goalsByStatus.set(row._id, row.count);
  }

  const totalSubmissions = allSubsRaw.length + externalSubmissionsTotal;
  const totalAccepted = acceptedSubmissions + externalAcceptedTotal;
  const acceptanceRate =
    totalSubmissions === 0
      ? 0
      : Math.round((totalAccepted / totalSubmissions) * 100);

  const stats: ProfileStats = {
    totalSolved: acceptedProblemIds.size + externalSolvedDistinct,
    totalProblems: totalProblems + externalSolvedDistinct,
    totalSubmissions,
    acceptedSubmissions: totalAccepted,
    acceptanceRate,
    bestRuntimeMs,
    byDifficulty,
    currentStreak,
    maxStreak,
    activeDays,
    recentTrend: { solvedThisWeek, solvedLastWeek, submissionsThisWeek },
    byLanguage: Array.from(langCount.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count),
    goalsActive: goalsByStatus.get('active') ?? 0,
    goalsCompleted: goalsByStatus.get('completed') ?? 0,
    externalSolved: externalSolvedDistinct,
    externalSubmissions: externalSubmissionsTotal,
    externalPlatforms: Array.from(externalPlatformsSet).sort(),
  };

  const profile: PublicProfile = {
    id: String(user._id),
    name: user.name,
    username: user.username,
    bio: user.bio ?? '',
    location: user.location ?? '',
    education: user.education ?? '',
    profilePic: user.profilePic ?? '',
    socialLinks: {
      github: user.socialLinks?.github ?? '',
      linkedin: user.socialLinks?.linkedin ?? '',
      twitter: user.socialLinks?.twitter ?? '',
    },
    skills: user.skills ?? [],
    followersCount: user.followers?.length ?? 0,
    followingCount: user.following?.length ?? 0,
    xp: user.xp ?? 0,
    level: user.level ?? 'Beginner',
    joinedAt: ((user as any).createdAt as Date).toISOString(),
    ...(isSelf ? { email: user.email } : {}),
  };

  return {
    profile,
    stats,
    activityCalendar: calendar,
    recentSubmissions,
    isSelf,
    isFollowing: isFollowingResolved,
  };
}

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  location?: string;
  education?: string;
  socialLinks?: { github?: string; linkedin?: string; twitter?: string };
  skills?: string[];
  profilePic?: string;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.bio !== undefined) update.bio = input.bio.trim();
  if (input.location !== undefined) update.location = input.location.trim();
  if (input.education !== undefined) update.education = input.education.trim();
  if (input.profilePic !== undefined) update.profilePic = input.profilePic.trim();
  if (input.socialLinks) {
    if (input.socialLinks.github !== undefined)
      update['socialLinks.github'] = input.socialLinks.github.trim();
    if (input.socialLinks.linkedin !== undefined)
      update['socialLinks.linkedin'] = input.socialLinks.linkedin.trim();
    if (input.socialLinks.twitter !== undefined)
      update['socialLinks.twitter'] = input.socialLinks.twitter.trim();
  }
  if (input.skills) {
    update.skills = input.skills
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 30);
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, projection: { passwordHash: 0, verificationToken: 0, resetToken: 0 } }
  ).lean();

  if (!updated) throw ApiError.notFound('User not found');
  return updated;
}

// ---- Follow / unfollow ----------------------------------------------------

export async function followUser(actorId: string, targetUsername: string) {
  const target = await User.findOne({ username: targetUsername.toLowerCase().trim() });
  if (!target) throw ApiError.notFound('User not found');
  if (String(target._id) === actorId) {
    throw ApiError.badRequest("You can't follow yourself");
  }
  const actorObjId = new Types.ObjectId(actorId);
  const targetObjId = target._id as unknown as Types.ObjectId;

  // addToSet so re-following is idempotent
  await Promise.all([
    User.updateOne({ _id: actorObjId }, { $addToSet: { following: targetObjId } }),
    User.updateOne({ _id: targetObjId }, { $addToSet: { followers: actorObjId } }),
  ]);

  return { followersCount: (target.followers?.length ?? 0) + 1, isFollowing: true };
}

export async function unfollowUser(actorId: string, targetUsername: string) {
  const target = await User.findOne({ username: targetUsername.toLowerCase().trim() });
  if (!target) throw ApiError.notFound('User not found');
  const actorObjId = new Types.ObjectId(actorId);
  const targetObjId = target._id as unknown as Types.ObjectId;

  await Promise.all([
    User.updateOne({ _id: actorObjId }, { $pull: { following: targetObjId } }),
    User.updateOne({ _id: targetObjId }, { $pull: { followers: actorObjId } }),
  ]);

  return { followersCount: Math.max(0, (target.followers?.length ?? 1) - 1), isFollowing: false };
}

export async function isFollowing(actorId: string, targetUsername: string): Promise<boolean> {
  const target = await User.findOne({ username: targetUsername.toLowerCase().trim() })
    .select('followers')
    .lean();
  if (!target) return false;
  return (target.followers ?? []).some((f: any) => String(f) === actorId);
}

export interface FollowEntry {
  id: string;
  username: string;
  name: string;
  profilePic: string;
  level: string;
  xp: number;
}

export async function listFollowEdge(
  username: string,
  edge: 'followers' | 'following'
): Promise<FollowEntry[]> {
  const user = await User.findOne({ username: username.toLowerCase().trim() })
    .select(edge)
    .lean();
  if (!user) throw ApiError.notFound('User not found');
  const ids = ((user as any)[edge] ?? []) as Types.ObjectId[];
  if (ids.length === 0) return [];
  const users = await User.find({ _id: { $in: ids } })
    .select('username name profilePic level xp')
    .lean();
  return users.map((u: any) => ({
    id: String(u._id),
    username: u.username,
    name: u.name,
    profilePic: u.profilePic ?? '',
    level: u.level ?? 'Beginner',
    xp: u.xp ?? 0,
  }));
}
