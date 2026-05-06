/**
 * URL parser for external platform problem links.
 *
 * Returns the platform-native problemId in the same format we store in
 * ExtractedSubmission so verification can match by equality.
 *
 * For platforms we don't extract from (currently only GFG / HackerEarth), we
 * still accept the URL but `verifiable: false` — auto-verification skips them.
 */

import type { Platform } from '../models/Integration.js';

export type UrlPlatform =
  | 'leetcode'
  | 'codeforces'
  | 'codechef'
  | 'hackerrank'
  | 'gfg'
  | 'atcoder'
  | 'hackerearth'
  | 'custom';

export interface ParsedExternalUrl {
  platform: UrlPlatform;
  problemId: string | null; // null means "we recognized the platform but can't auto-verify"
  canonicalUrl: string;
  /** Whether this platform is one we currently extract from (and thus can auto-verify). */
  verifiable: boolean;
}

const PATTERNS: Array<{
  match: RegExp;
  build: (m: RegExpMatchArray) => ParsedExternalUrl;
}> = [
  // LeetCode problem
  {
    match: /(?:^|\/\/)(?:www\.)?leetcode\.com\/problems\/([a-z0-9-]+)/i,
    build: (m) => ({
      platform: 'leetcode',
      problemId: m[1].toLowerCase(),
      canonicalUrl: `https://leetcode.com/problems/${m[1].toLowerCase()}/`,
      verifiable: true,
    }),
  },
  // LeetCode contest problem (also resolves to same titleSlug for matching)
  {
    match: /leetcode\.com\/contest\/[a-z0-9-]+\/problems\/([a-z0-9-]+)/i,
    build: (m) => ({
      platform: 'leetcode',
      problemId: m[1].toLowerCase(),
      canonicalUrl: `https://leetcode.com/problems/${m[1].toLowerCase()}/`,
      verifiable: true,
    }),
  },
  // Codeforces problemset
  {
    match: /codeforces\.com\/problemset\/problem\/(\d+)\/([A-Z0-9]+)/i,
    build: (m) => ({
      platform: 'codeforces',
      problemId: `${m[1]}${m[2].toUpperCase()}`,
      canonicalUrl: `https://codeforces.com/problemset/problem/${m[1]}/${m[2].toUpperCase()}`,
      verifiable: true,
    }),
  },
  // Codeforces in-contest
  {
    match: /codeforces\.com\/contest\/(\d+)\/problem\/([A-Z0-9]+)/i,
    build: (m) => ({
      platform: 'codeforces',
      problemId: `${m[1]}${m[2].toUpperCase()}`,
      canonicalUrl: `https://codeforces.com/contest/${m[1]}/problem/${m[2].toUpperCase()}`,
      verifiable: true,
    }),
  },
  // Codeforces gym
  {
    match: /codeforces\.com\/gym\/(\d+)\/problem\/([A-Z0-9]+)/i,
    build: (m) => ({
      platform: 'codeforces',
      problemId: `${m[1]}${m[2].toUpperCase()}`,
      canonicalUrl: `https://codeforces.com/gym/${m[1]}/problem/${m[2].toUpperCase()}`,
      verifiable: true,
    }),
  },
  // CodeChef
  {
    match: /codechef\.com\/(?:problems|practice)\/([A-Z0-9_]+)/i,
    build: (m) => ({
      platform: 'codechef',
      problemId: m[1].toUpperCase(),
      canonicalUrl: `https://www.codechef.com/problems/${m[1].toUpperCase()}`,
      verifiable: true,
    }),
  },
  // HackerRank
  {
    match: /hackerrank\.com\/(?:contests\/[a-z0-9-]+\/)?challenges\/([a-z0-9-]+)/i,
    build: (m) => ({
      platform: 'hackerrank',
      problemId: m[1].toLowerCase(),
      canonicalUrl: `https://www.hackerrank.com/challenges/${m[1].toLowerCase()}/problem`,
      verifiable: true,
    }),
  },
  // AtCoder
  {
    match: /atcoder\.jp\/contests\/([a-z0-9_]+)\/tasks\/([a-z0-9_]+)/i,
    build: (m) => ({
      platform: 'atcoder',
      problemId: m[2].toLowerCase(),
      canonicalUrl: `https://atcoder.jp/contests/${m[1].toLowerCase()}/tasks/${m[2].toLowerCase()}`,
      verifiable: true,
    }),
  },
  // GeeksforGeeks
  {
    match: /(?:practice\.)?geeksforgeeks\.org\/problems\/([a-z0-9-]+)/i,
    build: (m) => ({
      platform: 'gfg',
      problemId: m[1].toLowerCase(),
      canonicalUrl: `https://www.geeksforgeeks.org/problems/${m[1].toLowerCase()}/`,
      verifiable: true,
    }),
  },
  // HackerEarth (algorithm/data-structures)
  {
    match: /hackerearth\.com\/(?:practice|challenges)\/(?:[a-z0-9-/]+)\/([a-z0-9-]+)\/?/i,
    build: (m) => ({
      platform: 'hackerearth',
      problemId: m[1].toLowerCase(),
      canonicalUrl: `https://www.hackerearth.com${m[0].split('hackerearth.com')[1]}`,
      verifiable: true,
    }),
  },
];

export function parseExternalUrl(url: string): ParsedExternalUrl | null {
  if (!url) return null;
  const trimmed = url.trim();
  for (const p of PATTERNS) {
    const m = trimmed.match(p.match);
    if (m) return p.build(m);
  }
  return null;
}

/** Check whether we have an extractor for a given platform. */
export function isExtractablePlatform(p: UrlPlatform): p is Platform {
  return (
    p === 'leetcode' ||
    p === 'codeforces' ||
    p === 'codechef' ||
    p === 'hackerrank' ||
    p === 'atcoder' ||
    p === 'gfg' ||
    p === 'hackerearth'
  );
}
