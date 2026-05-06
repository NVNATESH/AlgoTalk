import { Types } from 'mongoose';
import { Contest } from '../models/Contest.js';
import { UserContest } from '../models/UserContest.js';
import { Integration, type Platform } from '../models/Integration.js';
import { logger } from '../config/logger.js';
import { fetchCodeforcesSubmissions } from '../extractors/codeforces.js';
import { fetchAtCoderSubmissions } from '../extractors/atcoder.js';
import { fetchCodeChefRecent } from '../extractors/codechef.js';
import { fetchLeetCodeRecentSubmissions } from '../extractors/leetcode.js';
import { fetchHackerRankRecent } from '../extractors/hackerrank.js';
import { emitNotification } from './notificationService.js';
import { generateContestReport } from './contestService.js';

/**
 * Per-tick (every 60s) live-contest poller.
 *
 * Walks every active UserContest (status registered/live where the underlying
 * Contest's window contains "now") and tries to merge any new submissions
 * from the user's connected integration into UserContest.submissions.
 *
 * Coverage v1: Codeforces + AtCoder — they have clean public APIs and
 * deterministic problem-id matching. The other platforms degrade to the
 * post-contest analyze flow against whatever submissions the user manually
 * recorded (or none).
 *
 * Status transitions:
 *   - registered → live   when contest start has passed
 *   - live → ended         when contest end has passed
 *   - ended → analyzed     when generateContestReport succeeds (set by that fn)
 *
 * On registered → live we emit `contest_started`.
 * On live → ended (with at least one submission and no existing report) we
 * fire generateContestReport asynchronously; that fn sets reportId, status=
 * analyzed, and is itself responsible for emitting `contest_report_ready`.
 */

let running = false;

export async function tickLiveContests(): Promise<{
  examined: number;
  newSubmissions: number;
  startedTransitions: number;
  endedTransitions: number;
  reportsTriggered: number;
}> {
  if (running) {
    return {
      examined: 0,
      newSubmissions: 0,
      startedTransitions: 0,
      endedTransitions: 0,
      reportsTriggered: 0,
    };
  }
  running = true;
  const summary = {
    examined: 0,
    newSubmissions: 0,
    startedTransitions: 0,
    endedTransitions: 0,
    reportsTriggered: 0,
  };
  try {
    const now = new Date();

    // Active = within window OR in registered state with start in the past.
    const activeRegs = await UserContest.find({
      status: { $in: ['registered', 'live'] },
    })
      .lean();

    if (activeRegs.length === 0) return summary;

    // Batch-load contests we touch.
    const contestIds = Array.from(new Set(activeRegs.map((r: any) => String(r.contestId))));
    const contests = await Contest.find({
      _id: { $in: contestIds.map((id) => new Types.ObjectId(id)) },
    }).lean();
    const contestById = new Map(contests.map((c: any) => [String(c._id), c]));

    for (const reg of activeRegs) {
      summary.examined++;
      const contest = contestById.get(String(reg.contestId));
      if (!contest) continue;

      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);
      const isLive = now >= start && now <= end;
      const hasEnded = now > end;

      // Codeforces, AtCoder, CodeChef, LeetCode, HackerRank live-poll. The HR
      // recent_challenges endpoint is gated for some users (returns 500); when
      // that happens our extractor degrades gracefully to an empty list and
      // the post-contest analyze path is the user's only option until the
      // browser extension closes the gap with direct DOM capture.
      let newSubs = 0;
      const livePollable = ['codeforces', 'atcoder', 'codechef', 'leetcode', 'hackerrank'];
      if (isLive && livePollable.includes(contest.platform)) {
        try {
          newSubs = await pullSubmissionsForUserContest(
            String(reg.userId),
            contest,
            reg as any,
            start,
            end
          );
          summary.newSubmissions += newSubs;
        } catch (err) {
          logger.debug(
            { err: (err as Error).message, contestId: String(reg.contestId), platform: contest.platform },
            'live contest pull failed'
          );
        }
      }

      // Status transitions.
      if (reg.status === 'registered' && isLive) {
        await UserContest.updateOne({ _id: reg._id }, { $set: { status: 'live' } });
        summary.startedTransitions++;
        void emitNotification({
          userId: String(reg.userId),
          type: 'contest_started',
          title: `🏁 ${contest.name} is live`,
          message: `${Math.round(contest.durationMinutes ?? 0)} minute contest just started.`,
          icon: '🏁',
          link: `/contests/${String(contest._id)}/report`,
          priority: 'medium',
          metadata: { contestId: String(contest._id), platform: contest.platform },
        }).catch(() => undefined);
      } else if ((reg.status === 'registered' || reg.status === 'live') && hasEnded) {
        await UserContest.updateOne({ _id: reg._id }, { $set: { status: 'ended' } });
        summary.endedTransitions++;

        // Auto-trigger AI report generation if we have at least one submission
        // recorded and no report yet. Best-effort; failure leaves the user
        // free to manually trigger from the UI.
        const fresh = await UserContest.findById(reg._id).select('submissions reportId').lean();
        if (fresh && (fresh.submissions?.length ?? 0) > 0 && !fresh.reportId) {
          summary.reportsTriggered++;
          // Fire-and-forget; the service emits contest_report_ready on success.
          generateContestReport(String(reg.userId), String(contest._id))
            .then(() =>
              emitNotification({
                userId: String(reg.userId),
                type: 'contest_report_ready',
                title: `📊 ${contest.name} report ready`,
                message: 'Your AI contest report is ready to view.',
                icon: '📊',
                link: `/contests/${String(contest._id)}/report`,
                priority: 'medium',
                metadata: { contestId: String(contest._id), platform: contest.platform },
              }).catch(() => undefined)
            )
            .catch((err) =>
              logger.warn(
                { err: (err as Error).message, contestId: String(contest._id) },
                'auto-report generation failed'
              )
            );
        }
      }
    }
  } finally {
    running = false;
  }
  if (summary.examined > 0) {
    logger.info(summary, 'live contest tick');
  }
  return summary;
}

