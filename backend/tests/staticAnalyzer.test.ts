import { describe, it, expect } from 'vitest';
import { analyzeCode, formatAnalysisHints } from '../src/analysis/staticAnalyzer.js';

describe('staticAnalyzer', () => {
  describe('analyzeCode — C++', () => {
    it('detects vector and map data structures', () => {
      const code = `
#include <vector>
#include <map>
int main() {
  vector<int> nums = {1, 2, 3};
  map<string, int> freq;
  for (auto& n : nums) freq[to_string(n)]++;
  return 0;
}`;
      const result = analyzeCode(code, 'cpp');
      expect(result.language).toBe('cpp');
      expect(result.dataStructures).toContain('vector');
      expect(result.dataStructures).toContain('map');
    });

    it('counts functions correctly', () => {
      const code = `
int add(int a, int b) {
  return a + b;
}
int multiply(int a, int b) {
  return a * b;
}
int main() {
  return 0;
}`;
      const result = analyzeCode(code, 'cpp');
      expect(result.functionCount).toBeGreaterThanOrEqual(3);
    });

    it('detects recursion', () => {
      const code = `
int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;
      const result = analyzeCode(code, 'cpp');
      expect(result.controlFlow.recursionLikely).toBe(true);
    });

    it('measures nesting depth via braces', () => {
      const code = `
int main() {
  for (int i = 0; i < 10; i++) {
    if (i > 5) {
      while (true) {
        break;
      }
    }
  }
}`;
      const result = analyzeCode(code, 'cpp');
      expect(result.maxDepth).toBeGreaterThanOrEqual(4);
    });

    it('ignores code inside comments', () => {
      const code = `
// vector<int> v;
/* map<string, int> m; */
int main() { return 0; }`;
      const result = analyzeCode(code, 'cpp');
      expect(result.dataStructures).not.toContain('vector');
      expect(result.dataStructures).not.toContain('map');
    });
  });

  describe('analyzeCode — Python', () => {
    it('detects dict and list', () => {
      const code = `
def solve():
    freq = {"a": 1, "b": 2}
    nums = [1, 2, 3]
    for n in nums:
        freq[str(n)] = freq.get(str(n), 0) + 1
`;
      const result = analyzeCode(code, 'python');
      expect(result.dataStructures).toContain('dict');
      expect(result.dataStructures).toContain('list');
    });

    it('counts python functions', () => {
      const code = `
def foo():
    pass

def bar(x):
    return x + 1

def baz(a, b):
    return a * b
`;
      const result = analyzeCode(code, 'python');
      expect(result.functionCount).toBe(3);
    });

    it('measures indent-based nesting', () => {
      const code = `
def solve():
    for i in range(10):
        if i > 5:
            while True:
                break
`;
      const result = analyzeCode(code, 'python');
      expect(result.maxDepth).toBeGreaterThanOrEqual(4);
    });

    it('ignores triple-quoted strings', () => {
      const code = `
"""
vector<int> v;
dict()
"""
def main():
    pass
`;
      const result = analyzeCode(code, 'python');
      expect(result.dataStructures).not.toContain('vector');
    });
  });

  describe('analyzeCode — JavaScript', () => {
    it('detects Map and Set', () => {
      const code = `
const map = new Map();
const set = new Set();
map.set('a', 1);
set.add(2);
`;
      const result = analyzeCode(code, 'javascript');
      expect(result.dataStructures).toContain('map');
      expect(result.dataStructures).toContain('set');
    });

    it('counts lines of code excluding blanks', () => {
      const code = `const a = 1;

const b = 2;

const c = a + b;`;
      const result = analyzeCode(code, 'javascript');
      expect(result.loc).toBe(3);
    });
  });

  describe('analyzeCode — Java', () => {
    it('detects ArrayList and HashMap', () => {
      const code = `
import java.util.*;
public class Solution {
  public int[] twoSum(int[] nums, int target) {
    HashMap<Integer, Integer> map = new HashMap<>();
    ArrayList<Integer> list = new ArrayList<>();
    return new int[]{0, 1};
  }
}`;
      const result = analyzeCode(code, 'java');
      expect(result.dataStructures).toContain('hash_map');
      expect(result.dataStructures).toContain('array_list');
    });
  });

  describe('control flow detection', () => {
    it('counts for loops, while loops, and if statements', () => {
      const code = `
int main() {
  for (int i = 0; i < 10; i++) {
    if (i % 2 == 0) {
      while (i > 5) { break; }
    }
    if (i == 3) continue;
  }
  for (int j = 0; j < 5; j++) {}
}`;
      const result = analyzeCode(code, 'cpp');
      expect(result.controlFlow.forLoops).toBe(2);
      expect(result.controlFlow.whileLoops).toBe(1);
      expect(result.controlFlow.ifs).toBe(2);
    });
  });

  describe('formatAnalysisHints', () => {
    it('returns formatted string', () => {
      const analysis = analyzeCode('int main() { return 0; }', 'cpp');
      const hints = formatAnalysisHints(analysis);
      expect(hints).toContain('Language: cpp');
      expect(hints).toContain('LOC');
      expect(hints).toContain('Function count');
      expect(hints).toContain('Max nesting depth');
      expect(hints).toContain('Data structures detected');
      expect(hints).toContain('Control flow');
    });

    it('shows recursion hint when detected', () => {
      const code = `
int fib(int n) {
  if (n <= 1) return n;
  return fib(n-1) + fib(n-2);
}`;
      const analysis = analyzeCode(code, 'cpp');
      const hints = formatAnalysisHints(analysis);
      expect(hints).toContain('recursion likely');
    });
  });
});
