import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Problem } from '../models/Problem.js';
import { logger } from '../config/logger.js';

interface SeedProblem {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  companyTags?: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testCases: Array<{ stdin: string; expectedStdout: string; isHidden?: boolean }>;
  starterCode: { python: string; javascript: string; java: string; cpp: string };
}

const PROBLEMS: SeedProblem[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['array', 'hash-table'],
    companyTags: ['Amazon', 'Google', 'Microsoft'],
    description:
      "Given an array of integers `nums` and an integer `target`, return the **indices of the two numbers** that add up to `target`.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.\n\nReturn the indices in any order, separated by a single space.",
    inputFormat:
      'Line 1: two integers `n` and `target`.\nLine 2: `n` integers — the array `nums`.',
    outputFormat: 'A single line with the two indices, space-separated.',
    constraints: '- 2 ≤ n ≤ 10^4\n- -10^9 ≤ nums[i], target ≤ 10^9\n- Exactly one solution exists.',
    examples: [
      {
        input: '4 9\n2 7 11 15',
        output: '0 1',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9.',
      },
      {
        input: '3 6\n3 2 4',
        output: '1 2',
      },
    ],
    testCases: [
      { stdin: '4 9\n2 7 11 15\n', expectedStdout: '0 1\n' },
      { stdin: '3 6\n3 2 4\n', expectedStdout: '1 2\n' },
      { stdin: '2 6\n3 3\n', expectedStdout: '0 1\n', isHidden: true },
      { stdin: '5 0\n-3 4 3 90 1\n', expectedStdout: '0 2\n', isHidden: true },
      {
        stdin: '6 16\n10 20 5 8 7 9\n',
        expectedStdout: '4 5\n',
        isHidden: true,
      },
    ],
    starterCode: {
      python: `def solve(nums, target):
    # Return a list of two indices [i, j] such that nums[i] + nums[j] == target.
    pass


n, target = map(int, input().split())
nums = list(map(int, input().split()))
result = solve(nums, target)
print(*sorted(result))
`,
      javascript: `function solve(nums, target) {
  // Return [i, j] such that nums[i] + nums[j] === target.
}

const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');
const [n, target] = lines[0].split(' ').map(Number);
const nums = lines[1].split(' ').map(Number);
const result = solve(nums, target);
console.log(result.sort((a, b) => a - b).join(' '));
`,
      java: `import java.util.*;

public class Main {
    static int[] solve(int[] nums, int target) {
        // Return new int[]{i, j} such that nums[i] + nums[j] == target.
        return new int[]{0, 0};
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int target = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int[] r = solve(nums, target);
        Arrays.sort(r);
        System.out.println(r[0] + " " + r[1]);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> solve(vector<int>& nums, int target) {
    // Return {i, j} such that nums[i] + nums[j] == target.
    return {0, 0};
}

int main() {
    int n; long long target;
    cin >> n >> target;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    auto r = solve(nums, (int)target);
    sort(r.begin(), r.end());
    cout << r[0] << " " << r[1] << endl;
    return 0;
}
`,
    },
  },

  {
    slug: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    tags: ['string', 'two-pointers'],
    companyTags: ['Amazon', 'Apple'],
    description:
      'Given a string `s`, return its reverse.\n\nDo it in-place if your language allows, but **the program must read a line and print the reversed line**.',
    inputFormat: 'A single line containing the string `s`.',
    outputFormat: 'A single line with the reversed string.',
    constraints: '- 1 ≤ |s| ≤ 10^5\n- `s` consists of printable ASCII characters.',
    examples: [
      { input: 'hello', output: 'olleh' },
      { input: 'race car', output: 'rac ecar' },
    ],
    testCases: [
      { stdin: 'hello\n', expectedStdout: 'olleh\n' },
      { stdin: 'race car\n', expectedStdout: 'rac ecar\n' },
      { stdin: 'a\n', expectedStdout: 'a\n', isHidden: true },
      { stdin: 'LearnHub\n', expectedStdout: 'buHnraeL\n', isHidden: true },
    ],
    starterCode: {
      python: `def reverse_string(s):
    # Return the reversed string.
    return s


import sys
print(reverse_string(sys.stdin.readline().rstrip('\\n')))
`,
      javascript: `function reverseString(s) {
  // Return the reversed string.
  return s;
}

const s = require('fs').readFileSync(0, 'utf8').replace(/\\n$/, '');
console.log(reverseString(s));
`,
      java: `import java.util.*;

public class Main {
    static String reverseString(String s) {
        // Return the reversed string.
        return s;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        System.out.println(reverseString(s));
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

string reverseString(string s) {
    // Return the reversed string.
    return s;
}

int main() {
    string s;
    getline(cin, s);
    cout << reverseString(s) << endl;
    return 0;
}
`,
    },
  },

  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    tags: ['string', 'stack'],
    companyTags: ['Google', 'Meta'],
    description:
      "Given a string `s` containing only the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nA string is **valid** if:\n- Open brackets are closed by the same type of bracket.\n- Open brackets are closed in the correct order.\n- Every close bracket has a corresponding open bracket of the same type.\n\nPrint `true` if valid, `false` otherwise.",
    inputFormat: 'A single line: the string `s` (may be empty).',
    outputFormat: '`true` or `false`.',
    constraints: '- 0 ≤ |s| ≤ 10^4',
    examples: [
      { input: '()', output: 'true' },
      { input: '()[]{}', output: 'true' },
      { input: '(]', output: 'false' },
      { input: '([)]', output: 'false' },
    ],
    testCases: [
      { stdin: '()\n', expectedStdout: 'true\n' },
      { stdin: '()[]{}\n', expectedStdout: 'true\n' },
      { stdin: '(]\n', expectedStdout: 'false\n' },
      { stdin: '([)]\n', expectedStdout: 'false\n', isHidden: true },
      { stdin: '\n', expectedStdout: 'true\n', isHidden: true },
      { stdin: '{[()]}\n', expectedStdout: 'true\n', isHidden: true },
      { stdin: '(((\n', expectedStdout: 'false\n', isHidden: true },
    ],
    starterCode: {
      python: `def is_valid(s):
    # Return True or False.
    return False


import sys
s = sys.stdin.readline().rstrip('\\n')
print('true' if is_valid(s) else 'false')
`,
      javascript: `function isValid(s) {
  // Return true or false.
  return false;
}

const s = require('fs').readFileSync(0, 'utf8').replace(/\\n$/, '');
console.log(isValid(s) ? 'true' : 'false');
`,
      java: `import java.util.*;

public class Main {
    static boolean isValid(String s) {
        // Return true or false.
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        System.out.println(isValid(s) ? "true" : "false");
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isValid(const string& s) {
    // Return true or false.
    return false;
}

int main() {
    string s;
    getline(cin, s);
    cout << (isValid(s) ? "true" : "false") << endl;
    return 0;
}
`,
    },
  },

  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    companyTags: ['Amazon', 'Microsoft', 'LinkedIn'],
    description:
      'Given an integer array `nums`, find the **contiguous subarray** (containing at least one number) with the largest sum and return its sum.\n\nKnown as **Kadane\'s algorithm** in its O(n) form.',
    inputFormat: 'Line 1: integer `n`.\nLine 2: `n` space-separated integers — the array.',
    outputFormat: 'A single integer: the maximum subarray sum.',
    constraints: '- 1 ≤ n ≤ 10^5\n- -10^4 ≤ nums[i] ≤ 10^4',
    examples: [
      {
        input: '9\n-2 1 -3 4 -1 2 1 -5 4',
        output: '6',
        explanation: 'Subarray [4, -1, 2, 1] has the largest sum 6.',
      },
      { input: '1\n1', output: '1' },
      { input: '5\n5 4 -1 7 8', output: '23' },
    ],
    testCases: [
      { stdin: '9\n-2 1 -3 4 -1 2 1 -5 4\n', expectedStdout: '6\n' },
      { stdin: '1\n1\n', expectedStdout: '1\n' },
      { stdin: '5\n5 4 -1 7 8\n', expectedStdout: '23\n' },
      { stdin: '4\n-1 -2 -3 -4\n', expectedStdout: '-1\n', isHidden: true },
      { stdin: '3\n0 0 0\n', expectedStdout: '0\n', isHidden: true },
      {
        stdin: '10\n-1 2 -1 2 -1 2 -1 2 -1 2\n',
        expectedStdout: '6\n',
        isHidden: true,
      },
    ],
    starterCode: {
      python: `def max_subarray(nums):
    # Return the maximum contiguous-subarray sum.
    return 0


n = int(input())
nums = list(map(int, input().split()))
print(max_subarray(nums))
`,
      javascript: `function maxSubarray(nums) {
  // Return the maximum contiguous-subarray sum.
  return 0;
}

const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');
const n = Number(lines[0]);
const nums = lines[1].split(' ').map(Number);
console.log(maxSubarray(nums));
`,
      java: `import java.util.*;

public class Main {
    static long maxSubarray(int[] nums) {
        // Return the maximum contiguous-subarray sum.
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(maxSubarray(nums));
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long maxSubarray(vector<int>& nums) {
    // Return the maximum contiguous-subarray sum.
    return 0;
}

int main() {
    int n; cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    cout << maxSubarray(nums) << endl;
    return 0;
}
`,
    },
  },

  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    tags: ['math', 'dynamic-programming', 'memoization'],
    companyTags: ['Adobe', 'Apple'],
    description:
      'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. **In how many distinct ways** can you climb to the top?',
    inputFormat: 'A single integer `n`.',
    outputFormat: 'A single integer: the number of distinct ways.',
    constraints: '- 1 ≤ n ≤ 45',
    examples: [
      { input: '2', output: '2', explanation: '1+1 or 2.' },
      { input: '3', output: '3', explanation: '1+1+1, 1+2, 2+1.' },
    ],
    testCases: [
      { stdin: '2\n', expectedStdout: '2\n' },
      { stdin: '3\n', expectedStdout: '3\n' },
      { stdin: '1\n', expectedStdout: '1\n', isHidden: true },
      { stdin: '10\n', expectedStdout: '89\n', isHidden: true },
      { stdin: '20\n', expectedStdout: '10946\n', isHidden: true },
      { stdin: '45\n', expectedStdout: '1836311903\n', isHidden: true },
    ],
    starterCode: {
      python: `def climb(n):
    # Return the number of ways.
    return 0


n = int(input())
print(climb(n))
`,
      javascript: `function climb(n) {
  // Return the number of ways.
  return 0;
}

const n = Number(require('fs').readFileSync(0, 'utf8').trim());
console.log(climb(n));
`,
      java: `import java.util.*;

public class Main {
    static long climb(int n) {
        // Return the number of ways.
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(climb(n));
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long climb(int n) {
    // Return the number of ways.
    return 0;
}

int main() {
    int n; cin >> n;
    cout << climb(n) << endl;
    return 0;
}
`,
    },
  },
];

async function main() {
  await mongoose.connect(env.MONGO_URI);
  logger.info({ uri: env.MONGO_URI }, 'connected for seeding');

  let upserted = 0;
  for (const p of PROBLEMS) {
    await Problem.updateOne(
      { slug: p.slug },
      {
        $set: {
          ...p,
          totalSubmissions: 0,
          totalAccepted: 0,
        },
      },
      { upsert: true }
    );
    upserted++;
    logger.info({ slug: p.slug, title: p.title }, 'upserted problem');
  }

  logger.info({ count: upserted }, '✓ seed complete');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'seed failed');
  process.exit(1);
});
