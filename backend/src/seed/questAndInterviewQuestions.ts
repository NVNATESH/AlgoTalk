/**
 * questAndInterviewQuestions.ts — Seed additional company interview questions,
 * quest questions, and recommended goal templates (Striver's sheet, etc.)
 *
 * Run: npx tsx src/seed/questAndInterviewQuestions.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { connectDB } from '../config/db.js';
import { Problem } from '../models/Problem.js';
import { Goal } from '../models/Goal.js';

const ADMIN_USER_ID = '000000000000000000000000';

/* ────────────────────── Additional Company Interview Problems ────────────────────── */
const COMPANY_PROBLEMS = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy' as const,
    tags: ['array', 'hash-table'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Adobe', 'Goldman Sachs', 'Flipkart'],
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.',
    inputFormat: 'Line 1: n target\nLine 2: n integers.',
    outputFormat: 'Two integers — the indices (0-based).',
    constraints: '2 ≤ n ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹',
    examples: [{ input: '4 9\n2 7 11 15', output: '0 1', explanation: 'nums[0] + nums[1] = 2 + 7 = 9.' }],
    testCases: [
      { stdin: '4 9\n2 7 11 15', expectedStdout: '0 1' },
      { stdin: '3 6\n3 2 4', expectedStdout: '1 2' },
      { stdin: '2 6\n3 3', expectedStdout: '0 1', isHidden: true },
    ],
    starterCode: {
      python: 'n, target = map(int, input().split())\nnums = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst [n,target]=lines[0].split(" ").map(Number);\nconst nums=lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n=sc.nextInt(),t=sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n,t; cin>>n>>t;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'Easy' as const,
    tags: ['linked-list', 'recursion'],
    companyTags: ['Amazon', 'Microsoft', 'Google', 'Meta', 'Adobe', 'Flipkart'],
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.\n\nInput is given as space-separated values representing list nodes.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers — the linked list values.',
    outputFormat: 'The reversed list values space-separated.',
    constraints: '0 ≤ n ≤ 5000\n-5000 ≤ Node.val ≤ 5000',
    examples: [{ input: '5\n1 2 3 4 5', output: '5 4 3 2 1' }],
    testCases: [
      { stdin: '5\n1 2 3 4 5', expectedStdout: '5 4 3 2 1' },
      { stdin: '2\n1 2', expectedStdout: '2 1' },
      { stdin: '1\n1', expectedStdout: '1', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here\nprint(*nums[::-1])',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\n// your code here\nconsole.log(nums.reverse().join(" "));',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium' as const,
    tags: ['string', 'hash-table', 'sliding-window'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Apple', 'Adobe', 'Goldman Sachs'],
    description: 'Given a string `s`, find the length of the **longest substring** without repeating characters.',
    inputFormat: 'A single string s.',
    outputFormat: 'A single integer — the length.',
    constraints: '0 ≤ s.length ≤ 5 × 10⁴\ns consists of English letters, digits, symbols, spaces.',
    examples: [
      { input: 'abcabcbb', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 'bbbbb', output: '1' },
    ],
    testCases: [
      { stdin: 'abcabcbb', expectedStdout: '3' },
      { stdin: 'bbbbb', expectedStdout: '1' },
      { stdin: 'pwwkew', expectedStdout: '3', isHidden: true },
    ],
    starterCode: {
      python: 's = input()\n# your code here',
      javascript: 'const s = require("fs").readFileSync("/dev/stdin","utf8").trim();\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    String s = new Scanner(System.in).nextLine();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  string s; getline(cin,s);\n  // your code here\n}',
    },
  },
  {
    slug: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'Medium' as const,
    tags: ['hash-table', 'linked-list', 'design'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Apple', 'Goldman Sachs', 'Flipkart'],
    description: 'Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` - Initialize with positive capacity.\n- `int get(int key)` - Return value if key exists, else -1.\n- `void put(int key, int value)` - Update or insert. Evict LRU key when capacity exceeded.',
    inputFormat: 'Line 1: capacity numOps\nNext numOps lines: "get key" or "put key value"',
    outputFormat: 'For each get operation, output the result on a new line.',
    constraints: '1 ≤ capacity ≤ 3000\n0 ≤ key ≤ 10⁴\n0 ≤ value ≤ 10⁵\nAt most 2 × 10⁵ operations.',
    examples: [
      { input: '2 7\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1', output: '1\n-1\n-1' },
    ],
    testCases: [
      { stdin: '2 7\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1', expectedStdout: '1\n-1\n-1' },
      { stdin: '1 3\nput 1 1\nput 2 2\nget 1', expectedStdout: '-1', isHidden: true },
    ],
    starterCode: {
      python: 'cap, ops = map(int, input().split())\n# Implement LRU Cache here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst [cap,ops]=lines[0].split(" ").map(Number);\n// Implement LRU Cache here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int cap = sc.nextInt(), ops = sc.nextInt();\n    // Implement LRU Cache here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int cap,ops; cin>>cap>>ops;\n  // Implement LRU Cache here\n}',
    },
  },
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard' as const,
    tags: ['array', 'two-pointers', 'stack', 'dynamic-programming'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Apple', 'Goldman Sachs', 'Adobe'],
    description: 'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    inputFormat: 'Line 1: integer n\nLine 2: n non-negative integers — the height array.',
    outputFormat: 'A single integer — total water trapped.',
    constraints: 'n == height.length\n1 ≤ n ≤ 2 × 10⁴\n0 ≤ height[i] ≤ 10⁵',
    examples: [
      { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6' },
    ],
    testCases: [
      { stdin: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expectedStdout: '6' },
      { stdin: '5\n4 2 0 3 2 5', expectedStdout: '9' },
      { stdin: '3\n1 0 1', expectedStdout: '1', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nheight = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst height = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] h = new int[n];\n    for(int i=0;i<n;i++) h[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> h(n);\n  for(auto&x:h) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'median-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'Hard' as const,
    tags: ['array', 'binary-search', 'divide-and-conquer'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Goldman Sachs'],
    description: 'Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the **median** of the two sorted arrays.\n\nThe overall run time complexity should be O(log(m+n)).',
    inputFormat: 'Line 1: integers m n\nLine 2: m integers (nums1)\nLine 3: n integers (nums2)',
    outputFormat: 'The median as a decimal (1 decimal place if not integer).',
    constraints: '0 ≤ m, n ≤ 1000\n-10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶\nm + n ≥ 1',
    examples: [
      { input: '2 1\n1 3\n2', output: '2.0' },
      { input: '2 2\n1 2\n3 4', output: '2.5' },
    ],
    testCases: [
      { stdin: '2 1\n1 3\n2', expectedStdout: '2.0' },
      { stdin: '2 2\n1 2\n3 4', expectedStdout: '2.5' },
      { stdin: '1 1\n1\n2', expectedStdout: '1.5', isHidden: true },
    ],
    starterCode: {
      python: 'm, n = map(int, input().split())\nnums1 = list(map(int, input().split())) if m else []\nnums2 = list(map(int, input().split())) if n else []\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst [m,n]=lines[0].split(" ").map(Number);\nconst nums1=m?lines[1].split(" ").map(Number):[];\nconst nums2=n?lines[2].split(" ").map(Number):[];\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int m=sc.nextInt(),n=sc.nextInt();\n    int[] a=new int[m],b=new int[n];\n    for(int i=0;i<m;i++) a[i]=sc.nextInt();\n    for(int i=0;i<n;i++) b[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int m,n; cin>>m>>n;\n  vector<int> a(m),b(n);\n  for(auto&x:a) cin>>x;\n  for(auto&x:b) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'longest-palindromic-substring',
    title: 'Longest Palindromic Substring',
    difficulty: 'Medium' as const,
    tags: ['string', 'dynamic-programming', 'two-pointers'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Adobe', 'Goldman Sachs'],
    description: 'Given a string `s`, return the **longest palindromic substring** in `s`.',
    inputFormat: 'A single string s.',
    outputFormat: 'The longest palindromic substring.',
    constraints: '1 ≤ s.length ≤ 1000\ns consists of only digits and English letters.',
    examples: [
      { input: 'babad', output: 'bab', explanation: '"aba" is also a valid answer.' },
    ],
    testCases: [
      { stdin: 'babad', expectedStdout: 'bab' },
      { stdin: 'cbbd', expectedStdout: 'bb' },
      { stdin: 'a', expectedStdout: 'a', isHidden: true },
    ],
    starterCode: {
      python: 's = input()\n# your code here',
      javascript: 'const s = require("fs").readFileSync("/dev/stdin","utf8").trim();\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    String s = new Scanner(System.in).nextLine();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  string s; cin>>s;\n  // your code here\n}',
    },
  },
  {
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium' as const,
    tags: ['array', 'dynamic-programming', 'bfs'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Apple', 'Goldman Sachs', 'Flipkart'],
    description: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins needed to make up that amount. If that amount cannot be made up, return `-1`.',
    inputFormat: 'Line 1: n amount\nLine 2: n integers — coin denominations.',
    outputFormat: 'A single integer — minimum coins or -1.',
    constraints: '1 ≤ coins.length ≤ 12\n1 ≤ coins[i] ≤ 2³¹ - 1\n0 ≤ amount ≤ 10⁴',
    examples: [
      { input: '3 11\n1 5 2', output: '3', explanation: '11 = 5 + 5 + 1' },
    ],
    testCases: [
      { stdin: '3 11\n1 5 2', expectedStdout: '3' },
      { stdin: '1 3\n2', expectedStdout: '-1' },
      { stdin: '1 0\n1', expectedStdout: '0', isHidden: true },
    ],
    starterCode: {
      python: 'n, amount = map(int, input().split())\ncoins = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst [n,amount]=lines[0].split(" ").map(Number);\nconst coins=lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n=sc.nextInt(),amount=sc.nextInt();\n    int[] c = new int[n];\n    for(int i=0;i<n;i++) c[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n,amount; cin>>n>>amount;\n  vector<int> c(n);\n  for(auto&x:c) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium' as const,
    tags: ['array', 'bfs', 'dfs', 'graph', 'matrix'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Apple', 'Adobe'],
    description: 'Given an `m x n` 2D binary grid which represents a map of `1`s (land) and `0`s (water), return the number of islands.\n\nAn **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
    inputFormat: 'Line 1: m n\nNext m lines: n characters (0 or 1, space-separated).',
    outputFormat: 'A single integer — number of islands.',
    constraints: '1 ≤ m, n ≤ 300\ngrid[i][j] is 0 or 1.',
    examples: [
      { input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', output: '1' },
      { input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', output: '3' },
    ],
    testCases: [
      { stdin: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', expectedStdout: '1' },
      { stdin: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', expectedStdout: '3' },
      { stdin: '1 1\n1', expectedStdout: '1', isHidden: true },
    ],
    starterCode: {
      python: 'm, n = map(int, input().split())\ngrid = [list(map(int, input().split())) for _ in range(m)]\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst [m,n]=lines[0].split(" ").map(Number);\nconst grid=[];\nfor(let i=1;i<=m;i++) grid.push(lines[i].split(" ").map(Number));\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int m=sc.nextInt(),n=sc.nextInt();\n    int[][] g = new int[m][n];\n    for(int i=0;i<m;i++) for(int j=0;j<n;j++) g[i][j]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int m,n; cin>>m>>n;\n  vector<vector<int>> g(m,vector<int>(n));\n  for(auto&r:g) for(auto&x:r) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'binary-tree-level-order',
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'Medium' as const,
    tags: ['tree', 'bfs', 'binary-tree'],
    companyTags: ['Amazon', 'Microsoft', 'Meta', 'Apple', 'Adobe'],
    description: 'Given the root of a binary tree, return the level order traversal of its nodes values (i.e., from left to right, level by level).\n\nInput is given as space-separated values in level-order (use -1 for null).',
    inputFormat: 'Line 1: n (number of nodes including nulls)\nLine 2: n values (-1 = null)',
    outputFormat: 'Each level on a separate line, values space-separated.',
    constraints: '0 ≤ number of nodes ≤ 2000\n-1000 ≤ Node.val ≤ 1000',
    examples: [
      { input: '7\n3 9 20 -1 -1 15 7', output: '3\n9 20\n15 7' },
    ],
    testCases: [
      { stdin: '7\n3 9 20 -1 -1 15 7', expectedStdout: '3\n9 20\n15 7' },
      { stdin: '1\n1', expectedStdout: '1' },
      { stdin: '3\n1 -1 2', expectedStdout: '1\n2', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnodes = list(map(int, input().split()))\n# your code here — build tree and do BFS level order',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nodes = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] nodes = new int[n];\n    for(int i=0;i<n;i++) nodes[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> nodes(n);\n  for(auto&x:nodes) cin>>x;\n  // your code here\n}',
    },
  },
  {
    slug: 'word-break',
    title: 'Word Break',
    difficulty: 'Medium' as const,
    tags: ['string', 'dynamic-programming', 'hash-table', 'trie'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Adobe'],
    description: 'Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.',
    inputFormat: 'Line 1: the string s\nLine 2: number of words in dictionary\nLine 3: space-separated dictionary words',
    outputFormat: 'true or false',
    constraints: '1 ≤ s.length ≤ 300\n1 ≤ wordDict.length ≤ 1000\n1 ≤ wordDict[i].length ≤ 20',
    examples: [
      { input: 'leetcode\n2\nleet code', output: 'true', explanation: '"leetcode" = "leet" + "code"' },
    ],
    testCases: [
      { stdin: 'leetcode\n2\nleet code', expectedStdout: 'true' },
      { stdin: 'applepenapple\n2\napple pen', expectedStdout: 'true' },
      { stdin: 'catsandog\n5\ncats dog sand and cat', expectedStdout: 'false', isHidden: true },
    ],
    starterCode: {
      python: 's = input()\nn = int(input())\nwords = input().split()\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst s=lines[0],words=lines[2].split(" ");\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    String s = sc.nextLine();\n    int n = Integer.parseInt(sc.nextLine());\n    String[] words = sc.nextLine().split(" ");\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  string s; cin>>s;\n  int n; cin>>n;\n  vector<string> words(n);\n  for(auto&w:words) cin>>w;\n  // your code here\n}',
    },
  },
  {
    slug: 'maximum-product-subarray',
    title: 'Maximum Product Subarray',
    difficulty: 'Medium' as const,
    tags: ['array', 'dynamic-programming'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Goldman Sachs'],
    description: 'Given an integer array `nums`, find a subarray that has the largest product, and return the product.',
    inputFormat: 'Line 1: integer n\nLine 2: n integers.',
    outputFormat: 'A single integer — the maximum product.',
    constraints: '1 ≤ n ≤ 2 × 10⁴\n-10 ≤ nums[i] ≤ 10',
    examples: [
      { input: '4\n2 3 -2 4', output: '6', explanation: '[2,3] has largest product 6.' },
    ],
    testCases: [
      { stdin: '4\n2 3 -2 4', expectedStdout: '6' },
      { stdin: '2\n-2 0', expectedStdout: '0' },
      { stdin: '3\n-2 -3 -4', expectedStdout: '12', isHidden: true },
    ],
    starterCode: {
      python: 'n = int(input())\nnums = list(map(int, input().split()))\n# your code here',
      javascript: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\nconst nums = lines[1].split(" ").map(Number);\n// your code here',
      java: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    int[] a = new int[n];\n    for(int i=0;i<n;i++) a[i]=sc.nextInt();\n    // your code here\n  }\n}',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n; cin>>n;\n  vector<int> a(n);\n  for(auto&x:a) cin>>x;\n  // your code here\n}',
    },
  },
];

/* ────────────────────── Additional Quest/Recommended Goal Templates ────────────────────── */
const GOAL_TEMPLATES = [
  {
    name: "Striver's A2Z DSA Sheet",
    icon: '🔥',
    description: "Complete A2Z DSA Course by Striver — 450+ problems covering all patterns from basics to advanced.",
    topic: 'Data Structures & Algorithms',
    difficulty: 'Intermediate' as const,
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 200,
    xpReward: 1000,
    resources: [
      { title: "Striver's A2Z DSA Sheet", url: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/', type: 'docs' },
      { title: 'TakeUForward YouTube', url: 'https://www.youtube.com/c/takeUforward', type: 'youtube' },
    ],
    modules: [
      { title: 'Basics: Sorting & Math', description: 'Selection sort, bubble sort, insertion sort, basic math', topics: ['Sorting', 'Math', 'Recursion'], estimatedHours: 8, difficulty: 'Easy' as const },
      { title: 'Arrays', description: 'Easy to hard array problems, Kadane, Dutch Flag, etc.', topics: ['Arrays', 'Prefix Sum', 'Two Pointers', 'Kadane'], estimatedHours: 18, difficulty: 'Medium' as const },
      { title: 'Binary Search', description: 'BS on answers, search space reduction, min/max problems', topics: ['Binary Search', 'Search Space', 'Rotated Arrays'], estimatedHours: 14, difficulty: 'Medium' as const },
      { title: 'Strings', description: 'Pattern matching, KMP, Rabin Karp, Z-algorithm', topics: ['Strings', 'KMP', 'Z-algo', 'Anagram'], estimatedHours: 10, difficulty: 'Medium' as const },
      { title: 'Linked Lists', description: 'Reversal, cycle detection, merge, clone', topics: ['Linked List', 'Floyd Cycle', 'Merge Sort'], estimatedHours: 12, difficulty: 'Medium' as const },
      { title: 'Recursion & Backtracking', description: 'Subsets, permutations, N-Queens, Sudoku solver', topics: ['Recursion', 'Backtracking', 'N-Queens'], estimatedHours: 16, difficulty: 'Hard' as const },
      { title: 'Stacks & Queues', description: 'Monotonic stack, NGE, celebrity problem, LRU', topics: ['Stacks', 'Queues', 'Monotonic Stack', 'LRU'], estimatedHours: 12, difficulty: 'Medium' as const },
      { title: 'Binary Trees', description: 'Traversals, diameter, LCA, views, serialization', topics: ['Binary Tree', 'DFS', 'BFS', 'Morris Traversal'], estimatedHours: 18, difficulty: 'Medium' as const },
      { title: 'BST', description: 'Validate, LCA, kth smallest, floor/ceil', topics: ['BST', 'Inorder', 'Validation'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Graphs', description: 'BFS, DFS, topological sort, shortest paths, MST', topics: ['Graphs', 'Dijkstra', 'Bellman-Ford', 'Kruskal', 'TopoSort'], estimatedHours: 24, difficulty: 'Hard' as const },
      { title: 'Dynamic Programming', description: '1D, 2D, subsequences, knapsack, partition, stocks', topics: ['DP', 'Knapsack', 'LIS', 'LCS', 'MCM', 'Stocks'], estimatedHours: 30, difficulty: 'Hard' as const },
      { title: 'Tries & Advanced', description: 'Trie insert/search, XOR queries, segment trees', topics: ['Trie', 'Bit Manipulation', 'Segment Tree'], estimatedHours: 10, difficulty: 'Hard' as const },
    ],
  },
  {
    name: 'NeetCode 150',
    icon: '💻',
    description: 'The most popular 150 problems for coding interviews, organized by pattern.',
    topic: 'Interview Preparation',
    difficulty: 'Intermediate' as const,
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 100,
    xpReward: 500,
    resources: [
      { title: 'NeetCode 150', url: 'https://neetcode.io/practice', type: 'practice' },
      { title: 'NeetCode YouTube', url: 'https://www.youtube.com/c/NeetCode', type: 'youtube' },
    ],
    modules: [
      { title: 'Arrays & Hashing', description: 'Two Sum, Group Anagrams, Top K Frequent, etc.', topics: ['Arrays', 'Hash Maps', 'Frequency Count'], estimatedHours: 8, difficulty: 'Easy' as const },
      { title: 'Two Pointers', description: 'Valid Palindrome, 3Sum, Container With Most Water', topics: ['Two Pointers', 'Sorting'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Sliding Window', description: 'Best Time to Buy Stock, Longest Substring, Min Window', topics: ['Sliding Window', 'String'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Stack', description: 'Valid Parentheses, Min Stack, Daily Temperatures', topics: ['Stack', 'Monotonic Stack'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Binary Search', description: 'Search in Rotated Array, Find Minimum, Koko Eating', topics: ['Binary Search'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Trees', description: 'Invert Tree, Max Depth, Level Order, Validate BST', topics: ['Trees', 'DFS', 'BFS', 'BST'], estimatedHours: 12, difficulty: 'Medium' as const },
      { title: 'Heap / Priority Queue', description: 'Kth Largest, Task Scheduler, Merge K Lists', topics: ['Heap', 'Priority Queue'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Backtracking', description: 'Subsets, Combination Sum, Permutations, N-Queens', topics: ['Backtracking', 'Recursion'], estimatedHours: 8, difficulty: 'Hard' as const },
      { title: 'Graphs', description: 'Number of Islands, Clone Graph, Course Schedule', topics: ['Graphs', 'BFS', 'DFS', 'Topological Sort'], estimatedHours: 12, difficulty: 'Hard' as const },
      { title: '1-D Dynamic Programming', description: 'Climbing Stairs, House Robber, Longest Palindrome', topics: ['DP', 'Memoization'], estimatedHours: 10, difficulty: 'Medium' as const },
      { title: '2-D Dynamic Programming', description: 'Unique Paths, LCS, Edit Distance, Coin Change', topics: ['DP', 'Grid DP', 'String DP'], estimatedHours: 10, difficulty: 'Hard' as const },
      { title: 'Greedy & Intervals', description: 'Jump Game, Gas Station, Merge Intervals', topics: ['Greedy', 'Intervals', 'Scheduling'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Bit Manipulation', description: 'Single Number, Counting Bits, Reverse Bits', topics: ['Bit Manipulation', 'XOR'], estimatedHours: 4, difficulty: 'Easy' as const },
    ],
  },
  {
    name: 'Microsoft Interview Prep',
    icon: '🪟',
    description: 'Targeted preparation for Microsoft SDE interviews — coding, system design, and behavioral.',
    topic: 'Microsoft Interview',
    difficulty: 'Advanced' as const,
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Microsoft',
    estimatedHours: 80,
    xpReward: 500,
    resources: [
      { title: 'LeetCode Microsoft Tag', url: 'https://leetcode.com/company/microsoft/', type: 'practice' },
      { title: 'Microsoft Careers', url: 'https://careers.microsoft.com/', type: 'docs' },
    ],
    modules: [
      { title: 'Microsoft DSA Hot Topics', description: 'Arrays, Trees, Graphs — most asked at MSFT', topics: ['Arrays', 'Trees', 'Graphs', 'DP', 'String'], estimatedHours: 20, difficulty: 'Hard' as const },
      { title: 'System Design', description: 'Design OneDrive, Teams, Azure services', topics: ['System Design', 'Distributed Systems', 'Cloud'], estimatedHours: 16, difficulty: 'Hard' as const },
      { title: 'Object-Oriented Design', description: 'Design patterns, SOLID, LLD problems', topics: ['OOD', 'SOLID', 'Design Patterns'], estimatedHours: 12, difficulty: 'Medium' as const },
      { title: 'SQL & Databases', description: 'Complex queries, indexing, stored procedures', topics: ['SQL', 'T-SQL', 'Indexing'], estimatedHours: 10, difficulty: 'Medium' as const },
      { title: 'Behavioral & Culture Fit', description: 'Growth mindset, collaboration, STAR stories', topics: ['Behavioral', 'Growth Mindset', 'STAR'], estimatedHours: 6, difficulty: 'Easy' as const },
    ],
  },
  {
    name: 'Meta (Facebook) Interview Prep',
    icon: '👤',
    description: 'Prepare for Meta E4/E5 interviews — heavy on coding speed, system design, and product sense.',
    topic: 'Meta Interview',
    difficulty: 'Advanced' as const,
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Meta',
    estimatedHours: 90,
    xpReward: 550,
    resources: [
      { title: 'LeetCode Meta Tag', url: 'https://leetcode.com/company/facebook/', type: 'practice' },
      { title: 'Meta Interview Guide', url: 'https://www.metacareers.com/life/preparing-for-your-software-engineering-interview-at-meta/', type: 'docs' },
    ],
    modules: [
      { title: 'Meta Coding Patterns', description: 'BFS, DFS, Sliding Window, Two Pointers — speed-focused', topics: ['BFS', 'DFS', 'Sliding Window', 'Two Pointers', 'Graph'], estimatedHours: 25, difficulty: 'Hard' as const },
      { title: 'System Design at Scale', description: 'Design News Feed, Messenger, Instagram', topics: ['System Design', 'Feed Ranking', 'Real-time', 'CDN'], estimatedHours: 20, difficulty: 'Hard' as const },
      { title: 'Product Architecture', description: 'Product thinking, metrics, trade-offs', topics: ['Product', 'Metrics', 'Trade-offs'], estimatedHours: 10, difficulty: 'Medium' as const },
      { title: 'Behavioral (Meta Values)', description: 'Move fast, be bold, focus on impact', topics: ['Behavioral', 'Meta Values', 'Leadership'], estimatedHours: 8, difficulty: 'Easy' as const },
    ],
  },
  {
    name: 'DSA Quest: Arrays to Graphs',
    icon: '⚔️',
    description: 'Progressive quest from basic arrays through graphs — unlock each level by completing the previous one.',
    topic: 'DSA Quest',
    difficulty: 'Beginner' as const,
    goalType: 'quest',
    category: 'dsa',
    estimatedHours: 60,
    xpReward: 350,
    resources: [
      { title: 'GeeksforGeeks DSA', url: 'https://www.geeksforgeeks.org/data-structures/', type: 'docs' },
    ],
    modules: [
      { title: 'Level 1: Arrays Basics', description: 'Traversal, reversal, rotation, searching', topics: ['Arrays', 'Linear Search', 'Reversal'], estimatedHours: 6, difficulty: 'Easy' as const },
      { title: 'Level 2: Sorting Algorithms', description: 'Bubble, selection, insertion, merge, quick sort', topics: ['Sorting', 'Merge Sort', 'Quick Sort'], estimatedHours: 8, difficulty: 'Easy' as const },
      { title: 'Level 3: Strings', description: 'Palindromes, anagrams, pattern matching', topics: ['Strings', 'Palindrome', 'Anagram'], estimatedHours: 6, difficulty: 'Easy' as const },
      { title: 'Level 4: Linked Lists', description: 'Insertion, deletion, reversal, cycle detection', topics: ['Linked List', 'Singly', 'Doubly', 'Cycle'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Level 5: Stacks & Queues', description: 'Implementation, balanced brackets, monotonic stack', topics: ['Stack', 'Queue', 'Deque'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Level 6: Trees', description: 'Binary tree traversals, height, diameter, LCA', topics: ['Binary Tree', 'Traversal', 'Height'], estimatedHours: 10, difficulty: 'Medium' as const },
      { title: 'Level 7: Graphs', description: 'BFS, DFS, connected components, shortest path', topics: ['Graph', 'BFS', 'DFS', 'Shortest Path'], estimatedHours: 12, difficulty: 'Hard' as const },
      { title: 'Level 8: Dynamic Programming', description: 'Fibonacci, knapsack, LCS, LIS, coin change', topics: ['DP', 'Memoization', 'Tabulation'], estimatedHours: 14, difficulty: 'Hard' as const },
    ],
  },
  {
    name: 'DBMS Mastery Quest',
    icon: '🗃️',
    description: 'Master Database Management Systems — from ER diagrams to normalization and transactions.',
    topic: 'DBMS',
    difficulty: 'Intermediate' as const,
    goalType: 'quest',
    category: 'dbms',
    estimatedHours: 45,
    xpReward: 280,
    resources: [
      { title: 'DBMS Tutorial', url: 'https://www.geeksforgeeks.org/dbms/', type: 'docs' },
      { title: 'Stanford DB Course', url: 'https://online.stanford.edu/courses/soe-ydatabases-databases', type: 'docs' },
    ],
    modules: [
      { title: 'ER Model & Schema Design', description: 'Entities, relationships, keys, ER diagrams', topics: ['ER Diagram', 'Keys', 'Relationships', 'Schema'], estimatedHours: 6, difficulty: 'Easy' as const },
      { title: 'Relational Model', description: 'Relational algebra, tuple calculus, domains', topics: ['Relational Algebra', 'Tuple Calculus', 'Domains'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Normalization', description: '1NF, 2NF, 3NF, BCNF, functional dependencies', topics: ['1NF', '2NF', '3NF', 'BCNF', 'FD'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Transactions & Concurrency', description: 'ACID, isolation levels, deadlocks, locking', topics: ['ACID', 'Transactions', 'Deadlock', 'Locking'], estimatedHours: 10, difficulty: 'Hard' as const },
      { title: 'Indexing & Storage', description: 'B-trees, hashing, file organization', topics: ['B-Tree', 'Indexing', 'Hashing', 'Storage'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Recovery & Security', description: 'Log-based recovery, checkpoints, authorization', topics: ['Recovery', 'WAL', 'Security', 'Authorization'], estimatedHours: 5, difficulty: 'Medium' as const },
    ],
  },
  {
    name: 'System Design Quest',
    icon: '🏛️',
    description: 'Progressive system design quest — from fundamentals to designing real distributed systems.',
    topic: 'System Design',
    difficulty: 'Intermediate' as const,
    goalType: 'quest',
    category: 'system_design',
    estimatedHours: 70,
    xpReward: 400,
    resources: [
      { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'github' },
      { title: 'Grokking System Design', url: 'https://www.designgurus.io/course/grokking-the-system-design-interview', type: 'docs' },
    ],
    modules: [
      { title: 'Networking Fundamentals', description: 'TCP/IP, HTTP, DNS, WebSockets', topics: ['TCP', 'HTTP', 'DNS', 'WebSocket'], estimatedHours: 6, difficulty: 'Easy' as const },
      { title: 'Load Balancing & Caching', description: 'Load balancer types, CDN, Redis, Memcached', topics: ['Load Balancer', 'CDN', 'Redis', 'Cache Invalidation'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Databases at Scale', description: 'Sharding, replication, CAP theorem, consistency', topics: ['Sharding', 'Replication', 'CAP', 'Consistency'], estimatedHours: 10, difficulty: 'Medium' as const },
      { title: 'Message Queues & Event Systems', description: 'Kafka, RabbitMQ, event-driven architecture', topics: ['Kafka', 'Message Queue', 'Event-Driven', 'Pub/Sub'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Design: URL Shortener & Paste Bin', description: 'Design TinyURL, Pastebin with scale', topics: ['URL Shortener', 'Hashing', 'Key Generation'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Design: Social Network', description: 'Design Twitter/Instagram feed, follower graph', topics: ['Feed', 'Fan-out', 'Graph', 'Timeline'], estimatedHours: 10, difficulty: 'Hard' as const },
      { title: 'Design: Chat & Real-time', description: 'Design WhatsApp, Slack — real-time messaging', topics: ['WebSocket', 'Chat', 'Presence', 'Delivery'], estimatedHours: 10, difficulty: 'Hard' as const },
      { title: 'Design: Video Streaming', description: 'Design YouTube/Netflix — encoding, CDN, recommendations', topics: ['Video', 'CDN', 'Encoding', 'Recommendation'], estimatedHours: 10, difficulty: 'Hard' as const },
    ],
  },
  {
    name: 'Flipkart SDE Interview',
    icon: '🛒',
    description: 'Prepare for Flipkart Machine Coding, DSA, and System Design rounds.',
    topic: 'Flipkart Interview',
    difficulty: 'Advanced' as const,
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Flipkart',
    estimatedHours: 70,
    xpReward: 450,
    resources: [
      { title: 'LeetCode Flipkart Tag', url: 'https://leetcode.com/company/flipkart/', type: 'practice' },
    ],
    modules: [
      { title: 'DSA Problem Solving', description: 'Trees, graphs, DP, greedy — Flipkart favorites', topics: ['Trees', 'Graphs', 'DP', 'Greedy', 'Arrays'], estimatedHours: 20, difficulty: 'Hard' as const },
      { title: 'Machine Coding Round', description: 'Design snake game, parking lot, splitwise in 90 min', topics: ['LLD', 'OOP', 'Design Patterns', 'Clean Code'], estimatedHours: 20, difficulty: 'Hard' as const },
      { title: 'System Design', description: 'Design e-commerce, cart, payment, inventory systems', topics: ['System Design', 'E-commerce', 'Payment', 'Inventory'], estimatedHours: 18, difficulty: 'Hard' as const },
      { title: 'Behavioral & HR', description: 'Culture fit, team collaboration, conflict resolution', topics: ['Behavioral', 'Culture', 'HR'], estimatedHours: 6, difficulty: 'Easy' as const },
    ],
  },
  {
    name: 'Aptitude & Reasoning Quest',
    icon: '🧠',
    description: 'Crack aptitude rounds — quantitative, logical reasoning, and verbal ability.',
    topic: 'Aptitude',
    difficulty: 'Beginner' as const,
    goalType: 'quest',
    category: 'aptitude',
    estimatedHours: 35,
    xpReward: 200,
    resources: [
      { title: 'IndiaBIX', url: 'https://www.indiabix.com/', type: 'practice' },
      { title: 'PrepInsta', url: 'https://prepinsta.com/aptitude/', type: 'practice' },
    ],
    modules: [
      { title: 'Number Systems & Arithmetic', description: 'LCM, HCF, percentages, profit/loss, ratios', topics: ['Numbers', 'LCM/HCF', 'Percentage', 'Ratio'], estimatedHours: 6, difficulty: 'Easy' as const },
      { title: 'Algebra & Equations', description: 'Linear equations, quadratic, inequalities', topics: ['Algebra', 'Equations', 'Inequalities'], estimatedHours: 5, difficulty: 'Medium' as const },
      { title: 'Time, Speed & Work', description: 'Time & work, pipes & cisterns, trains, boats', topics: ['Time & Work', 'Speed', 'Trains', 'Boats'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Permutation & Probability', description: 'P&C, probability, arrangements, combinations', topics: ['Permutation', 'Combination', 'Probability'], estimatedHours: 6, difficulty: 'Medium' as const },
      { title: 'Logical Reasoning', description: 'Puzzles, seating, blood relations, coding-decoding', topics: ['Puzzles', 'Seating', 'Coding-Decoding', 'Syllogism'], estimatedHours: 8, difficulty: 'Medium' as const },
      { title: 'Data Interpretation', description: 'Bar charts, pie charts, tables, line graphs', topics: ['Data Interpretation', 'Charts', 'Tables'], estimatedHours: 4, difficulty: 'Easy' as const },
    ],
  },
];

async function seed() {
  await connectDB();

  // Seed company problems
  let created = 0;
  let skipped = 0;
  for (const p of COMPANY_PROBLEMS) {
    const exists = await Problem.findOne({ slug: p.slug }).select('_id').lean();
    if (exists) {
      skipped++;
      continue;
    }
    await Problem.create(p);
    created++;
    console.log(`✅ Problem: ${p.title} [${p.companyTags.slice(0, 3).join(', ')}]`);
  }
  console.log(`\nProblems: ${created} created, ${skipped} skipped.`);

  // Seed goal templates
  let goalsCreated = 0;
  let goalsSkipped = 0;
  for (const t of GOAL_TEMPLATES) {
    const exists = await Goal.findOne({ name: t.name, isPublic: true }).select('_id').lean();
    if (exists) {
      goalsSkipped++;
      continue;
    }
    const modules = t.modules.map((m) => ({
      moduleId: crypto.randomUUID(),
      title: m.title,
      description: m.description,
      topics: m.topics,
      difficulty: m.difficulty,
      estimatedHours: m.estimatedHours,
      status: 'not_started',
      actualMinutes: 0,
      quizScore: null,
      problemsSolved: 0,
      completedAt: null,
      dueDate: null,
    }));

    await Goal.create({
      userId: ADMIN_USER_ID,
      name: t.name,
      icon: t.icon,
      description: t.description,
      topic: t.topic,
      difficulty: t.difficulty,
      goalType: t.goalType,
      category: t.category,
      companyTarget: (t as any).companyTarget ?? null,
      estimatedHours: t.estimatedHours,
      xpReward: t.xpReward,
      resources: t.resources,
      modules,
      isPublic: true,
      priority: 'P1',
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    goalsCreated++;
    console.log(`✅ Goal Template: ${t.name} [${t.goalType}/${t.category}]`);
  }
  console.log(`\nGoal Templates: ${goalsCreated} created, ${goalsSkipped} skipped.`);
  console.log('\n🎉 Quest & Interview Questions seed complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
