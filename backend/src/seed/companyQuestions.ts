/**
 * Seed default company questions & popular sheet problems (Striver's SDE Sheet, etc.)
 * Run: npx tsx src/seed/companyQuestions.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Problem } from '../models/Problem.js';

interface Seed {
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

/* ────────────────────── Striver SDE Sheet Favorites ────────────────────── */
const STRIVER_PROBLEMS: Seed[] = [
  {
    slug: 'set-matrix-zeroes',
    title: 'Set Matrix Zeroes',
    difficulty: 'Medium',
    tags: ['array', 'matrix', 'hash-table'],
    companyTags: ['Amazon', 'Microsoft', 'Google', 'Meta'],
    description:
      'Given an `m x n` integer matrix, if an element is `0`, set its entire row and column to `0`.\n\nYou must do it **in place**.',
    inputFormat: 'Line 1: m n\nNext m lines: n integers per line.',
    outputFormat: 'm lines of n integers — the modified matrix.',
    constraints: '1 ≤ m, n ≤ 200\n-2³¹ ≤ matrix[i][j] ≤ 2³¹ - 1',
    examples: [
      { input: '3 3\n1 1 1\n1 0 1\n1 1 1', output: '1 0 1\n0 0 0\n1 0 1', explanation: 'matrix[1][1] is 0, so row 1 and col 1 become 0.' },
    ],
    testCases: [
      { stdin: '3 3\n1 1 1\n1 0 1\n1 1 1', expectedStdout: '1 0 1\n0 0 0\n1 0 1' },
      { stdin: '3 4\n0 1 2 0\n3 4 5 2\n1 3 1 5', expectedStdout: '0 0 0 0\n0 4 5 0\n0 3 1 0' },
      { stdin: '1 1\n0', expectedStdout: '0', isHidden: true },
    ],
    starterCode: {
      python: 'def solve():\n    m, n = map(int, input().split())\n    matrix = [list(map(int, input().split())) for _ in range(m)]\n    # your code here\n    for row in matrix:\n        print(*row)\n\nsolve()',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst [m,n] = lines[0].split(" ").map(Number);\nconst matrix = [];\nfor(let i=1;i<=m;i++) matrix.push(lines[i].split(" ").map(Number));\n// your code here\nmatrix.forEach(r=>console.log(r.join(" ")));',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int m=sc.nextInt(), n=sc.nextInt();\n    int[][] mat = new int[m][n];\n    for(int i=0;i<m;i++) for(int j=0;j<n;j++) mat[i][j]=sc.nextInt();\n    // your code here\n    StringBuilder sb = new StringBuilder();\n    for(int[] row:mat){ for(int j=0;j<n;j++){ if(j>0)sb.append(" "); sb.append(row[j]); } sb.append("\\n"); }\n    System.out.print(sb);\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int m,n; cin>>m>>n;\n  vector<vector<int>> mat(m,vector<int>(n));\n  for(auto&r:mat) for(auto&x:r) cin>>x;\n  // your code here\n  for(auto&r:mat){ for(int j=0;j<n;j++) cout<<(j?" ":"")<<r[j]; cout<<"\\n"; }\n}',
    },
  },
  {
    slug: 'pascals-triangle',
    title: "Pascal's Triangle",
    difficulty: 'Easy',
    tags: ['array', 'dynamic-programming', 'math'],
    companyTags: ['Amazon', 'Microsoft', 'Google', 'Adobe'],
    description:
      "Given an integer `numRows`, return the first `numRows` of Pascal's triangle.\n\nIn Pascal's triangle, each number is the sum of the two numbers directly above it.",
    inputFormat: 'A single integer numRows.',
    outputFormat: 'numRows lines — each line has the elements of that row.',
    constraints: '1 ≤ numRows ≤ 30',
    examples: [
      { input: '5', output: '1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1' },
    ],
    testCases: [
      { stdin: '5', expectedStdout: '1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1' },
      { stdin: '1', expectedStdout: '1' },
      { stdin: '3', expectedStdout: '1\n1 1\n1 2 1', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\n# your code here',
      javascript: 'const n = parseInt(require("fs").readFileSync("/dev/stdin","utf8"));\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    int n = new Scanner(System.in).nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  // your code here\n}',
    },
  },
  {
    slug: 'next-permutation',
    title: 'Next Permutation',
    difficulty: 'Medium',
    tags: ['array', 'two-pointers', 'math'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Goldman Sachs'],
    description:
      'Given an array of integers `nums`, find the next lexicographically greater permutation.\n\nIf no such permutation exists (the array is sorted in descending order), rearrange it as the lowest possible order (sorted ascending).\n\nThe replacement must be **in place** and use only constant extra memory.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers — the array.',
    outputFormat: 'The next permutation as space-separated integers.',
    constraints: '1 ≤ n ≤ 100\n0 ≤ nums[i] ≤ 100',
    examples: [
      { input: '3\n1 2 3', output: '1 3 2', explanation: 'Next permutation of [1,2,3] is [1,3,2].' },
      { input: '3\n3 2 1', output: '1 2 3', explanation: 'No greater permutation, wrap around.' },
    ],
    testCases: [
      { stdin: '3\n1 2 3', expectedStdout: '1 3 2' },
      { stdin: '3\n3 2 1', expectedStdout: '1 2 3' },
      { stdin: '4\n1 1 5 1', expectedStdout: '1 5 1 1', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here\nprint(*nums)',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst n = parseInt(lines[0]);\nconst nums = lines[1].split(" ").map(Number);\n// your code here\nconsole.log(nums.join(" "));',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] nums = new int[n];\n    for(int i=0;i<n;i++) nums[i]=sc.nextInt();\n    // your code here\n    StringBuilder sb = new StringBuilder();\n    for(int i=0;i<n;i++){ if(i>0)sb.append(" "); sb.append(nums[i]); }\n    System.out.println(sb);\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n  for(int i=0;i<n;i++) cout<<(i?" ":"")<<a[i]; cout<<endl;\n}',
    },
  },
  {
    slug: 'kadanes-algorithm',
    title: "Kadane's Algorithm — Maximum Subarray",
    difficulty: 'Medium',
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Apple', 'Adobe', 'Goldman Sachs'],
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA **subarray** is a contiguous non-empty sequence of elements within an array.",
    inputFormat: 'Line 1: integer n\nLine 2: n integers.',
    outputFormat: 'A single integer — the maximum subarray sum.',
    constraints: '1 ≤ n ≤ 10⁵\n-10⁴ ≤ nums[i] ≤ 10⁴',
    examples: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
    ],
    testCases: [
      { stdin: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedStdout: '6' },
      { stdin: '1\n1', expectedStdout: '1' },
      { stdin: '5\n5 4 -1 7 8', expectedStdout: '23', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'sort-colors',
    title: 'Sort Colors (Dutch National Flag)',
    difficulty: 'Medium',
    tags: ['array', 'two-pointers', 'sorting'],
    companyTags: ['Amazon', 'Microsoft', 'Google', 'Meta', 'Adobe'],
    description:
      'Given an array `nums` with `n` objects colored red (0), white (1), or blue (2), sort them **in-place** so that objects of the same color are adjacent.\n\nYou must solve this without using the library sort function. Use the **Dutch National Flag** algorithm to solve in one pass.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers (each 0, 1, or 2).',
    outputFormat: 'The sorted array as space-separated integers.',
    constraints: '1 ≤ n ≤ 300\nnums[i] is 0, 1, or 2.',
    examples: [
      { input: '6\n2 0 2 1 1 0', output: '0 0 1 1 2 2' },
    ],
    testCases: [
      { stdin: '6\n2 0 2 1 1 0', expectedStdout: '0 0 1 1 2 2' },
      { stdin: '3\n2 0 1', expectedStdout: '0 1 2' },
      { stdin: '1\n0', expectedStdout: '0', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here\nprint(*nums)',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\n// your code here\nconsole.log(nums.join(" "));',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n    StringBuilder sb=new StringBuilder();\n    for(int i=0;i<n;i++){if(i>0)sb.append(" ");sb.append(a[i]);}\n    System.out.println(sb);\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n  for(int i=0;i<n;i++) cout<<(i?" ":"")<<a[i]; cout<<endl;\n}',
    },
  },
  {
    slug: 'stock-buy-sell-ii',
    title: 'Best Time to Buy and Sell Stock II',
    difficulty: 'Medium',
    tags: ['array', 'dynamic-programming', 'greedy'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Goldman Sachs', 'Flipkart'],
    description:
      'You are given an integer array `prices` where `prices[i]` is the price of a given stock on the i-th day.\n\nOn each day, you may decide to buy and/or sell the stock. You can only hold **at most one share** at a time.\n\nFind the **maximum profit** you can achieve. You may complete as many transactions as you like.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers — prices.',
    outputFormat: 'A single integer — the maximum profit.',
    constraints: '1 ≤ n ≤ 3 × 10⁴\n0 ≤ prices[i] ≤ 10⁴',
    examples: [
      { input: '6\n7 1 5 3 6 4', output: '7', explanation: 'Buy day 2 (1), sell day 3 (5) = 4. Buy day 4 (3), sell day 5 (6) = 3. Total = 7.' },
    ],
    testCases: [
      { stdin: '6\n7 1 5 3 6 4', expectedStdout: '7' },
      { stdin: '5\n1 2 3 4 5', expectedStdout: '4' },
      { stdin: '5\n7 6 4 3 1', expectedStdout: '0', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nprices = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst prices = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] p = new int[n];\n    for(int i=0;i<n;i++) p[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> p(n);\n  for(auto&x:p) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'rotate-matrix',
    title: 'Rotate Image (90° Clockwise)',
    difficulty: 'Medium',
    tags: ['array', 'matrix', 'math'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Apple', 'Adobe'],
    description:
      'You are given an `n × n` 2D matrix. Rotate the image by 90 degrees clockwise **in-place**.',
    inputFormat: 'Line 1: integer n\nNext n lines: n integers per line.',
    outputFormat: 'n lines of n integers — the rotated matrix.',
    constraints: '1 ≤ n ≤ 20\n-1000 ≤ matrix[i][j] ≤ 1000',
    examples: [
      { input: '3\n1 2 3\n4 5 6\n7 8 9', output: '7 4 1\n8 5 2\n9 6 3' },
    ],
    testCases: [
      { stdin: '3\n1 2 3\n4 5 6\n7 8 9', expectedStdout: '7 4 1\n8 5 2\n9 6 3' },
      { stdin: '2\n1 2\n3 4', expectedStdout: '3 1\n4 2' },
      { stdin: '4\n5 1 9 11\n2 4 8 10\n13 3 6 7\n15 14 12 16', expectedStdout: '15 13 2 5\n14 3 4 1\n12 6 8 9\n16 7 10 11', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nmatrix = [list(map(int, input().split())) for _ in range(n)]\n# your code here\nfor row in matrix:\n    print(*row)',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst n = parseInt(lines[0]);\nconst matrix = [];\nfor(let i=1;i<=n;i++) matrix.push(lines[i].split(" ").map(Number));\n// your code here\nmatrix.forEach(r=>console.log(r.join(" ")));',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[][] m = new int[n][n];\n    for(int i=0;i<n;i++) for(int j=0;j<n;j++) m[i][j]=sc.nextInt();\n    // your code here\n    StringBuilder sb = new StringBuilder();\n    for(int[] r:m){for(int j=0;j<n;j++){if(j>0)sb.append(" ");sb.append(r[j]);}sb.append("\\n");}\n    System.out.print(sb);\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<vector<int>> m(n,vector<int>(n));\n  for(auto&r:m) for(auto&x:r) cin>>x;\n  // your code here\n  for(auto&r:m){for(int j=0;j<n;j++) cout<<(j?" ":"")<<r[j]; cout<<"\\n";}\n}',
    },
  },
  {
    slug: 'merge-overlapping-intervals',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    tags: ['array', 'sorting', 'intervals'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Adobe', 'Goldman Sachs'],
    description:
      'Given an array of intervals where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
    inputFormat: 'Line 1: integer n (number of intervals)\nNext n lines: two integers start end.',
    outputFormat: 'One interval per line (start end), sorted by start.',
    constraints: '1 ≤ n ≤ 10⁴\n0 ≤ start ≤ end ≤ 10⁴',
    examples: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', output: '1 6\n8 10\n15 18', explanation: '[1,3] and [2,6] overlap → merge to [1,6].' },
    ],
    testCases: [
      { stdin: '4\n1 3\n2 6\n8 10\n15 18', expectedStdout: '1 6\n8 10\n15 18' },
      { stdin: '2\n1 4\n4 5', expectedStdout: '1 5' },
      { stdin: '1\n1 1', expectedStdout: '1 1', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nintervals = [list(map(int, input().split())) for _ in range(n)]\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst n = parseInt(lines[0]);\nconst intervals = [];\nfor(let i=1;i<=n;i++) intervals.push(lines[i].split(" ").map(Number));\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[][] iv = new int[n][2];\n    for(int i=0;i<n;i++){iv[i][0]=sc.nextInt();iv[i][1]=sc.nextInt();}\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<pair<int,int>> iv(n);\n  for(auto&[a,b]:iv) cin>>a>>b;\n  // your code here\n}',
    },
  },
  {
    slug: 'find-duplicate-number',
    title: 'Find the Duplicate Number',
    difficulty: 'Medium',
    tags: ['array', 'two-pointers', 'binary-search', 'linked-list'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Adobe', 'Flipkart'],
    description:
      "Given an array of integers `nums` containing `n + 1` integers where each integer is in the range `[1, n]` inclusive.\n\nThere is only **one repeated number** in nums, return this repeated number.\n\nYou must solve it without modifying the array and using only constant extra space (Floyd's cycle detection).",
    inputFormat: 'Line 1: integer n+1 (length of array)\nLine 2: n+1 integers.',
    outputFormat: 'A single integer — the duplicate number.',
    constraints: '1 ≤ n ≤ 10⁵\nnums.length == n + 1\n1 ≤ nums[i] ≤ n',
    examples: [
      { input: '5\n1 3 4 2 2', output: '2' },
      { input: '4\n3 1 3 4', output: '3' },
    ],
    testCases: [
      { stdin: '5\n1 3 4 2 2', expectedStdout: '2' },
      { stdin: '4\n3 1 3 4', expectedStdout: '3' },
      { stdin: '2\n1 1', expectedStdout: '1', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'count-inversions',
    title: 'Count Inversions (Merge Sort)',
    difficulty: 'Hard',
    tags: ['array', 'divide-and-conquer', 'merge-sort'],
    companyTags: ['Google', 'Amazon', 'Goldman Sachs', 'Adobe'],
    description:
      'Given an array of integers, count the number of **inversions**.\n\nAn inversion is a pair `(i, j)` where `i < j` and `arr[i] > arr[j]`.\n\nUse a modified merge sort for O(n log n) solution.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers.',
    outputFormat: 'A single integer — the inversion count.',
    constraints: '1 ≤ n ≤ 5 × 10⁵\n1 ≤ arr[i] ≤ 10⁹',
    examples: [
      { input: '5\n2 4 1 3 5', output: '3', explanation: 'Inversions: (2,1), (4,1), (4,3).' },
    ],
    testCases: [
      { stdin: '5\n2 4 1 3 5', expectedStdout: '3' },
      { stdin: '5\n5 4 3 2 1', expectedStdout: '10' },
      { stdin: '3\n1 2 3', expectedStdout: '0', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\narr = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst arr = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    long[] a = new long[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextLong();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<long long> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    tags: ['array', 'binary-search'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Apple', 'Adobe', 'Flipkart'],
    description:
      'There is a sorted array which was rotated at some pivot. Given the array `nums` and a `target`, return the index if found, else `-1`.\n\nYou must achieve O(log n) runtime complexity.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers\nLine 3: target integer.',
    outputFormat: 'Index of target, or -1.',
    constraints: '1 ≤ n ≤ 5000\n-10⁴ ≤ nums[i] ≤ 10⁴\nAll values are unique.',
    examples: [
      { input: '7\n4 5 6 7 0 1 2\n0', output: '4' },
    ],
    testCases: [
      { stdin: '7\n4 5 6 7 0 1 2\n0', expectedStdout: '4' },
      { stdin: '7\n4 5 6 7 0 1 2\n3', expectedStdout: '-1' },
      { stdin: '1\n1\n1', expectedStdout: '0', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\nconst target = parseInt(lines[2]);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    int target = sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  int t; cin>>t;\n  // your code here\n}',
    },
  },
  {
    slug: 'pow-x-n',
    title: 'Pow(x, n) — Fast Exponentiation',
    difficulty: 'Medium',
    tags: ['math', 'recursion', 'binary-search'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Goldman Sachs'],
    description:
      'Implement `pow(x, n)`, which calculates `x` raised to the power `n` (i.e., x^n).\n\nUse binary exponentiation for O(log n) time.',
    inputFormat: 'Line 1: float x\nLine 2: integer n.',
    outputFormat: 'Result rounded to 5 decimal places.',
    constraints: '-100.0 < x < 100.0\n-2³¹ ≤ n ≤ 2³¹ - 1\nResult fits in a 64-bit float.',
    examples: [
      { input: '2.00000\n10', output: '1024.00000' },
      { input: '2.10000\n3', output: '9.26100' },
    ],
    testCases: [
      { stdin: '2.00000\n10', expectedStdout: '1024.00000' },
      { stdin: '2.10000\n3', expectedStdout: '9.26100' },
      { stdin: '2.00000\n-2', expectedStdout: '0.25000', isHidden: true },
    ],
    starterCode: {
      python: 'x = float(input())\nn = int(input())\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst x = parseFloat(lines[0]);\nconst n = parseInt(lines[1]);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    double x = sc.nextDouble();\n    int n = sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  double x; int n;\n  cin>>x>>n;\n  // your code here\n}',
    },
  },
  {
    slug: 'majority-element-ii',
    title: 'Majority Element II (Boyer-Moore)',
    difficulty: 'Medium',
    tags: ['array', 'hash-table', 'counting'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Adobe'],
    description:
      'Given an integer array of size `n`, find all elements that appear more than ⌊n/3⌋ times.\n\nUse Boyer-Moore voting algorithm for O(1) space.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers.',
    outputFormat: 'Space-separated majority elements in sorted order. If none, print "none".',
    constraints: '1 ≤ n ≤ 5 × 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹',
    examples: [
      { input: '6\n3 2 3 1 1 1', output: '1 3' },
    ],
    testCases: [
      { stdin: '6\n3 2 3 1 1 1', expectedStdout: '1 3' },
      { stdin: '3\n1 2 3', expectedStdout: 'none' },
      { stdin: '1\n1', expectedStdout: '1', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'reverse-pairs',
    title: 'Reverse Pairs',
    difficulty: 'Hard',
    tags: ['array', 'divide-and-conquer', 'merge-sort', 'binary-indexed-tree'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Goldman Sachs'],
    description:
      'Given an integer array `nums`, return the number of **reverse pairs**.\n\nA reverse pair is a pair `(i, j)` where `0 ≤ i < j < nums.length` and `nums[i] > 2 * nums[j]`.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers.',
    outputFormat: 'A single integer — the count of reverse pairs.',
    constraints: '1 ≤ n ≤ 5 × 10⁴\n-2³¹ ≤ nums[i] ≤ 2³¹ - 1',
    examples: [
      { input: '4\n1 3 2 3', output: '1' },
      { input: '5\n2 4 3 5 1', output: '3' },
    ],
    testCases: [
      { stdin: '4\n1 3 2 3', expectedStdout: '1' },
      { stdin: '5\n2 4 3 5 1', expectedStdout: '3' },
      { stdin: '3\n1 2 3', expectedStdout: '0', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    long[] a = new long[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextLong();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<long long> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'four-sum',
    title: '4Sum',
    difficulty: 'Medium',
    tags: ['array', 'two-pointers', 'sorting', 'hash-table'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Adobe', 'Goldman Sachs'],
    description:
      'Given an array `nums` of `n` integers, return an array of all the **unique quadruplets** `[nums[a], nums[b], nums[c], nums[d]]` such that:\n\n`nums[a] + nums[b] + nums[c] + nums[d] == target`\n\nReturn them in sorted order.',
    inputFormat: 'Line 1: n target\nLine 2: n integers.',
    outputFormat: 'One quadruplet per line, sorted. If none, print "none".',
    constraints: '1 ≤ n ≤ 200\n-10⁹ ≤ nums[i] ≤ 10⁹\n-10⁹ ≤ target ≤ 10⁹',
    examples: [
      { input: '6 0\n1 0 -1 0 -2 2', output: '-2 -1 1 2\n-2 0 0 2\n-1 0 0 1' },
    ],
    testCases: [
      { stdin: '6 0\n1 0 -1 0 -2 2', expectedStdout: '-2 -1 1 2\n-2 0 0 2\n-1 0 0 1' },
      { stdin: '5 8\n2 2 2 2 2', expectedStdout: '2 2 2 2' },
      { stdin: '4 0\n0 0 0 0', expectedStdout: '0 0 0 0', isHidden: true },
    ],
    starterCode: {
      python: 'n, target = map(int, input().split())\nnums = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst [n,target]=lines[0].split(" ").map(Number);\nconst nums=lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n=sc.nextInt(),t=sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; long long t; cin>>n>>t;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
];

async function seed() {
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const p of STRIVER_PROBLEMS) {
    const exists = await Problem.findOne({ slug: p.slug });
    if (exists) {
      skipped++;
      console.log(`⏭️  Skipped (exists): ${p.slug}`);
      continue;
    }
    await Problem.create(p);
    created++;
    console.log(`✅ Created: ${p.title} [${p.companyTags.join(', ')}]`);
  }

  console.log(`\n🎉 Company questions seed complete: ${created} created, ${skipped} skipped (already exist).`);
  console.log(`Total Striver/company problems available: ${STRIVER_PROBLEMS.length}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
