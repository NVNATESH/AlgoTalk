import { describe, it, expect } from 'vitest';
import { parseExternalUrl } from '../src/extractors/urlParser.js';

describe('parseExternalUrl', () => {
  describe('LeetCode', () => {
    it('parses standard problem URL', () => {
      const result = parseExternalUrl('https://leetcode.com/problems/two-sum/');
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('leetcode');
      expect(result!.problemId).toBe('two-sum');
      expect(result!.verifiable).toBe(true);
    });

    it('parses contest problem URL', () => {
      const result = parseExternalUrl('https://leetcode.com/contest/weekly-contest-400/problems/find-the-count/');
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('leetcode');
      expect(result!.problemId).toBe('find-the-count');
    });

    it('normalizes to lowercase', () => {
      const result = parseExternalUrl('https://leetcode.com/problems/Two-Sum/');
      expect(result!.problemId).toBe('two-sum');
    });
  });

  describe('Codeforces', () => {
    it('parses problemset URL', () => {
      const result = parseExternalUrl('https://codeforces.com/problemset/problem/1/A');
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('codeforces');
      expect(result!.problemId).toBe('1A');
      expect(result!.verifiable).toBe(true);
    });

    it('parses contest URL', () => {
      const result = parseExternalUrl('https://codeforces.com/contest/1234/problem/B');
      expect(result!.platform).toBe('codeforces');
      expect(result!.problemId).toBe('1234B');
    });

    it('parses gym URL', () => {
      const result = parseExternalUrl('https://codeforces.com/gym/100001/problem/A');
      expect(result!.platform).toBe('codeforces');
      expect(result!.problemId).toBe('100001A');
    });
  });

  describe('CodeChef', () => {
    it('parses problem URL', () => {
      const result = parseExternalUrl('https://www.codechef.com/problems/FLOW001');
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('codechef');
      expect(result!.problemId).toBe('FLOW001');
    });

    it('parses practice URL', () => {
      const result = parseExternalUrl('https://www.codechef.com/practice/DSA');
      expect(result!.platform).toBe('codechef');
    });
  });

  describe('AtCoder', () => {
    it('parses task URL', () => {
      const result = parseExternalUrl('https://atcoder.jp/contests/abc300/tasks/abc300_a');
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('atcoder');
      expect(result!.problemId).toBe('abc300_a');
    });
  });

  describe('HackerRank', () => {
    it('parses challenge URL', () => {
      const result = parseExternalUrl('https://www.hackerrank.com/challenges/solve-me-first/problem');
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('hackerrank');
      expect(result!.problemId).toBe('solve-me-first');
    });
  });

  describe('GeeksForGeeks', () => {
    it('parses GFG URL', () => {
      const result = parseExternalUrl('https://www.geeksforgeeks.org/problems/reverse-a-linked-list/');
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('gfg');
      expect(result!.problemId).toBe('reverse-a-linked-list');
    });

    it('parses practice subdomain', () => {
      const result = parseExternalUrl('https://practice.geeksforgeeks.org/problems/sort-an-array/');
      expect(result!.platform).toBe('gfg');
      expect(result!.problemId).toBe('sort-an-array');
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseExternalUrl('')).toBeNull();
    });

    it('returns null for unknown URL', () => {
      expect(parseExternalUrl('https://example.com/foo')).toBeNull();
    });

    it('trims whitespace', () => {
      const result = parseExternalUrl('  https://leetcode.com/problems/two-sum/  ');
      expect(result).not.toBeNull();
      expect(result!.problemId).toBe('two-sum');
    });
  });
});
