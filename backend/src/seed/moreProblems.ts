/**
 * Seed additional real interview problems with company tags.
 * Run: npx tsx src/seed/moreProblems.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Problem } from '../models/Problem.js';

interface SeedProblem {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  companyTags: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testCases: Array<{ stdin: string; expectedStdout: string; isHidden?: boolean }>;
  starterCode: { python: string; javascript: string; java: string; cpp: string };
}

// Helper for generic starter code
function genericStarter(fnName: string, signature: {
  pyRead: string; pyCall: string;
  jsRead: string; jsCall: string;
  javaBody: string;
  cppBody: string;
}) {
  return {
    python: `${signature.pyRead}\n${signature.pyCall}`,
    javascript: `${signature.jsRead}\n${signature.jsCall}`,
    java: `import java.util.*;\n\npublic class Main {\n${signature.javaBody}\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\n${signature.cppBody}`,
  };
}

const PROBLEMS: SeedProblem[] = [
  // ─── Easy Problems ───
  {
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    tags: ['array', 'dynamic-programming', 'greedy'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Goldman Sachs'],
    description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the i-th day.\n\nYou want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.',
    inputFormat: 'Line 1: integer n (number of days).\nLine 2: n integers — the prices array.',
    outputFormat: 'A single integer — the maximum profit.',
    constraints: '- 1 ≤ n ≤ 10^5\n- 0 ≤ prices[i] ≤ 10^4',
    examples: [
      { input: '6\n7 1 5 3 6 4', output: '5', explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 5.' },
      { input: '5\n7 6 4 3 1', output: '0', explanation: 'No transaction is done, max profit = 0.' },
    ],
    testCases: [
      { stdin: '6\n7 1 5 3 6 4\n', expectedStdout: '5\n' },
      { stdin: '5\n7 6 4 3 1\n', expectedStdout: '0\n' },
      { stdin: '3\n2 4 1\n', expectedStdout: '2\n', isHidden: true },
      { stdin: '1\n5\n', expectedStdout: '0\n', isHidden: true },
      { stdin: '4\n1 2 3 4\n', expectedStdout: '3\n', isHidden: true },
    ],
    starterCode: {
      python: `def max_profit(prices):\n    # Return the maximum profit.\n    pass\n\nn = int(input())\nprices = list(map(int, input().split()))\nprint(max_profit(prices))`,
      javascript: `function maxProfit(prices) {\n  // Return the maximum profit.\n}\n\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst prices = lines[1].split(' ').map(Number);\nconsole.log(maxProfit(prices));`,
      java: `import java.util.*;\npublic class Main {\n    static int maxProfit(int[] prices) {\n        return 0;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] p = new int[n];\n        for (int i = 0; i < n; i++) p[i] = sc.nextInt();\n        System.out.println(maxProfit(p));\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint maxProfit(vector<int>& p) {\n    return 0;\n}\nint main() {\n    int n; cin >> n;\n    vector<int> p(n);\n    for (int i = 0; i < n; i++) cin >> p[i];\n    cout << maxProfit(p) << endl;\n}`,
    },
  },
  {
    slug: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    tags: ['array', 'hash-table', 'sorting'],
    companyTags: ['Amazon', 'Apple', 'Adobe', 'Microsoft'],
    description: 'Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.',
    inputFormat: 'Line 1: integer n.\nLine 2: n integers — the array.',
    outputFormat: '`true` or `false`.',
    constraints: '- 1 ≤ n ≤ 10^5\n- -10^9 ≤ nums[i] ≤ 10^9',
    examples: [
      { input: '4\n1 2 3 1', output: 'true' },
      { input: '4\n1 2 3 4', output: 'false' },
    ],
    testCases: [
      { stdin: '4\n1 2 3 1\n', expectedStdout: 'true\n' },
      { stdin: '4\n1 2 3 4\n', expectedStdout: 'false\n' },
      { stdin: '1\n1\n', expectedStdout: 'false\n', isHidden: true },
      { stdin: '6\n1 1 1 3 3 4\n', expectedStdout: 'true\n', isHidden: true },
    ],
    starterCode: {
      python: `def contains_duplicate(nums):\n    pass\n\nn = int(input())\nnums = list(map(int, input().split()))\nprint("true" if contains_duplicate(nums) else "false")`,
      javascript: `function containsDuplicate(nums) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconsole.log(containsDuplicate(lines[1].split(' ').map(Number)) ? "true" : "false");`,
      java: `import java.util.*;\npublic class Main {\n    static boolean containsDuplicate(int[] nums) {\n        return false;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for (int i=0;i<n;i++) nums[i]=sc.nextInt();\n        System.out.println(containsDuplicate(nums));\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nbool containsDuplicate(vector<int>& nums) {\n    return false;\n}\nint main() {\n    int n; cin>>n;\n    vector<int> nums(n);\n    for(int i=0;i<n;i++) cin>>nums[i];\n    cout<<(containsDuplicate(nums)?"true":"false")<<endl;\n}`,
    },
  },
  {
    slug: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    tags: ['linked-list', 'recursion'],
    companyTags: ['Amazon', 'Microsoft', 'Apple', 'Adobe'],
    description: 'You are given two sorted arrays representing sorted linked lists. Merge them into one sorted array.\n\nReturn the merged sorted array.',
    inputFormat: 'Line 1: integers n m (sizes of the two lists).\nLine 2: n sorted integers (list 1).\nLine 3: m sorted integers (list 2).',
    outputFormat: 'One line with the merged sorted array.',
    constraints: '- 0 ≤ n, m ≤ 50\n- -100 ≤ values ≤ 100',
    examples: [
      { input: '3 3\n1 2 4\n1 3 4', output: '1 1 2 3 4 4' },
      { input: '0 1\n\n0', output: '0' },
    ],
    testCases: [
      { stdin: '3 3\n1 2 4\n1 3 4\n', expectedStdout: '1 1 2 3 4 4\n' },
      { stdin: '0 1\n\n0\n', expectedStdout: '0\n' },
      { stdin: '2 2\n1 3\n2 4\n', expectedStdout: '1 2 3 4\n', isHidden: true },
    ],
    starterCode: {
      python: `def merge_sorted(a, b):\n    pass\n\nn, m = map(int, input().split())\na = list(map(int, input().split())) if n else []\nb = list(map(int, input().split())) if m else []\nprint(*merge_sorted(a, b))`,
      javascript: `function mergeSorted(a, b) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst [n,m] = lines[0].split(' ').map(Number);\nconst a = n ? lines[1].split(' ').map(Number) : [];\nconst b = m ? lines[2].split(' ').map(Number) : [];\nconsole.log(mergeSorted(a,b).join(' '));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt(), m = sc.nextInt();\n        int[] a = new int[n], b = new int[m];\n        for(int i=0;i<n;i++) a[i]=sc.nextInt();\n        for(int i=0;i<m;i++) b[i]=sc.nextInt();\n        // merge and print\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n, m; cin >> n >> m;\n    vector<int> a(n), b(m);\n    for(auto& x:a) cin>>x;\n    for(auto& x:b) cin>>x;\n    // merge and print\n}`,
    },
  },
  {
    slug: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    tags: ['hash-table', 'string', 'sorting'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Uber'],
    description: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn anagram uses all the original letters exactly once.',
    inputFormat: 'Line 1: string s.\nLine 2: string t.',
    outputFormat: '`true` or `false`.',
    constraints: '- 1 ≤ |s|, |t| ≤ 5 × 10^4\n- s and t consist of lowercase English letters.',
    examples: [
      { input: 'anagram\nnagaram', output: 'true' },
      { input: 'rat\ncar', output: 'false' },
    ],
    testCases: [
      { stdin: 'anagram\nnagaram\n', expectedStdout: 'true\n' },
      { stdin: 'rat\ncar\n', expectedStdout: 'false\n' },
      { stdin: 'a\na\n', expectedStdout: 'true\n', isHidden: true },
      { stdin: 'ab\nba\n', expectedStdout: 'true\n', isHidden: true },
    ],
    starterCode: {
      python: `def is_anagram(s, t):\n    pass\n\ns = input()\nt = input()\nprint("true" if is_anagram(s, t) else "false")`,
      javascript: `function isAnagram(s, t) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconsole.log(isAnagram(lines[0], lines[1]) ? "true" : "false");`,
      java: `import java.util.*;\npublic class Main {\n    static boolean isAnagram(String s, String t) {\n        return false;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println(isAnagram(sc.nextLine(), sc.nextLine()));\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    string s, t;\n    getline(cin, s); getline(cin, t);\n    // check anagram\n    cout << "false" << endl;\n}`,
    },
  },
  {
    slug: 'linked-list-cycle',
    title: 'Linked List Cycle Detection',
    difficulty: 'Easy',
    tags: ['linked-list', 'two-pointers', 'hash-table'],
    companyTags: ['Amazon', 'Microsoft', 'Apple', 'TCS'],
    description: 'Given an array representing a linked list where each element points to the next index, and a `pos` value indicating where the tail connects back (forming a cycle), determine if there is a cycle.\n\nPrint `true` if a cycle exists, `false` otherwise.\n\n`pos = -1` means no cycle.',
    inputFormat: 'Line 1: n pos (size and cycle position, -1 if no cycle).\nLine 2: n integers (node values).',
    outputFormat: '`true` or `false`.',
    constraints: '- 0 ≤ n ≤ 10^4\n- -10^5 ≤ node values ≤ 10^5\n- -1 ≤ pos < n',
    examples: [
      { input: '4 1\n3 2 0 -4', output: 'true', explanation: 'Tail connects to node at index 1.' },
      { input: '1 -1\n1', output: 'false' },
    ],
    testCases: [
      { stdin: '4 1\n3 2 0 -4\n', expectedStdout: 'true\n' },
      { stdin: '1 -1\n1\n', expectedStdout: 'false\n' },
      { stdin: '2 0\n1 2\n', expectedStdout: 'true\n', isHidden: true },
    ],
    starterCode: {
      python: `def has_cycle(n, pos, values):\n    pass\n\nline = input().split()\nn, pos = int(line[0]), int(line[1])\nvalues = list(map(int, input().split())) if n else []\nprint("true" if has_cycle(n, pos, values) else "false")`,
      javascript: `function hasCycle(n, pos, values) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst [n,pos] = lines[0].split(' ').map(Number);\nconst values = n ? lines[1].split(' ').map(Number) : [];\nconsole.log(hasCycle(n,pos,values) ? "true" : "false");`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt(), pos = sc.nextInt();\n        System.out.println(pos >= 0 ? "true" : "false");\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n, pos; cin >> n >> pos;\n    cout << (pos >= 0 ? "true" : "false") << endl;\n}`,
    },
  },

  // ─── Medium Problems ───
  {
    slug: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    tags: ['hash-table', 'string', 'sliding-window'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg'],
    description: 'Given a string `s`, find the length of the **longest substring** without repeating characters.',
    inputFormat: 'A single line: the string s.',
    outputFormat: 'A single integer — the length of the longest substring.',
    constraints: '- 0 ≤ |s| ≤ 5 × 10^4\n- s consists of English letters, digits, symbols, and spaces.',
    examples: [
      { input: 'abcabcbb', output: '3', explanation: 'The answer is "abc", with length 3.' },
      { input: 'bbbbb', output: '1' },
      { input: 'pwwkew', output: '3' },
    ],
    testCases: [
      { stdin: 'abcabcbb\n', expectedStdout: '3\n' },
      { stdin: 'bbbbb\n', expectedStdout: '1\n' },
      { stdin: 'pwwkew\n', expectedStdout: '3\n' },
      { stdin: '\n', expectedStdout: '0\n', isHidden: true },
      { stdin: 'dvdf\n', expectedStdout: '3\n', isHidden: true },
    ],
    starterCode: {
      python: `def length_of_longest_substring(s):\n    pass\n\ns = input()\nprint(length_of_longest_substring(s))`,
      javascript: `function lengthOfLongestSubstring(s) {\n}\nconst s = require('fs').readFileSync(0,'utf8').trim();\nconsole.log(lengthOfLongestSubstring(s));`,
      java: `import java.util.*;\npublic class Main {\n    static int lengthOfLongestSubstring(String s) {\n        return 0;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine() : "";\n        System.out.println(lengthOfLongestSubstring(s));\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    string s;\n    getline(cin, s);\n    // solve\n    cout << 0 << endl;\n}`,
    },
  },
  {
    slug: 'three-sum',
    title: '3Sum',
    difficulty: 'Medium',
    tags: ['array', 'two-pointers', 'sorting'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple', 'Adobe'],
    description: 'Given an integer array `nums`, return all the **triplets** `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nThe solution set must not contain duplicate triplets. Print each triplet sorted, one per line, and print all triplets in sorted order.',
    inputFormat: 'Line 1: integer n.\nLine 2: n integers.',
    outputFormat: 'Each line: three space-separated integers forming a triplet. Print triplets in sorted order. If no triplets, print `none`.',
    constraints: '- 3 ≤ n ≤ 3000\n- -10^5 ≤ nums[i] ≤ 10^5',
    examples: [
      { input: '6\n-1 0 1 2 -1 -4', output: '-1 -1 2\n-1 0 1' },
      { input: '3\n0 1 1', output: 'none' },
    ],
    testCases: [
      { stdin: '6\n-1 0 1 2 -1 -4\n', expectedStdout: '-1 -1 2\n-1 0 1\n' },
      { stdin: '3\n0 1 1\n', expectedStdout: 'none\n' },
      { stdin: '3\n0 0 0\n', expectedStdout: '0 0 0\n', isHidden: true },
    ],
    starterCode: {
      python: `def three_sum(nums):\n    pass\n\nn = int(input())\nnums = list(map(int, input().split()))\nresult = three_sum(nums)\nif not result:\n    print("none")\nelse:\n    for t in result:\n        print(*t)`,
      javascript: `function threeSum(nums) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst nums = lines[1].split(' ').map(Number);\nconst r = threeSum(nums);\nif (!r.length) console.log("none");\nelse r.forEach(t => console.log(t.join(' ')));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0;i<n;i++) nums[i]=sc.nextInt();\n        // solve\n        System.out.println("none");\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    vector<int> nums(n);\n    for(auto& x:nums) cin>>x;\n    // solve\n    cout<<"none"<<endl;\n}`,
    },
  },
  {
    slug: 'add-two-numbers',
    title: 'Add Two Numbers',
    difficulty: 'Medium',
    tags: ['linked-list', 'math', 'recursion'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Adobe', 'Bloomberg'],
    description: 'You are given two non-negative integers represented as strings (digits stored in reverse order). Add the two numbers and return the sum as a string (also in reverse order).\n\nThe digits are stored in reverse order, and each character is a digit. The two numbers do not contain any leading zero, except the number 0 itself.',
    inputFormat: 'Line 1: first number (digits in reverse order).\nLine 2: second number (digits in reverse order).',
    outputFormat: 'The sum in reverse order.',
    constraints: '- 1 ≤ length of each number ≤ 100\n- 0 ≤ digit ≤ 9',
    examples: [
      { input: '2 4 3\n5 6 4', output: '7 0 8', explanation: '342 + 465 = 807, reversed = 7 0 8' },
      { input: '0\n0', output: '0' },
    ],
    testCases: [
      { stdin: '2 4 3\n5 6 4\n', expectedStdout: '7 0 8\n' },
      { stdin: '0\n0\n', expectedStdout: '0\n' },
      { stdin: '9 9 9\n1\n', expectedStdout: '0 0 0 1\n', isHidden: true },
    ],
    starterCode: {
      python: `def add_two(l1, l2):\n    pass\n\nl1 = list(map(int, input().split()))\nl2 = list(map(int, input().split()))\nprint(*add_two(l1, l2))`,
      javascript: `function addTwo(l1, l2) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst l1 = lines[0].split(' ').map(Number);\nconst l2 = lines[1].split(' ').map(Number);\nconsole.log(addTwo(l1,l2).join(' '));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // read and solve\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // read and solve\n}`,
    },
  },
  {
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    tags: ['array', 'two-pointers', 'greedy'],
    companyTags: ['Amazon', 'Google', 'Goldman Sachs', 'Microsoft'],
    description: 'Given `n` non-negative integers `height[0..n-1]` where each represents a point at coordinate `(i, height[i])`, find two lines that together with the x-axis form a container that holds the most water.\n\nReturn the maximum amount of water a container can store.',
    inputFormat: 'Line 1: integer n.\nLine 2: n integers — the heights.',
    outputFormat: 'A single integer — the maximum area.',
    constraints: '- 2 ≤ n ≤ 10^5\n- 0 ≤ height[i] ≤ 10^4',
    examples: [
      { input: '9\n1 8 6 2 5 4 8 3 7', output: '49' },
      { input: '2\n1 1', output: '1' },
    ],
    testCases: [
      { stdin: '9\n1 8 6 2 5 4 8 3 7\n', expectedStdout: '49\n' },
      { stdin: '2\n1 1\n', expectedStdout: '1\n' },
      { stdin: '3\n4 3 2\n', expectedStdout: '4\n', isHidden: true },
    ],
    starterCode: {
      python: `def max_area(height):\n    pass\n\nn = int(input())\nheight = list(map(int, input().split()))\nprint(max_area(height))`,
      javascript: `function maxArea(height) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconsole.log(maxArea(lines[1].split(' ').map(Number)));`,
      java: `import java.util.*;\npublic class Main {\n    static int maxArea(int[] height) { return 0; }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] h = new int[n];\n        for(int i=0;i<n;i++) h[i]=sc.nextInt();\n        System.out.println(maxArea(h));\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin>>n;\n    vector<int> h(n);\n    for(auto& x:h) cin>>x;\n    // solve\n    cout<<0<<endl;\n}`,
    },
  },
  {
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    tags: ['hash-table', 'string', 'sorting'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Uber', 'Flipkart'],
    description: 'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.\n\nPrint each group sorted alphabetically on one line, groups sorted by their smallest element.',
    inputFormat: 'Line 1: integer n.\nLine 2: n space-separated strings.',
    outputFormat: 'Each line: a group of anagrams (space-separated, sorted).',
    constraints: '- 1 ≤ n ≤ 10^4\n- 0 ≤ |strs[i]| ≤ 100',
    examples: [
      { input: '6\neat tea tan ate nat bat', output: 'ate eat tea\nbat\nnat tan' },
    ],
    testCases: [
      { stdin: '6\neat tea tan ate nat bat\n', expectedStdout: 'ate eat tea\nbat\nnat tan\n' },
      { stdin: '1\na\n', expectedStdout: 'a\n', isHidden: true },
    ],
    starterCode: {
      python: `from collections import defaultdict\ndef group_anagrams(strs):\n    pass\n\nn = int(input())\nstrs = input().split()\ngroups = group_anagrams(strs)\nfor g in groups:\n    print(*g)`,
      javascript: `function groupAnagrams(strs) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst strs = lines[1].split(' ');\ngroupAnagrams(strs).forEach(g => console.log(g.join(' ')));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt(); sc.nextLine();\n        String[] strs = sc.nextLine().split(" ");\n        // solve and print groups\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin>>n;\n    vector<string> strs(n);\n    for(auto& s:strs) cin>>s;\n    // solve\n}`,
    },
  },
  {
    slug: 'binary-tree-level-order',
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'Medium',
    tags: ['tree', 'bfs', 'binary-tree'],
    companyTags: ['Amazon', 'Microsoft', 'Meta', 'Apple', 'Google'],
    description: 'Given a binary tree represented as a level-order array (with -1 for null nodes), return the level order traversal of its nodes\' values (i.e., from left to right, level by level).',
    inputFormat: 'Line 1: integer n (number of nodes in level-order, including nulls).\nLine 2: n integers (-1 for null).',
    outputFormat: 'Each line: values at that level, space-separated.',
    constraints: '- 0 ≤ n ≤ 2000\n- -1000 ≤ node values ≤ 1000',
    examples: [
      { input: '7\n3 9 20 -1 -1 15 7', output: '3\n9 20\n15 7' },
    ],
    testCases: [
      { stdin: '7\n3 9 20 -1 -1 15 7\n', expectedStdout: '3\n9 20\n15 7\n' },
      { stdin: '1\n1\n', expectedStdout: '1\n', isHidden: true },
    ],
    starterCode: {
      python: `from collections import deque\ndef level_order(arr):\n    pass\n\nn = int(input())\narr = list(map(int, input().split())) if n else []\nresult = level_order(arr)\nfor level in result:\n    print(*level)`,
      javascript: `function levelOrder(arr) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst n = parseInt(lines[0]);\nconst arr = n ? lines[1].split(' ').map(Number) : [];\nlevelOrder(arr).forEach(l => console.log(l.join(' ')));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] arr = new int[n];\n        for(int i=0;i<n;i++) arr[i]=sc.nextInt();\n        // solve\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin>>n;\n    vector<int> arr(n);\n    for(auto& x:arr) cin>>x;\n    // solve\n}`,
    },
  },
  {
    slug: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    tags: ['array', 'prefix-sum'],
    companyTags: ['Amazon', 'Apple', 'Meta', 'Microsoft', 'Uber', 'Flipkart'],
    description: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nYou must write an algorithm that runs in O(n) time and **without using the division operation**.',
    inputFormat: 'Line 1: integer n.\nLine 2: n integers.',
    outputFormat: 'One line: n integers — the product array.',
    constraints: '- 2 ≤ n ≤ 10^5\n- -30 ≤ nums[i] ≤ 30\n- Product of any prefix/suffix fits in 32-bit integer.',
    examples: [
      { input: '4\n1 2 3 4', output: '24 12 8 6' },
      { input: '5\n-1 1 0 -3 3', output: '0 0 9 0 0' },
    ],
    testCases: [
      { stdin: '4\n1 2 3 4\n', expectedStdout: '24 12 8 6\n' },
      { stdin: '5\n-1 1 0 -3 3\n', expectedStdout: '0 0 9 0 0\n' },
      { stdin: '3\n2 3 4\n', expectedStdout: '12 8 6\n', isHidden: true },
    ],
    starterCode: {
      python: `def product_except_self(nums):\n    pass\n\nn = int(input())\nnums = list(map(int, input().split()))\nprint(*product_except_self(nums))`,
      javascript: `function productExceptSelf(nums) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconsole.log(productExceptSelf(lines[1].split(' ').map(Number)).join(' '));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0;i<n;i++) nums[i]=sc.nextInt();\n        // solve\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin>>n;\n    vector<int> nums(n);\n    for(auto& x:nums) cin>>x;\n    // solve\n}`,
    },
  },
  {
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    tags: ['dynamic-programming', 'bfs', 'array'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Apple', 'Goldman Sachs', 'Flipkart'],
    description: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the **fewest number of coins** that you need to make up that amount. If that amount cannot be made up, return `-1`.\n\nYou may assume you have an infinite number of each kind of coin.',
    inputFormat: 'Line 1: integer n and integer amount.\nLine 2: n integers — the coin denominations.',
    outputFormat: 'A single integer — minimum number of coins, or -1.',
    constraints: '- 1 ≤ n ≤ 12\n- 1 ≤ coins[i] ≤ 2^31 - 1\n- 0 ≤ amount ≤ 10^4',
    examples: [
      { input: '3 11\n1 5 2', output: '3', explanation: '11 = 5 + 5 + 1' },
      { input: '1 3\n2', output: '-1' },
      { input: '1 0\n1', output: '0' },
    ],
    testCases: [
      { stdin: '3 11\n1 5 2\n', expectedStdout: '3\n' },
      { stdin: '1 3\n2\n', expectedStdout: '-1\n' },
      { stdin: '1 0\n1\n', expectedStdout: '0\n' },
      { stdin: '3 6\n1 3 4\n', expectedStdout: '2\n', isHidden: true },
    ],
    starterCode: {
      python: `def coin_change(coins, amount):\n    pass\n\nn, amount = map(int, input().split())\ncoins = list(map(int, input().split()))\nprint(coin_change(coins, amount))`,
      javascript: `function coinChange(coins, amount) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst [n, amount] = lines[0].split(' ').map(Number);\nconst coins = lines[1].split(' ').map(Number);\nconsole.log(coinChange(coins, amount));`,
      java: `import java.util.*;\npublic class Main {\n    static int coinChange(int[] coins, int amount) { return -1; }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt(), amount = sc.nextInt();\n        int[] coins = new int[n];\n        for(int i=0;i<n;i++) coins[i]=sc.nextInt();\n        System.out.println(coinChange(coins, amount));\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n, amount; cin>>n>>amount;\n    vector<int> coins(n);\n    for(auto& x:coins) cin>>x;\n    // solve\n    cout<<-1<<endl;\n}`,
    },
  },
  {
    slug: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    tags: ['array', 'dfs', 'bfs', 'graph', 'matrix'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg', 'Flipkart'],
    description: 'Given an `m x n` 2D grid map of `1`s (land) and `0`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
    inputFormat: 'Line 1: integers m n.\nNext m lines: n characters (0 or 1) per line.',
    outputFormat: 'A single integer — the number of islands.',
    constraints: '- 1 ≤ m, n ≤ 300',
    examples: [
      { input: '4 5\n11110\n11010\n11000\n00000', output: '1' },
      { input: '4 5\n11000\n11000\n00100\n00011', output: '3' },
    ],
    testCases: [
      { stdin: '4 5\n11110\n11010\n11000\n00000\n', expectedStdout: '1\n' },
      { stdin: '4 5\n11000\n11000\n00100\n00011\n', expectedStdout: '3\n' },
      { stdin: '1 1\n1\n', expectedStdout: '1\n', isHidden: true },
    ],
    starterCode: {
      python: `def num_islands(grid):\n    pass\n\nm, n = map(int, input().split())\ngrid = [list(input()) for _ in range(m)]\nprint(num_islands(grid))`,
      javascript: `function numIslands(grid) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst [m] = lines[0].split(' ').map(Number);\nconst grid = lines.slice(1, m+1).map(l => l.split(''));\nconsole.log(numIslands(grid));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int m = sc.nextInt(), n = sc.nextInt(); sc.nextLine();\n        char[][] grid = new char[m][n];\n        for(int i=0;i<m;i++) grid[i] = sc.nextLine().toCharArray();\n        // solve\n        System.out.println(0);\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int m, n; cin>>m>>n;\n    vector<string> grid(m);\n    for(auto& s:grid) cin>>s;\n    // solve\n    cout<<0<<endl;\n}`,
    },
  },

  // ─── Hard Problems ───
  {
    slug: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'Hard',
    tags: ['array', 'binary-search', 'divide-and-conquer'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Apple', 'Goldman Sachs'],
    description: 'Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the **median** of the two sorted arrays.\n\nThe overall run time complexity should be O(log(m+n)).',
    inputFormat: 'Line 1: integers m n.\nLine 2: m integers (sorted).\nLine 3: n integers (sorted).',
    outputFormat: 'The median as a decimal with 1 decimal place.',
    constraints: '- 0 ≤ m, n ≤ 1000\n- 1 ≤ m + n ≤ 2000\n- -10^6 ≤ values ≤ 10^6',
    examples: [
      { input: '2 1\n1 3\n2', output: '2.0' },
      { input: '2 2\n1 2\n3 4', output: '2.5' },
    ],
    testCases: [
      { stdin: '2 1\n1 3\n2\n', expectedStdout: '2.0\n' },
      { stdin: '2 2\n1 2\n3 4\n', expectedStdout: '2.5\n' },
      { stdin: '1 1\n1\n2\n', expectedStdout: '1.5\n', isHidden: true },
    ],
    starterCode: {
      python: `def find_median(nums1, nums2):\n    pass\n\nm, n = map(int, input().split())\nnums1 = list(map(int, input().split())) if m else []\nnums2 = list(map(int, input().split())) if n else []\nresult = find_median(nums1, nums2)\nprint(f"{result:.1f}")`,
      javascript: `function findMedian(nums1, nums2) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst [m,n] = lines[0].split(' ').map(Number);\nconst n1 = m ? lines[1].split(' ').map(Number) : [];\nconst n2 = n ? lines[2].split(' ').map(Number) : [];\nconsole.log(findMedian(n1,n2).toFixed(1));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int m = sc.nextInt(), n = sc.nextInt();\n        int[] a = new int[m], b = new int[n];\n        for(int i=0;i<m;i++) a[i]=sc.nextInt();\n        for(int i=0;i<n;i++) b[i]=sc.nextInt();\n        // solve\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int m, n; cin>>m>>n;\n    vector<int> a(m), b(n);\n    for(auto& x:a) cin>>x;\n    for(auto& x:b) cin>>x;\n    // solve\n}`,
    },
  },
  {
    slug: 'merge-k-sorted-lists',
    title: 'Merge k Sorted Lists',
    difficulty: 'Hard',
    tags: ['linked-list', 'heap', 'divide-and-conquer', 'merge-sort'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple', 'Uber'],
    description: 'You are given `k` sorted arrays. Merge all arrays into one sorted array and print the result.',
    inputFormat: 'Line 1: integer k (number of sorted arrays).\nNext k lines: first integer is the size, followed by the sorted elements.',
    outputFormat: 'One line: the merged sorted array.',
    constraints: '- 1 ≤ k ≤ 10^4\n- 0 ≤ total elements ≤ 10^4\n- -10^4 ≤ values ≤ 10^4',
    examples: [
      { input: '3\n3 1 4 5\n3 1 3 4\n2 2 6', output: '1 1 2 3 4 4 5 6' },
    ],
    testCases: [
      { stdin: '3\n3 1 4 5\n3 1 3 4\n2 2 6\n', expectedStdout: '1 1 2 3 4 4 5 6\n' },
      { stdin: '1\n0\n', expectedStdout: '\n', isHidden: true },
    ],
    starterCode: {
      python: `import heapq\ndef merge_k(lists):\n    pass\n\nk = int(input())\nlists = []\nfor _ in range(k):\n    parts = list(map(int, input().split()))\n    lists.append(parts[1:] if len(parts) > 1 else [])\nresult = merge_k(lists)\nprint(*result)`,
      javascript: `function mergeK(lists) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst k = parseInt(lines[0]);\nconst lists = [];\nfor(let i=1;i<=k;i++) {\n  const parts = lines[i].split(' ').map(Number);\n  lists.push(parts.slice(1));\n}\nconsole.log(mergeK(lists).join(' '));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int k = sc.nextInt(); sc.nextLine();\n        // read and merge\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int k; cin>>k;\n    // read and merge\n}`,
    },
  },
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    tags: ['array', 'two-pointers', 'dynamic-programming', 'stack', 'monotonic-stack'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Goldman Sachs', 'Bloomberg', 'Adobe'],
    description: 'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    inputFormat: 'Line 1: integer n.\nLine 2: n integers — the heights.',
    outputFormat: 'A single integer — units of trapped water.',
    constraints: '- 1 ≤ n ≤ 2 × 10^4\n- 0 ≤ height[i] ≤ 10^5',
    examples: [
      { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6' },
      { input: '5\n4 2 0 3 2', output: '5' },
    ],
    testCases: [
      { stdin: '12\n0 1 0 2 1 0 1 3 2 1 2 1\n', expectedStdout: '6\n' },
      { stdin: '5\n4 2 0 3 2\n', expectedStdout: '5\n' },
      { stdin: '3\n1 0 1\n', expectedStdout: '1\n', isHidden: true },
    ],
    starterCode: {
      python: `def trap(height):\n    pass\n\nn = int(input())\nheight = list(map(int, input().split()))\nprint(trap(height))`,
      javascript: `function trap(height) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconsole.log(trap(lines[1].split(' ').map(Number)));`,
      java: `import java.util.*;\npublic class Main {\n    static int trap(int[] h) { return 0; }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] h = new int[n];\n        for(int i=0;i<n;i++) h[i]=sc.nextInt();\n        System.out.println(trap(h));\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin>>n;\n    vector<int> h(n);\n    for(auto& x:h) cin>>x;\n    // solve\n    cout<<0<<endl;\n}`,
    },
  },
  {
    slug: 'word-ladder',
    title: 'Word Ladder',
    difficulty: 'Hard',
    tags: ['bfs', 'hash-table', 'string', 'graph'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Flipkart'],
    description: 'Given two words, `beginWord` and `endWord`, and a word list, return the number of words in the **shortest transformation sequence** from `beginWord` to `endWord`, such that:\n\n- Only one letter can be changed at a time.\n- Each transformed word must exist in the word list.\n\nReturn `0` if no such transformation exists.',
    inputFormat: 'Line 1: beginWord.\nLine 2: endWord.\nLine 3: integer n.\nLine 4: n space-separated words (word list).',
    outputFormat: 'A single integer — length of shortest transformation.',
    constraints: '- 1 ≤ |word| ≤ 10\n- 1 ≤ n ≤ 5000\n- All words have same length.',
    examples: [
      { input: 'hit\ncog\n6\nhot dot dog lot log cog', output: '5', explanation: 'hit -> hot -> dot -> dog -> cog' },
      { input: 'hit\ncog\n5\nhot dot dog lot log', output: '0' },
    ],
    testCases: [
      { stdin: 'hit\ncog\n6\nhot dot dog lot log cog\n', expectedStdout: '5\n' },
      { stdin: 'hit\ncog\n5\nhot dot dog lot log\n', expectedStdout: '0\n' },
    ],
    starterCode: {
      python: `from collections import deque\ndef ladder_length(begin, end, word_list):\n    pass\n\nbegin = input()\nend = input()\nn = int(input())\nwords = input().split()\nprint(ladder_length(begin, end, words))`,
      javascript: `function ladderLength(begin, end, wordList) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconsole.log(ladderLength(lines[0], lines[1], lines[3].split(' ')));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String begin = sc.nextLine(), end = sc.nextLine();\n        int n = Integer.parseInt(sc.nextLine().trim());\n        String[] words = sc.nextLine().split(" ");\n        // BFS solve\n        System.out.println(0);\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    string begin, end;\n    getline(cin, begin); getline(cin, end);\n    int n; cin>>n;\n    vector<string> words(n);\n    for(auto& w:words) cin>>w;\n    // BFS solve\n    cout<<0<<endl;\n}`,
    },
  },
  {
    slug: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'Medium',
    tags: ['hash-table', 'linked-list', 'design'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg', 'Apple', 'Flipkart', 'Zoho'],
    description: 'Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement operations:\n- `PUT key value` — Update or insert the value. When cache reaches capacity, evict the least recently used key.\n- `GET key` — Return the value or -1 if not found.\n\nProcess a sequence of operations and print results for each GET.',
    inputFormat: 'Line 1: capacity and number of operations.\nNext lines: either `PUT key value` or `GET key`.',
    outputFormat: 'For each GET, print the result on a new line.',
    constraints: '- 1 ≤ capacity ≤ 3000\n- 0 ≤ key, value ≤ 10^4\n- At most 2 × 10^5 operations.',
    examples: [
      { input: '2 9\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4', output: '1\n-1\n-1\n3\n4' },
    ],
    testCases: [
      { stdin: '2 9\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4\n', expectedStdout: '1\n-1\n-1\n3\n4\n' },
    ],
    starterCode: {
      python: `class LRUCache:\n    def __init__(self, capacity):\n        pass\n    def get(self, key):\n        return -1\n    def put(self, key, value):\n        pass\n\nline = input().split()\ncap, ops = int(line[0]), int(line[1])\ncache = LRUCache(cap)\nfor _ in range(ops):\n    parts = input().split()\n    if parts[0] == "PUT":\n        cache.put(int(parts[1]), int(parts[2]))\n    else:\n        print(cache.get(int(parts[1])))`,
      javascript: `class LRUCache {\n  constructor(capacity) {}\n  get(key) { return -1; }\n  put(key, value) {}\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst [cap] = lines[0].split(' ').map(Number);\nconst cache = new LRUCache(cap);\nfor(let i=1;i<lines.length;i++) {\n  const p = lines[i].split(' ');\n  if(p[0]==='PUT') cache.put(+p[1],+p[2]);\n  else console.log(cache.get(+p[1]));\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int cap = sc.nextInt(), ops = sc.nextInt(); sc.nextLine();\n        LinkedHashMap<Integer,Integer> cache = new LinkedHashMap<>(cap, 0.75f, true);\n        for(int i=0;i<ops;i++) {\n            String[] p = sc.nextLine().split(" ");\n            if(p[0].equals("PUT")) {\n                cache.put(Integer.parseInt(p[1]), Integer.parseInt(p[2]));\n                if(cache.size()>cap) cache.remove(cache.keySet().iterator().next());\n            } else {\n                System.out.println(cache.getOrDefault(Integer.parseInt(p[1]), -1));\n            }\n        }\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int cap, ops; cin>>cap>>ops;\n    // implement LRU\n}`,
    },
  },
  {
    slug: 'rotate-image',
    title: 'Rotate Image',
    difficulty: 'Medium',
    tags: ['array', 'math', 'matrix'],
    companyTags: ['Amazon', 'Microsoft', 'Apple', 'Google', 'Zoho'],
    description: 'Given an `n x n` 2D matrix representing an image, rotate the image by **90 degrees clockwise**.\n\nYou have to rotate the image in-place. Print the rotated matrix.',
    inputFormat: 'Line 1: integer n.\nNext n lines: n integers each.',
    outputFormat: 'n lines of n integers — the rotated matrix.',
    constraints: '- 1 ≤ n ≤ 20\n- -1000 ≤ matrix[i][j] ≤ 1000',
    examples: [
      { input: '3\n1 2 3\n4 5 6\n7 8 9', output: '7 4 1\n8 5 2\n9 6 3' },
    ],
    testCases: [
      { stdin: '3\n1 2 3\n4 5 6\n7 8 9\n', expectedStdout: '7 4 1\n8 5 2\n9 6 3\n' },
      { stdin: '2\n1 2\n3 4\n', expectedStdout: '3 1\n4 2\n', isHidden: true },
    ],
    starterCode: {
      python: `def rotate(matrix):\n    pass\n\nn = int(input())\nmatrix = [list(map(int, input().split())) for _ in range(n)]\nrotate(matrix)\nfor row in matrix:\n    print(*row)`,
      javascript: `function rotate(matrix) {\n}\nconst lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\nconst n = parseInt(lines[0]);\nconst matrix = [];\nfor(let i=1;i<=n;i++) matrix.push(lines[i].split(' ').map(Number));\nrotate(matrix);\nmatrix.forEach(r => console.log(r.join(' ')));`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[][] m = new int[n][n];\n        for(int i=0;i<n;i++) for(int j=0;j<n;j++) m[i][j]=sc.nextInt();\n        // rotate in-place\n        for(int[] r:m) {\n            StringBuilder sb = new StringBuilder();\n            for(int j=0;j<n;j++) { if(j>0)sb.append(' '); sb.append(r[j]); }\n            System.out.println(sb);\n        }\n    }\n}`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin>>n;\n    vector<vector<int>> m(n, vector<int>(n));\n    for(auto& r:m) for(auto& x:r) cin>>x;\n    // rotate in-place\n    for(auto& r:m) { for(int j=0;j<n;j++) { if(j) cout<<' '; cout<<r[j]; } cout<<endl; }\n}`,
    },
  },
];

async function seed() {
  await connectDB();

  for (const p of PROBLEMS) {
    const existing = await Problem.findOne({ slug: p.slug });
    if (existing) {
      // Update existing with company tags and new data
      existing.companyTags = p.companyTags;
      existing.tags = p.tags;
      if (!existing.description || existing.description.length < p.description.length) {
        existing.description = p.description;
      }
      if (!existing.testCases?.length || existing.testCases.length < p.testCases.length) {
        existing.testCases = p.testCases as any;
      }
      await existing.save();
      console.log(`🔄 Updated: ${p.slug}`);
      continue;
    }
    await Problem.create(p);
    console.log(`✅ Created: ${p.slug} [${p.difficulty}] — ${p.companyTags.join(', ')}`);
  }

  const total = await Problem.countDocuments();
  console.log(`\n🎉 Done! Total problems in DB: ${total}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