async function pullSubmissionsForUserContest(
  userId: string,
  contest: any,
  reg: any,
  start: Date,
  end: Date
): Promise<number> {
  const platform = contest.platform as Platform;
  // Need the user's handle for this platform.
  const integration = await Integration.findOne({
    userId: new Types.ObjectId(userId),
    platform,
    isActive: true,
  }).lean();
  if (!integration) return 0;

  // Fetch recent submissions; downstream filtering keeps only in-window matches.
  let candidates: Array<{
    externalId: string;
    problemId: string;
    status: string;
    language: string;
    submittedAt: Date;
  }> = [];

  if (platform === 'codeforces') {
    candidates = await fetchCodeforcesSubmissions(integration.handle, 30);
  } else if (platform === 'atcoder') {
    candidates = await fetchAtCoderSubmissions(integration.handle, 30);
  } else if (platform === 'codechef') {
    // CC scraper paginates the public activity feed; one page is plenty here.
    candidates = await fetchCodeChefRecent(integration.handle, 1);
  } else if (platform === 'leetcode') {
    // LC's `recentAcSubmissionList` only returns ACCEPTED submissions, so
    // attempts before AC don't show up — that's fine for the report context,
    // we just won't see WAs from LC contests.
    candidates = await fetchLeetCodeRecentSubmissions(integration.handle, 30);
  } else if (platform === 'hackerrank') {
    // HR's `recent_challenges` only surfaces solved (no WAs) and is often
    // gated. Returns an empty array on failure rather than throwing.
    candidates = await fetchHackerRankRecent(integration.handle, 30);
  }

  if (candidates.length === 0) return 0;

  // Build the set of valid problem-ids for this contest (with platform-aware
  // matching — CF problemIds are e.g. "1234A", AtCoder are slugs like "abc123_a").
  const contestProblemIndices = new Set<string>(
    (contest.problems ?? []).map((p: any) => p.index)
  );
  const contestExternalId: string = String(contest.externalId);

  // Map upstream problemId → our index. For CF: problemId is "1234A", we strip
  // the contestId prefix to get the index. For AtCoder: problem_id is e.g.
  // "abc123_a"; the index in our Contest.problems is the same string.
  function mapToContestIndex(rawProblemId: string): string | null {
    if (platform === 'codeforces') {
      // Only match if the problem belongs to this contest.
      if (!rawProblemId.startsWith(contestExternalId)) return null;
      const idx = rawProblemId.slice(contestExternalId.length).toUpperCase();
      return contestProblemIndices.has(idx) ? idx : null;
    }
    if (
      platform === 'atcoder' ||
      platform === 'codechef' ||
      platform === 'leetcode' ||
      platform === 'hackerrank'
    ) {
      // For these platforms the problemId IS the index in our schema:
      //   AtCoder:    abc123_a
      //   CodeChef:   TWOSUM (uppercase code)
      //   LeetCode:   two-sum (titleSlug)
      //   HackerRank: diagonal-difference (slug)
      return contestProblemIndices.has(rawProblemId) ? rawProblemId : null;
    }
    return null;
  }

  // Existing submissions on the registration — dedupe by a stable key.
  const existing = (reg.submissions ?? []) as Array<{
    problemIndex: string;
    verdict: string;
    timeFromStartSec: number;
  }>;
  const existingKeys = new Set(
    existing.map((s) => `${s.problemIndex}|${s.verdict}|${s.timeFromStartSec}`)
  );

  const newSubs: Array<{
    problemIndex: string;
    verdict: string;
    timeFromStartSec: number;
    code: string;
    language: string;
    runtimeMs: number;
  }> = [];

  for (const c of candidates) {
    if (c.submittedAt < start || c.submittedAt > end) continue;
    const idx = mapToContestIndex(c.problemId);
    if (!idx) continue;
    const verdict = mapVerdict(c.status);
    const timeFromStartSec = Math.max(
      0,
      Math.round((c.submittedAt.getTime() - start.getTime()) / 1000)
    );
    const key = `${idx}|${verdict}|${timeFromStartSec}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    newSubs.push({
      problemIndex: idx,
      verdict,
      timeFromStartSec,
      code: '', // public APIs don't expose user code; analyzer falls back to verdict patterns
      language: c.language ?? '',
      runtimeMs: 0,
    });
  }

  if (newSubs.length === 0) return 0;
  await UserContest.updateOne(
    { _id: reg._id },
    { $push: { submissions: { $each: newSubs } } }
  );
  return newSubs.length;
}

function mapVerdict(status: string): string {
  // Normalize to a small vocabulary the prompt understands.
  const s = (status ?? '').toLowerCase();
  if (s === 'accepted' || s === 'ac') return 'AC';
  if (s === 'wrong_answer' || s === 'wa') return 'WA';
  if (s === 'tle') return 'TLE';
  if (s === 'mle') return 'MLE';
  if (s === 'runtime_error' || s === 're') return 'RE';
  if (s === 'compile_error' || s === 'ce') return 'CE';
  if (s === 'pending' || s === 'wj' || s === 'wr') return 'pending';
  return s.toUpperCase() || 'UNKNOWN';
}
