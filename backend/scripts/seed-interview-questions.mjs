/**
 * Seed interview questions from various platforms for multiple companies.
 * Run: node scripts/seed-interview-questions.mjs
 *
 * These are commonly asked interview problems at top tech companies,
 * sourced from public problem sets on LeetCode, GFG, HackerRank, Codeforces, etc.
 */

const API = process.env.API_URL || 'http://localhost:5000';

// Login as admin
const login = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailOrUsername: 'sai_test', password: 'newhunter2hunter' }),
});
if (!login.ok) { console.error('Login failed'); process.exit(1); }
const { accessToken } = await login.json();

const problems = [
  // ======================== GOOGLE ========================
  {
    slug: 'two-sum',
    title: 'Two Sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nReturn the answer in any order.',
    difficulty: 'Easy',
    tags: ['Arrays', 'Hash Table'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta', 'Adobe'],
    inputFormat: 'First line: n and target separated by space. Second line: n space-separated integers.',
    outputFormat: 'Two space-separated indices.',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    examples: [{ input: '4 9\n2 7 11 15', output: '0 1', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' }],
    testCases: [
      { stdin: '4 9\n2 7 11 15', expectedStdout: '0 1' },
      { stdin: '3 6\n3 2 4', expectedStdout: '1 2' },
      { stdin: '2 6\n3 3', expectedStdout: '0 1' },
    ],
  },
  {
    slug: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    description: 'Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log(m+n)).',
    difficulty: 'Hard',
    tags: ['Binary Search', 'Divide and Conquer', 'Arrays'],
    companyTags: ['Google', 'Amazon', 'Goldman Sachs'],
    inputFormat: 'First line: m n. Second line: m integers. Third line: n integers.',
    outputFormat: 'The median as a decimal number.',
    constraints: '0 <= m, n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6',
    examples: [{ input: '2 2\n1 3\n2 4', output: '2.5', explanation: 'Merged = [1,2,3,4], median = (2+3)/2 = 2.5' }],
    testCases: [
      { stdin: '2 2\n1 3\n2 4', expectedStdout: '2.5' },
      { stdin: '2 1\n1 2\n3', expectedStdout: '2.0' },
    ],
  },
  {
    slug: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    difficulty: 'Medium',
    tags: ['Sliding Window', 'Hash Table', 'Strings'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Adobe'],
    inputFormat: 'A single string s.',
    outputFormat: 'An integer — the length of the longest substring.',
    constraints: '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
    examples: [{ input: 'abcabcbb', output: '3', explanation: 'The answer is "abc" with length 3.' }],
    testCases: [
      { stdin: 'abcabcbb', expectedStdout: '3' },
      { stdin: 'bbbbb', expectedStdout: '1' },
      { stdin: 'pwwkew', expectedStdout: '3' },
    ],
  },
  {
    slug: 'lru-cache',
    title: 'LRU Cache',
    description: 'Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` - Initialize the LRU cache with positive size capacity.\n- `int get(int key)` - Return the value of the key if it exists, otherwise return -1.\n- `void put(int key, int value)` - Update the value of the key if present, or insert the key-value pair. When the cache reaches its capacity, evict the least recently used key.',
    difficulty: 'Medium',
    tags: ['Design', 'Hash Table', 'Linked List'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Meta'],
    inputFormat: 'First line: capacity and number of operations. Following lines: operation type and arguments.',
    outputFormat: 'Results of get operations, one per line.',
    constraints: '1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\nAt most 2 * 10^5 calls to get and put.',
    examples: [{ input: '2 7\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1', output: '1\n-1\n-1', explanation: 'LRU eviction after capacity reached.' }],
    testCases: [
      { stdin: '2 7\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1', expectedStdout: '1\n-1\n-1' },
    ],
  },
  {
    slug: 'word-ladder',
    title: 'Word Ladder',
    description: 'Given two words, `beginWord` and `endWord`, and a dictionary `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, or 0 if no such sequence exists.\n\nEvery adjacent pair of words differs by a single letter. Every word in the sequence must be in the wordList.',
    difficulty: 'Hard',
    tags: ['BFS', 'Hash Table', 'Strings'],
    companyTags: ['Google', 'Amazon', 'Meta'],
    inputFormat: 'First line: beginWord. Second line: endWord. Third line: space-separated wordList.',
    outputFormat: 'An integer.',
    constraints: '1 <= beginWord.length <= 10\nendWord.length == beginWord.length\n1 <= wordList.length <= 5000',
    examples: [{ input: 'hit\ncog\nhot dot dog lot log cog', output: '5', explanation: 'hit -> hot -> dot -> dog -> cog' }],
    testCases: [
      { stdin: 'hit\ncog\nhot dot dog lot log cog', expectedStdout: '5' },
      { stdin: 'hit\ncog\nhot dot dog lot log', expectedStdout: '0' },
    ],
  },

  // ======================== AMAZON ========================
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    description: 'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    difficulty: 'Hard',
    tags: ['Two Pointers', 'Stack', 'Arrays', 'Dynamic Programming'],
    companyTags: ['Amazon', 'Google', 'Goldman Sachs', 'Microsoft'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — total units of trapped water.',
    constraints: 'n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5',
    examples: [{ input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6', explanation: '6 units of rain water are trapped.' }],
    testCases: [
      { stdin: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expectedStdout: '6' },
      { stdin: '5\n4 2 0 3 2 5', expectedStdout: '9' },
    ],
  },
  {
    slug: 'number-of-islands',
    title: 'Number of Islands',
    description: 'Given an `m x n` 2D binary grid which represents a map of `1`s (land) and `0`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
    difficulty: 'Medium',
    tags: ['DFS', 'BFS', 'Graph', 'Matrix'],
    companyTags: ['Amazon', 'Google', 'Microsoft', 'Meta'],
    inputFormat: 'First line: m n. Following m lines: n characters (0 or 1).',
    outputFormat: 'An integer — number of islands.',
    constraints: 'm == grid.length\nn == grid[i].length\n1 <= m, n <= 300\ngrid[i][j] is 0 or 1.',
    examples: [{ input: '4 5\n11110\n11010\n11000\n00000', output: '1', explanation: 'One connected island.' }],
    testCases: [
      { stdin: '4 5\n11110\n11010\n11000\n00000', expectedStdout: '1' },
      { stdin: '4 5\n11000\n11000\n00100\n00011', expectedStdout: '3' },
    ],
  },
  {
    slug: 'merge-k-sorted-lists',
    title: 'Merge k Sorted Lists',
    description: 'You are given an array of `k` linked-lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
    difficulty: 'Hard',
    tags: ['Heap', 'Linked List', 'Divide and Conquer', 'Merge Sort'],
    companyTags: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    inputFormat: 'First line: k. Following k lines: space-separated sorted integers per list.',
    outputFormat: 'Space-separated merged sorted list.',
    constraints: 'k == lists.length\n0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4',
    examples: [{ input: '3\n1 4 5\n1 3 4\n2 6', output: '1 1 2 3 4 4 5 6', explanation: 'All lists merged in sorted order.' }],
    testCases: [
      { stdin: '3\n1 4 5\n1 3 4\n2 6', expectedStdout: '1 1 2 3 4 4 5 6' },
      { stdin: '1\n1', expectedStdout: '1' },
    ],
  },
  {
    slug: 'course-schedule',
    title: 'Course Schedule',
    description: 'There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`.\n\nReturn `true` if you can finish all courses. Otherwise, return `false`.',
    difficulty: 'Medium',
    tags: ['Graph', 'Topological Sort', 'DFS', 'BFS'],
    companyTags: ['Amazon', 'Microsoft', 'Google', 'Flipkart'],
    inputFormat: 'First line: numCourses numPrereqs. Following lines: ai bi pairs.',
    outputFormat: 'true or false.',
    constraints: '1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000',
    examples: [{ input: '2 1\n1 0', output: 'true', explanation: 'Take course 0 then course 1.' }],
    testCases: [
      { stdin: '2 1\n1 0', expectedStdout: 'true' },
      { stdin: '2 2\n1 0\n0 1', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'min-cost-to-connect-ropes',
    title: 'Minimum Cost to Connect Ropes',
    description: 'Given `n` ropes of different lengths, connect them into one rope. The cost to connect two ropes is the sum of their lengths. Find the minimum cost to connect all ropes into one.',
    difficulty: 'Medium',
    tags: ['Heap', 'Greedy'],
    companyTags: ['Amazon', 'Adobe', 'Flipkart'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — minimum cost.',
    constraints: '1 <= n <= 10^5\n1 <= ropes[i] <= 10^4',
    examples: [{ input: '4\n4 3 2 6', output: '29', explanation: '2+3=5, 4+5=9, 6+9=15. Total=5+9+15=29' }],
    testCases: [
      { stdin: '4\n4 3 2 6', expectedStdout: '29' },
      { stdin: '3\n1 2 3', expectedStdout: '9' },
    ],
  },

  // ======================== MICROSOFT ========================
  {
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    description: 'Given the `head` of a singly linked list, reverse the list, and return the reversed list.',
    difficulty: 'Easy',
    tags: ['Linked List', 'Recursion'],
    companyTags: ['Microsoft', 'Amazon', 'Google', 'Adobe'],
    inputFormat: 'Space-separated integers representing the linked list.',
    outputFormat: 'Space-separated integers representing the reversed list.',
    constraints: 'The number of nodes is in the range [0, 5000].\n-5000 <= Node.val <= 5000',
    examples: [{ input: '1 2 3 4 5', output: '5 4 3 2 1', explanation: 'List reversed.' }],
    testCases: [
      { stdin: '1 2 3 4 5', expectedStdout: '5 4 3 2 1' },
      { stdin: '1 2', expectedStdout: '2 1' },
      { stdin: '1', expectedStdout: '1' },
    ],
  },
  {
    slug: 'spiral-matrix',
    title: 'Spiral Matrix',
    description: 'Given an `m x n` matrix, return all elements of the matrix in spiral order.',
    difficulty: 'Medium',
    tags: ['Matrix', 'Simulation', 'Arrays'],
    companyTags: ['Microsoft', 'Amazon', 'Adobe', 'Goldman Sachs'],
    inputFormat: 'First line: m n. Following m lines: n space-separated integers.',
    outputFormat: 'Space-separated integers in spiral order.',
    constraints: 'm == matrix.length\nn == matrix[i].length\n1 <= m, n <= 10\n-100 <= matrix[i][j] <= 100',
    examples: [{ input: '3 3\n1 2 3\n4 5 6\n7 8 9', output: '1 2 3 6 9 8 7 4 5', explanation: 'Spiral traversal.' }],
    testCases: [
      { stdin: '3 3\n1 2 3\n4 5 6\n7 8 9', expectedStdout: '1 2 3 6 9 8 7 4 5' },
      { stdin: '3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12', expectedStdout: '1 2 3 4 8 12 11 10 9 5 6 7' },
    ],
  },
  {
    slug: 'serialize-deserialize-binary-tree',
    title: 'Serialize and Deserialize Binary Tree',
    description: 'Design an algorithm to serialize and deserialize a binary tree. Serialization is the process of converting a tree to a string so that it can be later restored. Implement both functions.',
    difficulty: 'Hard',
    tags: ['Tree', 'BFS', 'DFS', 'Design'],
    companyTags: ['Microsoft', 'Google', 'Meta', 'Amazon'],
    inputFormat: 'Level-order representation with null for missing nodes.',
    outputFormat: 'Level-order representation matching input.',
    constraints: 'The number of nodes is in the range [0, 10^4].\n-1000 <= Node.val <= 1000',
    examples: [{ input: '1 2 3 null null 4 5', output: '1 2 3 null null 4 5', explanation: 'Tree serialized and deserialized correctly.' }],
    testCases: [
      { stdin: '1 2 3 null null 4 5', expectedStdout: '1 2 3 null null 4 5' },
      { stdin: '1', expectedStdout: '1' },
    ],
  },
  {
    slug: 'string-to-integer-atoi',
    title: 'String to Integer (atoi)',
    description: 'Implement the `myAtoi(string s)` function, which converts a string to a 32-bit signed integer.\n\nThe algorithm:\n1. Read in and ignore any leading whitespace.\n2. Check if the next character is `-` or `+`. Read this character if it is either.\n3. Read in the next characters until a non-digit character or end of input. Convert these digits into an integer.\n4. Clamp the integer to the 32-bit signed integer range [-2^31, 2^31 - 1].',
    difficulty: 'Medium',
    tags: ['Strings', 'Math'],
    companyTags: ['Microsoft', 'Amazon', 'Goldman Sachs'],
    inputFormat: 'A single string.',
    outputFormat: 'An integer.',
    constraints: '0 <= s.length <= 200\ns consists of English letters, digits, spaces, +, -.',
    examples: [{ input: '   -42', output: '-42', explanation: 'Leading whitespace ignored, negative sign parsed.' }],
    testCases: [
      { stdin: '   -42', expectedStdout: '-42' },
      { stdin: '4193 with words', expectedStdout: '4193' },
      { stdin: 'words and 987', expectedStdout: '0' },
    ],
  },

  // ======================== META ========================
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
    difficulty: 'Easy',
    tags: ['Stack', 'Strings'],
    companyTags: ['Meta', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'A single string of brackets.',
    outputFormat: 'true or false.',
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only.',
    examples: [{ input: '()[]{}', output: 'true', explanation: 'All brackets properly closed.' }],
    testCases: [
      { stdin: '()[]{}', expectedStdout: 'true' },
      { stdin: '(]', expectedStdout: 'false' },
      { stdin: '([)]', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    description: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Prefix Sum'],
    companyTags: ['Meta', 'Amazon', 'Microsoft', 'Apple'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'Space-separated integers.',
    constraints: '2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30\nThe product of any prefix or suffix fits in a 32-bit integer.',
    examples: [{ input: '4\n1 2 3 4', output: '24 12 8 6', explanation: 'Each element is the product of all others.' }],
    testCases: [
      { stdin: '4\n1 2 3 4', expectedStdout: '24 12 8 6' },
      { stdin: '5\n-1 1 0 -3 3', expectedStdout: '0 0 9 0 0' },
    ],
  },
  {
    slug: 'binary-tree-right-side-view',
    title: 'Binary Tree Right Side View',
    description: 'Given the `root` of a binary tree, imagine yourself standing on the right side of it, return the values of the nodes you can see ordered from top to bottom.',
    difficulty: 'Medium',
    tags: ['Tree', 'BFS', 'DFS'],
    companyTags: ['Meta', 'Amazon', 'Microsoft'],
    inputFormat: 'Level-order representation with null for missing nodes.',
    outputFormat: 'Space-separated values visible from right side.',
    constraints: 'The number of nodes is in [0, 100].\n-100 <= Node.val <= 100',
    examples: [{ input: '1 2 3 null 5 null 4', output: '1 3 4', explanation: 'Right-most nodes at each level.' }],
    testCases: [
      { stdin: '1 2 3 null 5 null 4', expectedStdout: '1 3 4' },
      { stdin: '1 null 3', expectedStdout: '1 3' },
    ],
  },
  {
    slug: 'subarray-sum-equals-k',
    title: 'Subarray Sum Equals K',
    description: 'Given an array of integers `nums` and an integer `k`, return the total number of subarrays whose sum equals to `k`.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Hash Table', 'Prefix Sum'],
    companyTags: ['Meta', 'Google', 'Amazon', 'Microsoft'],
    inputFormat: 'First line: n k. Second line: n space-separated integers.',
    outputFormat: 'An integer — count of subarrays.',
    constraints: '1 <= nums.length <= 2 * 10^4\n-1000 <= nums[i] <= 1000\n-10^7 <= k <= 10^7',
    examples: [{ input: '3 2\n1 1 1', output: '2', explanation: 'Subarrays [1,1] at index 0-1 and 1-2.' }],
    testCases: [
      { stdin: '3 2\n1 1 1', expectedStdout: '2' },
      { stdin: '3 3\n1 2 3', expectedStdout: '2' },
    ],
  },

  // ======================== APPLE ========================
  {
    slug: 'three-sum',
    title: '3Sum',
    description: 'Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Two Pointers', 'Sorting'],
    companyTags: ['Apple', 'Amazon', 'Google', 'Meta'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'Each line contains a triplet of space-separated integers.',
    constraints: '3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5',
    examples: [{ input: '6\n-1 0 1 2 -1 -4', output: '-1 -1 2\n-1 0 1', explanation: 'Two unique triplets sum to 0.' }],
    testCases: [
      { stdin: '6\n-1 0 1 2 -1 -4', expectedStdout: '-1 -1 2\n-1 0 1' },
      { stdin: '3\n0 1 1', expectedStdout: '' },
    ],
  },
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Dynamic Programming', 'Divide and Conquer'],
    companyTags: ['Apple', 'Amazon', 'Microsoft', 'Google', 'Adobe'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — the maximum subarray sum.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    examples: [{ input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: 'Subarray [4,-1,2,1] has the largest sum = 6.' }],
    testCases: [
      { stdin: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedStdout: '6' },
      { stdin: '1\n1', expectedStdout: '1' },
      { stdin: '5\n5 4 -1 7 8', expectedStdout: '23' },
    ],
  },
  {
    slug: 'word-search',
    title: 'Word Search',
    description: 'Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells (horizontally or vertically). The same letter cell may not be used more than once.',
    difficulty: 'Medium',
    tags: ['Backtracking', 'Matrix', 'DFS'],
    companyTags: ['Apple', 'Amazon', 'Microsoft'],
    inputFormat: 'First line: m n. Following m lines: n characters. Last line: word to search.',
    outputFormat: 'true or false.',
    constraints: 'm == board.length\nn == board[i].length\n1 <= m, n <= 6\n1 <= word.length <= 15',
    examples: [{ input: '3 4\nABCE\nSFCS\nADEE\nABCCED', output: 'true', explanation: 'Path exists for ABCCED.' }],
    testCases: [
      { stdin: '3 4\nABCE\nSFCS\nADEE\nABCCED', expectedStdout: 'true' },
      { stdin: '3 4\nABCE\nSFCS\nADEE\nABCB', expectedStdout: 'false' },
    ],
  },

  // ======================== ADOBE ========================
  {
    slug: 'longest-common-subsequence',
    title: 'Longest Common Subsequence',
    description: 'Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return 0.\n\nA subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'Strings'],
    companyTags: ['Adobe', 'Amazon', 'Google'],
    inputFormat: 'First line: text1. Second line: text2.',
    outputFormat: 'An integer.',
    constraints: '1 <= text1.length, text2.length <= 1000\ntext1 and text2 consist of only lowercase English characters.',
    examples: [{ input: 'abcde\nace', output: '3', explanation: 'LCS is "ace".' }],
    testCases: [
      { stdin: 'abcde\nace', expectedStdout: '3' },
      { stdin: 'abc\nabc', expectedStdout: '3' },
      { stdin: 'abc\ndef', expectedStdout: '0' },
    ],
  },
  {
    slug: 'edit-distance',
    title: 'Edit Distance',
    description: 'Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`.\n\nYou have the following three operations permitted on a word:\n- Insert a character\n- Delete a character\n- Replace a character',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'Strings'],
    companyTags: ['Adobe', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'First line: word1. Second line: word2.',
    outputFormat: 'An integer.',
    constraints: '0 <= word1.length, word2.length <= 500\nword1 and word2 consist of lowercase English letters.',
    examples: [{ input: 'horse\nros', output: '3', explanation: 'horse -> rorse -> rose -> ros' }],
    testCases: [
      { stdin: 'horse\nros', expectedStdout: '3' },
      { stdin: 'intention\nexecution', expectedStdout: '5' },
    ],
  },
  {
    slug: 'kth-largest-element',
    title: 'Kth Largest Element in an Array',
    description: 'Given an integer array `nums` and an integer `k`, return the kth largest element in the array.\n\nNote that it is the kth largest element in the sorted order, not the kth distinct element.',
    difficulty: 'Medium',
    tags: ['Heap', 'Sorting', 'Quickselect'],
    companyTags: ['Adobe', 'Amazon', 'Meta', 'Google'],
    inputFormat: 'First line: n k. Second line: n space-separated integers.',
    outputFormat: 'An integer.',
    constraints: '1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    examples: [{ input: '6 2\n3 2 1 5 6 4', output: '5', explanation: 'Sorted: [6,5,4,3,2,1], 2nd largest is 5.' }],
    testCases: [
      { stdin: '6 2\n3 2 1 5 6 4', expectedStdout: '5' },
      { stdin: '9 4\n3 2 3 1 2 4 5 5 6', expectedStdout: '4' },
    ],
  },

  // ======================== FLIPKART ========================
  {
    slug: 'next-greater-element',
    title: 'Next Greater Element',
    description: 'Given an array of integers, find the next greater element for every element. The next greater element for an element x is the first greater element on the right side of x in the array. If no greater element exists, output -1.',
    difficulty: 'Medium',
    tags: ['Stack', 'Arrays', 'Monotonic Stack'],
    companyTags: ['Flipkart', 'Amazon', 'Adobe'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'n space-separated integers (next greater elements).',
    constraints: '1 <= n <= 10^5\n1 <= arr[i] <= 10^9',
    examples: [{ input: '4\n4 5 2 25', output: '5 25 25 -1', explanation: 'Next greater for each element.' }],
    testCases: [
      { stdin: '4\n4 5 2 25', expectedStdout: '5 25 25 -1' },
      { stdin: '4\n13 7 6 12', expectedStdout: '-1 12 12 -1' },
    ],
  },
  {
    slug: 'stock-buy-sell-multiple',
    title: 'Stock Buy and Sell - Multiple Transactions',
    description: 'Given an array of prices where `prices[i]` is the price of a stock on the `ith` day, find the maximum profit you can achieve. You may complete as many transactions as you like (buy one and sell one share multiple times).\n\nNote: You may not engage in multiple transactions simultaneously (i.e., you must sell before you buy again).',
    difficulty: 'Medium',
    tags: ['Greedy', 'Arrays', 'Dynamic Programming'],
    companyTags: ['Flipkart', 'Amazon', 'Goldman Sachs'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — maximum profit.',
    constraints: '1 <= prices.length <= 3 * 10^4\n0 <= prices[i] <= 10^4',
    examples: [{ input: '6\n7 1 5 3 6 4', output: '7', explanation: 'Buy at 1, sell at 5 (profit 4). Buy at 3, sell at 6 (profit 3). Total = 7.' }],
    testCases: [
      { stdin: '6\n7 1 5 3 6 4', expectedStdout: '7' },
      { stdin: '5\n1 2 3 4 5', expectedStdout: '4' },
      { stdin: '5\n7 6 4 3 1', expectedStdout: '0' },
    ],
  },
  {
    slug: 'longest-increasing-subsequence',
    title: 'Longest Increasing Subsequence',
    description: 'Given an integer array `nums`, return the length of the longest strictly increasing subsequence.',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'Binary Search', 'Arrays'],
    companyTags: ['Flipkart', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer.',
    constraints: '1 <= nums.length <= 2500\n-10^4 <= nums[i] <= 10^4',
    examples: [{ input: '8\n10 9 2 5 3 7 101 18', output: '4', explanation: 'LIS is [2,3,7,101] or [2,5,7,101].' }],
    testCases: [
      { stdin: '8\n10 9 2 5 3 7 101 18', expectedStdout: '4' },
      { stdin: '7\n0 1 0 3 2 3 0', expectedStdout: '4' },
      { stdin: '1\n7', expectedStdout: '1' },
    ],
  },

  // ======================== ATLASSIAN ========================
  {
    slug: 'design-hit-counter',
    title: 'Design Hit Counter',
    description: 'Design a hit counter which counts the number of hits received in the past 5 minutes (300 seconds).\n\nImplement the `HitCounter` class:\n- `hit(timestamp)` - Record a hit at the given timestamp.\n- `getHits(timestamp)` - Return the number of hits in the past 5 minutes.',
    difficulty: 'Medium',
    tags: ['Design', 'Queue', 'Arrays'],
    companyTags: ['Atlassian', 'Google', 'Amazon'],
    inputFormat: 'Number of operations. Each line: operation timestamp.',
    outputFormat: 'Results of getHits operations.',
    constraints: '1 <= timestamp <= 2 * 10^9\nAll calls are made with non-decreasing timestamps.\nAt most 300 calls to hit and getHits.',
    examples: [{ input: '6\nhit 1\nhit 2\nhit 3\ngetHits 4\nhit 300\ngetHits 300', output: '3\n4', explanation: 'At time 4: hits at 1,2,3. At time 300: hits at 1,2,3,300.' }],
    testCases: [
      { stdin: '6\nhit 1\nhit 2\nhit 3\ngetHits 4\nhit 300\ngetHits 300', expectedStdout: '3\n4' },
      { stdin: '4\nhit 1\nhit 1\nhit 1\ngetHits 300', expectedStdout: '3' },
    ],
  },
  {
    slug: 'rate-limiter',
    title: 'Rate Limiter',
    description: 'Design a rate limiter that allows at most `n` requests per second for each client. Implement:\n- `shouldAllow(clientId, timestamp)` - returns true if the request should be allowed, false otherwise.',
    difficulty: 'Medium',
    tags: ['Design', 'Hash Table', 'Queue'],
    companyTags: ['Atlassian', 'Google', 'Amazon'],
    inputFormat: 'First line: max requests per second. Following lines: clientId timestamp.',
    outputFormat: 'true or false per request.',
    constraints: '1 <= n <= 1000\n1 <= timestamp <= 10^9',
    examples: [{ input: '2\nA 1\nA 1\nA 1\nB 1', output: 'true\ntrue\nfalse\ntrue', explanation: 'Client A exceeds 2/sec limit on 3rd request.' }],
    testCases: [
      { stdin: '2\nA 1\nA 1\nA 1\nB 1', expectedStdout: 'true\ntrue\nfalse\ntrue' },
    ],
  },
  {
    slug: 'snake-game',
    title: 'Design Snake Game',
    description: 'Design a Snake game that is played on a device with screen size `height x width`. The snake starts at position (0,0) with length 1. Food appears one at a time. When the snake eats food, its length grows by 1. The game ends when the snake hits a wall or itself.\n\nImplement `move(direction)` which returns the score (food eaten) or -1 if game over.',
    difficulty: 'Medium',
    tags: ['Design', 'Queue', 'Matrix'],
    companyTags: ['Atlassian', 'Google'],
    inputFormat: 'First line: height width. Second line: number of food positions. Food positions. Then moves (U/D/L/R).',
    outputFormat: 'Score after each move, or -1 for game over.',
    constraints: '1 <= height, width <= 10^4\n0 <= food.length <= 50',
    examples: [{ input: '3 3\n3\n1 2\n0 1\n0 0\nR D R U L U', output: '0\n0\n1\n1\n2\n-1', explanation: 'Snake moves and eats food, eventually hits itself.' }],
    testCases: [
      { stdin: '3 3\n3\n1 2\n0 1\n0 0\nR D R U L U', expectedStdout: '0\n0\n1\n1\n2\n-1' },
    ],
  },

  // ======================== PAYPAL ========================
  {
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    description: 'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.',
    difficulty: 'Medium',
    tags: ['Hash Table', 'Strings', 'Sorting'],
    companyTags: ['PayPal', 'Amazon', 'Google', 'Meta'],
    inputFormat: 'First line: n. Second line: n space-separated strings.',
    outputFormat: 'Groups of anagrams, each group on one line, space-separated.',
    constraints: '1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.',
    examples: [{ input: '6\neat tea tan ate nat bat', output: 'eat tea ate\ntan nat\nbat', explanation: 'Anagrams grouped together.' }],
    testCases: [
      { stdin: '6\neat tea tan ate nat bat', expectedStdout: 'eat tea ate\ntan nat\nbat' },
      { stdin: '1\na', expectedStdout: 'a' },
    ],
  },
  {
    slug: 'find-all-duplicates',
    title: 'Find All Duplicates in an Array',
    description: 'Given an integer array `nums` of length `n` where all the integers of `nums` are in the range `[1, n]` and each integer appears once or twice, return an array of all the integers that appears twice.\n\nYou must write an algorithm that runs in O(n) time and uses only constant extra space.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Hash Table'],
    companyTags: ['PayPal', 'Amazon', 'Adobe'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'Space-separated duplicates in sorted order.',
    constraints: 'n == nums.length\n1 <= n <= 10^5\n1 <= nums[i] <= n\nEach element appears once or twice.',
    examples: [{ input: '8\n4 3 2 7 8 2 3 1', output: '2 3', explanation: '2 and 3 appear twice.' }],
    testCases: [
      { stdin: '8\n4 3 2 7 8 2 3 1', expectedStdout: '2 3' },
      { stdin: '1\n1', expectedStdout: '' },
    ],
  },

  // ======================== GOLDMAN SACHS ========================
  {
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    description: 'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the ith line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container that contains the most water. Return the maximum amount of water a container can store.',
    difficulty: 'Medium',
    tags: ['Two Pointers', 'Arrays', 'Greedy'],
    companyTags: ['Goldman Sachs', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — maximum water.',
    constraints: 'n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4',
    examples: [{ input: '9\n1 8 6 2 5 4 8 3 7', output: '49', explanation: 'Lines at index 1 (height 8) and 8 (height 7), area = 7*7 = 49.' }],
    testCases: [
      { stdin: '9\n1 8 6 2 5 4 8 3 7', expectedStdout: '49' },
      { stdin: '2\n1 1', expectedStdout: '1' },
    ],
  },
  {
    slug: 'maximal-rectangle',
    title: 'Maximal Rectangle',
    description: 'Given a `rows x cols` binary matrix filled with 0s and 1s, find the largest rectangle containing only 1s and return its area.',
    difficulty: 'Hard',
    tags: ['Stack', 'Dynamic Programming', 'Matrix'],
    companyTags: ['Goldman Sachs', 'Google', 'Amazon'],
    inputFormat: 'First line: rows cols. Following rows lines: cols characters (0 or 1).',
    outputFormat: 'An integer — maximum rectangle area.',
    constraints: 'rows == matrix.length\ncols == matrix[i].length\n1 <= rows, cols <= 200\nmatrix[i][j] is 0 or 1.',
    examples: [{ input: '4 5\n10100\n10111\n11111\n10010', output: '6', explanation: 'Rectangle of 1s with area 6.' }],
    testCases: [
      { stdin: '4 5\n10100\n10111\n11111\n10010', expectedStdout: '6' },
      { stdin: '1 1\n0', expectedStdout: '0' },
    ],
  },
  {
    slug: 'coin-change',
    title: 'Coin Change',
    description: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'BFS'],
    companyTags: ['Goldman Sachs', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'First line: n amount. Second line: n space-separated coin denominations.',
    outputFormat: 'An integer.',
    constraints: '1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4',
    examples: [{ input: '3 11\n1 5 6', output: '3', explanation: '5 + 5 + 1 or 6 + 5 = 11 in 2 coins. Wait: 6+5=11 in 2 coins.' }],
    testCases: [
      { stdin: '3 11\n1 5 6', expectedStdout: '2' },
      { stdin: '1 3\n2', expectedStdout: '-1' },
      { stdin: '1 0\n1', expectedStdout: '0' },
    ],
  },

  // ======================== ZOHO ========================
  {
    slug: 'rotate-matrix-90',
    title: 'Rotate Matrix 90 Degrees',
    description: 'You are given an `n x n` 2D matrix representing an image. Rotate the image by 90 degrees clockwise. You have to rotate the image in-place.',
    difficulty: 'Medium',
    tags: ['Matrix', 'Math', 'Arrays'],
    companyTags: ['Zoho', 'Amazon', 'Microsoft', 'Adobe'],
    inputFormat: 'First line: n. Following n lines: n space-separated integers.',
    outputFormat: 'n lines of n space-separated integers (rotated matrix).',
    constraints: 'n == matrix.length == matrix[i].length\n1 <= n <= 20\n-1000 <= matrix[i][j] <= 1000',
    examples: [{ input: '3\n1 2 3\n4 5 6\n7 8 9', output: '7 4 1\n8 5 2\n9 6 3', explanation: 'Matrix rotated 90 degrees clockwise.' }],
    testCases: [
      { stdin: '3\n1 2 3\n4 5 6\n7 8 9', expectedStdout: '7 4 1\n8 5 2\n9 6 3' },
      { stdin: '2\n1 2\n3 4', expectedStdout: '3 1\n4 2' },
    ],
  },
  {
    slug: 'palindrome-partitioning',
    title: 'Palindrome Partitioning',
    description: 'Given a string `s`, partition `s` such that every substring of the partition is a palindrome. Return all possible palindrome partitioning of `s`.',
    difficulty: 'Medium',
    tags: ['Backtracking', 'Dynamic Programming', 'Strings'],
    companyTags: ['Zoho', 'Amazon', 'Google'],
    inputFormat: 'A single string.',
    outputFormat: 'Each line is a partition (substrings separated by spaces).',
    constraints: '1 <= s.length <= 16\ns contains only lowercase English letters.',
    examples: [{ input: 'aab', output: 'a a b\naa b', explanation: 'Two valid palindrome partitions.' }],
    testCases: [
      { stdin: 'aab', expectedStdout: 'a a b\naa b' },
      { stdin: 'a', expectedStdout: 'a' },
    ],
  },
  {
    slug: 'zigzag-traversal',
    title: 'Binary Tree Zigzag Level Order Traversal',
    description: 'Given the root of a binary tree, return the zigzag level order traversal of its nodes values (i.e., from left to right, then right to left for the next level and alternate between).',
    difficulty: 'Medium',
    tags: ['Tree', 'BFS'],
    companyTags: ['Zoho', 'Amazon', 'Microsoft', 'Flipkart'],
    inputFormat: 'Level-order representation with null for missing nodes.',
    outputFormat: 'Each line is one level, space-separated.',
    constraints: 'The number of nodes is in [0, 2000].\n-100 <= Node.val <= 100',
    examples: [{ input: '3 9 20 null null 15 7', output: '3\n20 9\n15 7', explanation: 'Alternating direction at each level.' }],
    testCases: [
      { stdin: '3 9 20 null null 15 7', expectedStdout: '3\n20 9\n15 7' },
      { stdin: '1', expectedStdout: '1' },
    ],
  },

  // ======================== TCS / INFOSYS / WIPRO / ACCENTURE ========================
  {
    slug: 'fibonacci-number',
    title: 'Fibonacci Number',
    description: 'The Fibonacci numbers form a sequence such that each number is the sum of the two preceding ones, starting from 0 and 1. Given `n`, calculate `F(n)`.',
    difficulty: 'Easy',
    tags: ['Math', 'Dynamic Programming', 'Recursion'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture'],
    inputFormat: 'An integer n.',
    outputFormat: 'An integer F(n).',
    constraints: '0 <= n <= 30',
    examples: [{ input: '4', output: '3', explanation: 'F(4) = F(3) + F(2) = 2 + 1 = 3.' }],
    testCases: [
      { stdin: '4', expectedStdout: '3' },
      { stdin: '0', expectedStdout: '0' },
      { stdin: '10', expectedStdout: '55' },
    ],
  },
  {
    slug: 'palindrome-check',
    title: 'Palindrome Check',
    description: 'Given a string `s`, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.',
    difficulty: 'Easy',
    tags: ['Strings', 'Two Pointers'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture'],
    inputFormat: 'A single string.',
    outputFormat: 'true or false.',
    constraints: '1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.',
    examples: [{ input: 'A man, a plan, a canal: Panama', output: 'true', explanation: 'After filtering: "amanaplanacanalpanama" is a palindrome.' }],
    testCases: [
      { stdin: 'A man, a plan, a canal: Panama', expectedStdout: 'true' },
      { stdin: 'race a car', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    description: 'Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return -1.',
    difficulty: 'Easy',
    tags: ['Binary Search', 'Arrays'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Zoho'],
    inputFormat: 'First line: n target. Second line: n sorted integers.',
    outputFormat: 'An integer (index or -1).',
    constraints: '1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll integers are unique.\nnums is sorted in ascending order.',
    examples: [{ input: '6 9\n-1 0 3 5 9 12', output: '4', explanation: '9 is at index 4.' }],
    testCases: [
      { stdin: '6 9\n-1 0 3 5 9 12', expectedStdout: '4' },
      { stdin: '6 2\n-1 0 3 5 9 12', expectedStdout: '-1' },
    ],
  },
  {
    slug: 'merge-sorted-arrays',
    title: 'Merge Two Sorted Arrays',
    description: 'Given two sorted integer arrays `nums1` and `nums2`, merge `nums2` into `nums1` as one sorted array.\n\nThe final sorted array should not be returned by the function, but instead be stored inside the array `nums1`.',
    difficulty: 'Easy',
    tags: ['Arrays', 'Two Pointers', 'Sorting'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Adobe'],
    inputFormat: 'First line: m n. Second line: m sorted integers. Third line: n sorted integers.',
    outputFormat: 'Space-separated merged sorted array.',
    constraints: 'nums1.length == m + n\nnums2.length == n\n0 <= m, n <= 200\n-10^9 <= nums1[i], nums2[j] <= 10^9',
    examples: [{ input: '3 3\n1 2 3\n2 5 6', output: '1 2 2 3 5 6', explanation: 'Arrays merged in sorted order.' }],
    testCases: [
      { stdin: '3 3\n1 2 3\n2 5 6', expectedStdout: '1 2 2 3 5 6' },
      { stdin: '1 0\n1\n', expectedStdout: '1' },
    ],
  },
  {
    slug: 'detect-cycle-linked-list',
    title: 'Detect Cycle in Linked List',
    description: 'Given `head`, the head of a linked list, determine if the linked list has a cycle in it.\n\nA cycle exists if some node in the list can be reached again by continuously following the `next` pointer.',
    difficulty: 'Easy',
    tags: ['Linked List', 'Two Pointers'],
    companyTags: ['TCS', 'Infosys', 'Amazon', 'Microsoft'],
    inputFormat: 'Space-separated node values. Last line: position where tail connects (-1 for no cycle).',
    outputFormat: 'true or false.',
    constraints: 'The number of nodes is in [0, 10^4].\n-10^5 <= Node.val <= 10^5',
    examples: [{ input: '3 2 0 -4\n1', output: 'true', explanation: 'Tail connects to node index 1.' }],
    testCases: [
      { stdin: '3 2 0 -4\n1', expectedStdout: 'true' },
      { stdin: '1 2\n-1', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    description: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    difficulty: 'Easy',
    tags: ['Dynamic Programming', 'Math'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Adobe'],
    inputFormat: 'An integer n.',
    outputFormat: 'An integer — number of ways.',
    constraints: '1 <= n <= 45',
    examples: [{ input: '3', output: '3', explanation: '1+1+1, 1+2, 2+1' }],
    testCases: [
      { stdin: '3', expectedStdout: '3' },
      { stdin: '2', expectedStdout: '2' },
      { stdin: '5', expectedStdout: '8' },
    ],
  },
  {
    slug: 'roman-to-integer',
    title: 'Roman to Integer',
    description: 'Given a roman numeral, convert it to an integer.\n\nRoman numerals: I=1, V=5, X=10, L=50, C=100, D=500, M=1000.\nSubtractive forms: IV=4, IX=9, XL=40, XC=90, CD=400, CM=900.',
    difficulty: 'Easy',
    tags: ['Strings', 'Math', 'Hash Table'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon'],
    inputFormat: 'A roman numeral string.',
    outputFormat: 'An integer.',
    constraints: '1 <= s.length <= 15\ns is a valid roman numeral in range [1, 3999].',
    examples: [{ input: 'MCMXCIV', output: '1994', explanation: 'M=1000, CM=900, XC=90, IV=4.' }],
    testCases: [
      { stdin: 'III', expectedStdout: '3' },
      { stdin: 'LVIII', expectedStdout: '58' },
      { stdin: 'MCMXCIV', expectedStdout: '1994' },
    ],
  },

  // ======================== MORE GOOGLE ========================
  {
    slug: 'minimum-window-substring',
    title: 'Minimum Window Substring',
    description: 'Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return the empty string.',
    difficulty: 'Hard',
    tags: ['Sliding Window', 'Hash Table', 'Strings'],
    companyTags: ['Google', 'Meta', 'Amazon', 'Atlassian'],
    inputFormat: 'First line: s. Second line: t.',
    outputFormat: 'The minimum window substring or empty string.',
    constraints: 'm == s.length\nn == t.length\n1 <= m, n <= 10^5',
    examples: [{ input: 'ADOBECODEBANC\nABC', output: 'BANC', explanation: 'The minimum window containing A, B, C.' }],
    testCases: [
      { stdin: 'ADOBECODEBANC\nABC', expectedStdout: 'BANC' },
      { stdin: 'a\na', expectedStdout: 'a' },
      { stdin: 'a\naa', expectedStdout: '' },
    ],
  },
  {
    slug: 'alien-dictionary',
    title: 'Alien Dictionary',
    description: 'There is a new alien language that uses the English alphabet. The order among letters is unknown. Given a list of words from the alien language dictionary sorted lexicographically by the rules of this new language, derive the order of letters.\n\nReturn a string of unique letters in the new alien language sorted in lexicographically increasing order by the alien rules. If invalid, return empty string.',
    difficulty: 'Hard',
    tags: ['Graph', 'Topological Sort', 'BFS'],
    companyTags: ['Google', 'Meta', 'Amazon', 'Atlassian'],
    inputFormat: 'First line: number of words. Following lines: one word each.',
    outputFormat: 'A string of characters in alien order.',
    constraints: '1 <= words.length <= 100\n1 <= words[i].length <= 100\nwords[i] consists of only lowercase English letters.',
    examples: [{ input: '3\nwrt\nwrf\ner', output: 'wertf', explanation: 'From word order we derive: t before f, w before e, r before t, e before r.' }],
    testCases: [
      { stdin: '5\nwrt\nwrf\ner\nett\nrftt', expectedStdout: 'wertf' },
      { stdin: '2\nz\nz', expectedStdout: 'z' },
    ],
  },

  // ======================== MORE META ========================
  {
    slug: 'random-pick-with-weight',
    title: 'Random Pick with Weight',
    description: 'You are given a 0-indexed array of positive integers `w` where `w[i]` describes the weight of the ith index. Implement the function `pickIndex()` which randomly picks an index in the range `[0, w.length - 1]` (inclusive) with probability proportional to `w[i]`.',
    difficulty: 'Medium',
    tags: ['Binary Search', 'Prefix Sum', 'Math', 'Randomized'],
    companyTags: ['Meta', 'Google', 'Amazon'],
    inputFormat: 'First line: n. Second line: n weights. Third line: number of picks.',
    outputFormat: 'Picked indices (for testing, verify distribution).',
    constraints: '1 <= w.length <= 10^4\n1 <= w[i] <= 10^5',
    examples: [{ input: '2\n1 3\n4', output: '1 1 0 1', explanation: 'Index 1 should be picked ~75% of the time.' }],
    testCases: [
      { stdin: '1\n1\n1', expectedStdout: '0' },
    ],
  },
  {
    slug: 'accounts-merge',
    title: 'Accounts Merge',
    description: 'Given a list of accounts where each element `accounts[i]` is a list of strings, where the first element is a name and the rest are emails, merge accounts belonging to the same person (connected by shared emails). Return accounts in the format: name followed by sorted emails.',
    difficulty: 'Medium',
    tags: ['Union Find', 'DFS', 'BFS', 'Graph'],
    companyTags: ['Meta', 'Google', 'Amazon'],
    inputFormat: 'First line: n accounts. Following lines: name email1 email2 ...',
    outputFormat: 'Merged accounts: name followed by sorted emails.',
    constraints: '1 <= accounts.length <= 1000\n2 <= accounts[i].length <= 10\n1 <= accounts[i][j].length <= 30',
    examples: [{ input: '4\nJohn john00@mail.com john_newyork@mail.com johnsmith@mail.com\nJohn johnnybravo@mail.com\nJohn john00@mail.com john_dc@mail.com\nMary mary@mail.com', output: 'John john00@mail.com john_dc@mail.com john_newyork@mail.com johnsmith@mail.com\nJohn johnnybravo@mail.com\nMary mary@mail.com', explanation: 'First and third John accounts are merged.' }],
    testCases: [
      { stdin: '4\nJohn john00@mail.com john_newyork@mail.com johnsmith@mail.com\nJohn johnnybravo@mail.com\nJohn john00@mail.com john_dc@mail.com\nMary mary@mail.com', expectedStdout: 'John john00@mail.com john_dc@mail.com john_newyork@mail.com johnsmith@mail.com\nJohn johnnybravo@mail.com\nMary mary@mail.com' },
    ],
  },

  // ======================== ADDITIONAL HARD PROBLEMS ========================
  {
    slug: 'longest-valid-parentheses',
    title: 'Longest Valid Parentheses',
    description: 'Given a string containing just the characters `(` and `)`, return the length of the longest valid (well-formed) parentheses substring.',
    difficulty: 'Hard',
    tags: ['Stack', 'Dynamic Programming', 'Strings'],
    companyTags: ['Google', 'Amazon', 'Microsoft', 'Goldman Sachs'],
    inputFormat: 'A single string of parentheses.',
    outputFormat: 'An integer.',
    constraints: '0 <= s.length <= 3 * 10^4\ns[i] is ( or ).',
    examples: [{ input: ')()())', output: '4', explanation: 'Longest valid substring is "()()" with length 4.' }],
    testCases: [
      { stdin: ')()())', expectedStdout: '4' },
      { stdin: '(()', expectedStdout: '2' },
      { stdin: '', expectedStdout: '0' },
    ],
  },
  {
    slug: 'regular-expression-matching',
    title: 'Regular Expression Matching',
    description: 'Given an input string `s` and a pattern `p`, implement regular expression matching with support for `.` (matches any single character) and `*` (matches zero or more of the preceding element).\n\nThe matching should cover the entire input string.',
    difficulty: 'Hard',
    tags: ['Dynamic Programming', 'Recursion', 'Strings'],
    companyTags: ['Google', 'Meta', 'Amazon', 'Microsoft'],
    inputFormat: 'First line: s. Second line: p.',
    outputFormat: 'true or false.',
    constraints: '1 <= s.length <= 20\n1 <= p.length <= 20\ns contains only lowercase English letters.\np contains only lowercase English letters, . and *.',
    examples: [{ input: 'aab\nc*a*b', output: 'true', explanation: 'c* matches empty, a* matches aa, b matches b.' }],
    testCases: [
      { stdin: 'aa\na', expectedStdout: 'false' },
      { stdin: 'aa\na*', expectedStdout: 'true' },
      { stdin: 'aab\nc*a*b', expectedStdout: 'true' },
    ],
  },
  {
    slug: 'critical-connections',
    title: 'Critical Connections in a Network',
    description: 'There are `n` servers numbered from `0` to `n - 1` connected by undirected server-to-server connections forming a network where `connections[i] = [ai, bi]` represents a connection between servers `ai` and `bi`.\n\nA critical connection is a connection that, if removed, will make some servers unable to reach some other servers. Return all critical connections in the network.',
    difficulty: 'Hard',
    tags: ['Graph', 'DFS', 'Bridges'],
    companyTags: ['Amazon', 'Google', 'Goldman Sachs'],
    inputFormat: 'First line: n numEdges. Following lines: ai bi pairs.',
    outputFormat: 'Critical connections, each on one line as "a b".',
    constraints: '2 <= n <= 10^5\nn - 1 <= connections.length <= 10^5',
    examples: [{ input: '4 4\n0 1\n1 2\n2 0\n1 3', output: '1 3', explanation: 'Removing edge 1-3 disconnects server 3.' }],
    testCases: [
      { stdin: '4 4\n0 1\n1 2\n2 0\n1 3', expectedStdout: '1 3' },
    ],
  },
];

// Bulk import
console.log(`Importing ${problems.length} interview questions...`);

const BATCH_SIZE = 50;
let imported = 0;
let skipped = 0;

for (let i = 0; i < problems.length; i += BATCH_SIZE) {
  const batch = problems.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${API}/api/admin/problems/bulk-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ problems: batch }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err.message || res.status);
    // Try individually for this batch
    for (const p of batch) {
      const single = await fetch(`${API}/api/admin/problems/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ problems: [p] }),
      });
      if (single.ok) {
        const r = await single.json();
        imported += r.created ?? 0;
        skipped += r.skipped ?? 0;
      } else {
        const e = await single.json().catch(() => ({}));
        console.warn(`  Skipped "${p.slug}": ${e.message || 'unknown error'}`);
        skipped++;
      }
    }
  } else {
    const result = await res.json();
    imported += result.created ?? 0;
    skipped += result.skipped ?? 0;
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: created=${result.created}, skipped=${result.skipped}`);
  }
}

console.log(`\nDone! Imported: ${imported}, Skipped (already exist): ${skipped}`);
console.log('Total questions available for companies:');

// Summary
const companyCounts = {};
for (const p of problems) {
  for (const c of p.companyTags) {
    companyCounts[c] = (companyCounts[c] || 0) + 1;
  }
}
Object.entries(companyCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([company, count]) => console.log(`  ${company}: ${count} questions`));
