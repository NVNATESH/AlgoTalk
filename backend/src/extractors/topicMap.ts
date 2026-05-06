/**
 * Topic normalization across platforms.
 *
 * Each platform tags problems differently — LeetCode might say "Hash Table" while
 * Codeforces uses "data structures" and others use "hashing". We map all known
 * synonyms down to a single canonical kebab-case tag so cross-platform analytics
 * actually line up.
 *
 * Anything not in the map is lowercased and kebab-cased as-is.
 */

const SYNONYMS: Record<string, string> = {
  // Dynamic programming family
  'dp': 'dynamic-programming',
  'dynamic programming': 'dynamic-programming',
  'memoization': 'dynamic-programming',
  'tabulation': 'dynamic-programming',
  'bitmask dp': 'dynamic-programming',
  'tree dp': 'dynamic-programming',
  'digit dp': 'dynamic-programming',
  // Hashing
  'hash table': 'hashing',
  'hashmap': 'hashing',
  'hash map': 'hashing',
  'hashset': 'hashing',
  'hashes': 'hashing',
  // Trees
  'binary tree': 'trees',
  'tree': 'trees',
  'binary search tree': 'trees',
  'bst': 'trees',
  'segment tree': 'segment-tree',
  'fenwick tree': 'fenwick-tree',
  'bit': 'fenwick-tree',
  'binary indexed tree': 'fenwick-tree',
  // Graphs
  'graph': 'graphs',
  'graphs': 'graphs',
  'dfs': 'graphs',
  'depth-first search': 'graphs',
  'bfs': 'graphs',
  'breadth-first search': 'graphs',
  'shortest paths': 'graphs',
  'dijkstra': 'graphs',
  'union find': 'union-find',
  'dsu': 'union-find',
  // Strings
  'string': 'strings',
  'kmp': 'string-matching',
  'z-function': 'string-matching',
  'suffix array': 'string-matching',
  // Math
  'math': 'math',
  'number theory': 'number-theory',
  'combinatorics': 'combinatorics',
  'probabilities': 'probability',
  // Other
  'two pointers': 'two-pointers',
  'sliding window': 'sliding-window',
  'binary search': 'binary-search',
  'greedy': 'greedy',
  'sortings': 'sorting',
  'sort': 'sorting',
  'divide and conquer': 'divide-and-conquer',
  'bitmasks': 'bit-manipulation',
  'bit manipulation': 'bit-manipulation',
  'recursion': 'recursion',
  'backtracking': 'backtracking',
  'matrix': 'matrix',
  '2d array': 'matrix',
  'array': 'arrays',
  'arrays': 'arrays',
  'linked list': 'linked-list',
  'stack': 'stack',
  'queue': 'queue',
  'heap': 'heap',
  'priority queue': 'heap',
  'simulation': 'simulation',
  'implementation': 'implementation',
  'constructive algorithms': 'constructive',
  'brute force': 'brute-force',
  'data structures': 'data-structures',
  'design': 'design',
};

export function normalizeTopic(raw: string): string {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  if (SYNONYMS[lower]) return SYNONYMS[lower];
  // generic: lowercase + replace spaces/_ with -
  return lower.replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function normalizeTopics(raws: string[] | undefined): string[] {
  if (!Array.isArray(raws)) return [];
  const seen = new Set<string>();
  for (const r of raws) {
    const n = normalizeTopic(r);
    if (n) seen.add(n);
  }
  return Array.from(seen);
}
