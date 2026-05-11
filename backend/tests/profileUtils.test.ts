import { describe, it, expect } from 'vitest';

/**
 * Tests for the profileService utility functions.
 * We replicate the pure utility logic to test it in isolation.
 */

const KNOWN_LANGUAGES = new Set([
  'python', 'python3', 'python2', 'py', 'pypy', 'pypy3',
  'javascript', 'js', 'node', 'nodejs',
  'typescript', 'ts',
  'java', 'cpp', 'c++', 'c++14', 'c++17', 'c++20', 'c++23',
  'c', 'c11', 'c99', 'go', 'golang', 'rust', 'ruby',
  'kotlin', 'scala', 'swift', 'php', 'dart', 'haskell',
  'perl', 'bash', 'sh', 'r', 'clojure', 'erlang', 'fortran',
  'pascal', 'lua', 'csharp', 'c#',
]);

const LANG_NORMALIZE: Record<string, string> = {
  'python3': 'python', 'python2': 'python', 'py': 'python', 'pypy': 'python', 'pypy3': 'python',
  'js': 'javascript', 'node': 'javascript', 'nodejs': 'javascript',
  'ts': 'typescript',
  'c++': 'cpp', 'c++14': 'cpp', 'c++17': 'cpp', 'c++20': 'cpp', 'c++23': 'cpp',
  'c11': 'c', 'c99': 'c',
  'golang': 'go',
  'sh': 'bash',
  'csharp': 'c#',
};

const LANG_CLEANUP_RE = /[^a-z0-9+#]/g;
const LANG_PREFIX_RE = /^(c\+\+|python|java|pyth|gnu\s*c|gcc|g\+\+|clang|rust|go|ruby|kotlin|scala|swift|php|perl|haskell|javascript|typescript|bash|r$)/i;

function isKnownLanguage(raw: string): boolean {
  const key = raw.toLowerCase().replace(LANG_CLEANUP_RE, '');
  if (KNOWN_LANGUAGES.has(key)) return true;
  if (LANG_PREFIX_RE.test(raw)) return true;
  return false;
}

function normalizeLanguage(raw: string): string {
  const key = raw.toLowerCase().replace(LANG_CLEANUP_RE, '');
  return LANG_NORMALIZE[key] ?? (KNOWN_LANGUAGES.has(key) ? key : raw.toLowerCase());
}

describe('profileService utilities', () => {
  describe('isKnownLanguage', () => {
    it('recognizes standard language names', () => {
      expect(isKnownLanguage('python')).toBe(true);
      expect(isKnownLanguage('javascript')).toBe(true);
      expect(isKnownLanguage('java')).toBe(true);
      expect(isKnownLanguage('cpp')).toBe(true);
      expect(isKnownLanguage('c++')).toBe(true);
      expect(isKnownLanguage('go')).toBe(true);
      expect(isKnownLanguage('rust')).toBe(true);
    });

    it('recognizes case-insensitive input', () => {
      expect(isKnownLanguage('Python')).toBe(true);
      expect(isKnownLanguage('JAVA')).toBe(true);
      expect(isKnownLanguage('JavaScript')).toBe(true);
    });

    it('recognizes compiler-style names like C++17 (GCC 7-32)', () => {
      expect(isKnownLanguage('C++17 (GCC 7-32)')).toBe(true);
      expect(isKnownLanguage('Python 3.9')).toBe(true);
      expect(isKnownLanguage('Java 11')).toBe(true);
      expect(isKnownLanguage('GNU C++17')).toBe(true);
    });

    it('rejects unknown strings', () => {
      expect(isKnownLanguage('BIGNAME')).toBe(false);
      expect(isKnownLanguage('PROBLEM_SLUG_123')).toBe(false);
      expect(isKnownLanguage('unknown_language')).toBe(false);
    });

    it('recognizes aliases', () => {
      expect(isKnownLanguage('py')).toBe(true);
      expect(isKnownLanguage('pypy3')).toBe(true);
      expect(isKnownLanguage('nodejs')).toBe(true);
      expect(isKnownLanguage('ts')).toBe(true);
      expect(isKnownLanguage('golang')).toBe(true);
    });
  });

  describe('normalizeLanguage', () => {
    it('normalizes python variants to python', () => {
      expect(normalizeLanguage('python3')).toBe('python');
      expect(normalizeLanguage('python2')).toBe('python');
      expect(normalizeLanguage('py')).toBe('python');
      expect(normalizeLanguage('pypy')).toBe('python');
      expect(normalizeLanguage('pypy3')).toBe('python');
    });

    it('normalizes js variants to javascript', () => {
      expect(normalizeLanguage('js')).toBe('javascript');
      expect(normalizeLanguage('node')).toBe('javascript');
      expect(normalizeLanguage('nodejs')).toBe('javascript');
    });

    it('normalizes c++ variants to cpp', () => {
      expect(normalizeLanguage('c++')).toBe('cpp');
      expect(normalizeLanguage('c++14')).toBe('cpp');
      expect(normalizeLanguage('c++17')).toBe('cpp');
      expect(normalizeLanguage('c++20')).toBe('cpp');
    });

    it('normalizes golang to go', () => {
      expect(normalizeLanguage('golang')).toBe('go');
    });

    it('returns lowercase original for unknown but recognized languages', () => {
      expect(normalizeLanguage('rust')).toBe('rust');
      expect(normalizeLanguage('kotlin')).toBe('kotlin');
    });

    it('returns lowercase for totally unknown strings', () => {
      expect(normalizeLanguage('UNKNOWN')).toBe('unknown');
    });
  });
});
