/**
 * Additional interview questions to boost coverage for underrepresented companies.
 * Run: node scripts/seed-interview-questions-extra.mjs
 */

const API = process.env.API_URL || 'http://localhost:5000';

const login = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailOrUsername: 'sai_test', password: 'newhunter2hunter' }),
});
if (!login.ok) { console.error('Login failed'); process.exit(1); }
const { accessToken } = await login.json();

const problems = [
  // ======================== APPLE (more) ========================
  {
    slug: 'longest-palindromic-substring',
    title: 'Longest Palindromic Substring',
    description: 'Given a string `s`, return the longest palindromic substring in `s`.',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'Strings', 'Two Pointers'],
    companyTags: ['Apple', 'Amazon', 'Microsoft'],
    inputFormat: 'A single string s.',
    outputFormat: 'The longest palindromic substring.',
    constraints: '1 <= s.length <= 1000\ns consists of only digits and English letters.',
    examples: [{ input: 'babad', output: 'bab', explanation: '"aba" is also a valid answer.' }],
    testCases: [
      { stdin: 'babad', expectedStdout: 'bab' },
      { stdin: 'cbbd', expectedStdout: 'bb' },
    ],
  },
  {
    slug: 'min-stack',
    title: 'Min Stack',
    description: 'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\nImplement the `MinStack` class:\n- `push(val)` pushes the element val onto the stack.\n- `pop()` removes the element on the top of the stack.\n- `top()` gets the top element of the stack.\n- `getMin()` retrieves the minimum element in the stack.',
    difficulty: 'Medium',
    tags: ['Stack', 'Design'],
    companyTags: ['Apple', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'Operations one per line: push val, pop, top, getMin.',
    outputFormat: 'Results of top and getMin operations.',
    constraints: '-2^31 <= val <= 2^31 - 1\nMethods pop, top, getMin always called on non-empty stacks.\nAt most 3 * 10^4 calls.',
    examples: [{ input: 'push -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin', output: '-3\n0\n-2', explanation: 'Min tracks correctly as elements are pushed/popped.' }],
    testCases: [
      { stdin: 'push -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin', expectedStdout: '-3\n0\n-2' },
    ],
  },
  {
    slug: 'house-robber',
    title: 'House Robber',
    description: 'You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array `nums` representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'Arrays'],
    companyTags: ['Apple', 'Amazon', 'Google', 'Adobe'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — maximum money.',
    constraints: '1 <= nums.length <= 100\n0 <= nums[i] <= 400',
    examples: [{ input: '4\n1 2 3 1', output: '4', explanation: 'Rob house 1 (money=1) and house 3 (money=3).' }],
    testCases: [
      { stdin: '4\n1 2 3 1', expectedStdout: '4' },
      { stdin: '5\n2 7 9 3 1', expectedStdout: '12' },
    ],
  },
  {
    slug: 'move-zeroes',
    title: 'Move Zeroes',
    description: 'Given an integer array `nums`, move all 0s to the end of it while maintaining the relative order of the non-zero elements.\n\nNote: You must do this in-place without making a copy of the array.',
    difficulty: 'Easy',
    tags: ['Arrays', 'Two Pointers'],
    companyTags: ['Apple', 'Meta', 'Amazon'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'Space-separated integers after moving zeroes.',
    constraints: '1 <= nums.length <= 10^4\n-2^31 <= nums[i] <= 2^31 - 1',
    examples: [{ input: '5\n0 1 0 3 12', output: '1 3 12 0 0', explanation: 'Non-zero elements moved to front.' }],
    testCases: [
      { stdin: '5\n0 1 0 3 12', expectedStdout: '1 3 12 0 0' },
      { stdin: '1\n0', expectedStdout: '0' },
    ],
  },
  {
    slug: 'valid-anagram',
    title: 'Valid Anagram',
    description: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.',
    difficulty: 'Easy',
    tags: ['Hash Table', 'Strings', 'Sorting'],
    companyTags: ['Apple', 'Amazon', 'Microsoft', 'Adobe'],
    inputFormat: 'First line: s. Second line: t.',
    outputFormat: 'true or false.',
    constraints: '1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.',
    examples: [{ input: 'anagram\nnagaram', output: 'true', explanation: 'Both contain same letters same count.' }],
    testCases: [
      { stdin: 'anagram\nnagaram', expectedStdout: 'true' },
      { stdin: 'rat\ncar', expectedStdout: 'false' },
    ],
  },

  // ======================== PAYPAL (more) ========================
  {
    slug: 'valid-palindrome-ii',
    title: 'Valid Palindrome II',
    description: 'Given a string `s`, return `true` if the `s` can be palindrome after deleting at most one character from it.',
    difficulty: 'Easy',
    tags: ['Strings', 'Two Pointers', 'Greedy'],
    companyTags: ['PayPal', 'Meta', 'Amazon'],
    inputFormat: 'A single string.',
    outputFormat: 'true or false.',
    constraints: '1 <= s.length <= 10^5\ns consists of lowercase English letters.',
    examples: [{ input: 'abca', output: 'true', explanation: 'Delete c to get "aba".' }],
    testCases: [
      { stdin: 'aba', expectedStdout: 'true' },
      { stdin: 'abca', expectedStdout: 'true' },
      { stdin: 'abc', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'implement-trie',
    title: 'Implement Trie (Prefix Tree)',
    description: 'A trie or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings.\n\nImplement the Trie class:\n- `insert(word)` Inserts the string word into the trie.\n- `search(word)` Returns true if the string word is in the trie.\n- `startsWith(prefix)` Returns true if there is a previously inserted string that has the prefix.',
    difficulty: 'Medium',
    tags: ['Trie', 'Design', 'Hash Table', 'Strings'],
    companyTags: ['PayPal', 'Google', 'Amazon', 'Microsoft'],
    inputFormat: 'Operations one per line.',
    outputFormat: 'Results of search and startsWith operations.',
    constraints: '1 <= word.length, prefix.length <= 2000\nword and prefix consist only of lowercase English letters.\nAt most 3 * 10^4 calls.',
    examples: [{ input: 'insert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app\nsearch app', output: 'true\nfalse\ntrue\ntrue', explanation: 'Trie operations in sequence.' }],
    testCases: [
      { stdin: 'insert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app\nsearch app', expectedStdout: 'true\nfalse\ntrue\ntrue' },
    ],
  },
  {
    slug: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    description: 'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.',
    difficulty: 'Medium',
    tags: ['Hash Table', 'Heap', 'Sorting', 'Bucket Sort'],
    companyTags: ['PayPal', 'Amazon', 'Meta', 'Google'],
    inputFormat: 'First line: n k. Second line: n space-separated integers.',
    outputFormat: 'Space-separated k most frequent elements.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\nk is in the range [1, number of unique elements].',
    examples: [{ input: '6 2\n1 1 1 2 2 3', output: '1 2', explanation: '1 appears 3 times, 2 appears 2 times.' }],
    testCases: [
      { stdin: '6 2\n1 1 1 2 2 3', expectedStdout: '1 2' },
      { stdin: '1 1\n1', expectedStdout: '1' },
    ],
  },
  {
    slug: 'task-scheduler',
    title: 'Task Scheduler',
    description: 'Given a characters array `tasks` representing tasks a CPU needs to do, where each letter represents a different task, and a non-negative integer `n` representing the cooldown period between two same tasks.\n\nReturn the least number of intervals the CPU will take to finish all the given tasks.',
    difficulty: 'Medium',
    tags: ['Greedy', 'Hash Table', 'Sorting', 'Heap'],
    companyTags: ['PayPal', 'Meta', 'Amazon', 'Microsoft'],
    inputFormat: 'First line: number of tasks and n. Second line: space-separated task characters.',
    outputFormat: 'An integer — minimum intervals.',
    constraints: '1 <= tasks.length <= 10^4\ntasks[i] is uppercase English letter.\n0 <= n <= 100',
    examples: [{ input: '6 2\nA A A B B B', output: '8', explanation: 'A -> B -> idle -> A -> B -> idle -> A -> B' }],
    testCases: [
      { stdin: '6 2\nA A A B B B', expectedStdout: '8' },
      { stdin: '5 1\nA A A B C', expectedStdout: '5' },
    ],
  },
  {
    slug: 'decode-ways',
    title: 'Decode Ways',
    description: 'A message containing letters from A-Z can be encoded into numbers using the mapping: A=1, B=2, ..., Z=26.\n\nGiven a string `s` containing only digits, return the number of ways to decode it.',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'Strings'],
    companyTags: ['PayPal', 'Goldman Sachs', 'Amazon', 'Meta'],
    inputFormat: 'A string of digits.',
    outputFormat: 'An integer — number of decode ways.',
    constraints: '1 <= s.length <= 100\ns contains only digits and may contain leading zeros.',
    examples: [{ input: '226', output: '3', explanation: '"BZ" (2 26), "VF" (22 6), "BBF" (2 2 6).' }],
    testCases: [
      { stdin: '12', expectedStdout: '2' },
      { stdin: '226', expectedStdout: '3' },
      { stdin: '06', expectedStdout: '0' },
    ],
  },

  // ======================== ATLASSIAN (more) ========================
  {
    slug: 'meeting-rooms-ii',
    title: 'Meeting Rooms II',
    description: 'Given an array of meeting time intervals where `intervals[i] = [starti, endi]`, return the minimum number of conference rooms required.',
    difficulty: 'Medium',
    tags: ['Sorting', 'Heap', 'Greedy', 'Two Pointers'],
    companyTags: ['Atlassian', 'Google', 'Amazon', 'Meta'],
    inputFormat: 'First line: n. Following n lines: start end.',
    outputFormat: 'An integer — minimum rooms needed.',
    constraints: '1 <= intervals.length <= 10^4\n0 <= starti < endi <= 10^6',
    examples: [{ input: '3\n0 30\n5 10\n15 20', output: '2', explanation: 'Meetings [0,30] and [5,10] overlap — need 2 rooms.' }],
    testCases: [
      { stdin: '3\n0 30\n5 10\n15 20', expectedStdout: '2' },
      { stdin: '2\n7 10\n2 4', expectedStdout: '1' },
    ],
  },
  {
    slug: 'lfu-cache',
    title: 'LFU Cache',
    description: 'Design and implement a data structure for a Least Frequently Used (LFU) cache.\n\nImplement the `LFUCache` class:\n- `LFUCache(int capacity)` Initializes the object with the capacity.\n- `int get(int key)` Gets the value of the key if it exists, otherwise returns -1.\n- `void put(int key, int value)` Updates or inserts the value. When capacity is reached, invalidate and remove the least frequently used key. If there is a tie, the least recently used key is evicted.',
    difficulty: 'Hard',
    tags: ['Design', 'Hash Table', 'Linked List'],
    companyTags: ['Atlassian', 'Google', 'Amazon'],
    inputFormat: 'First line: capacity and number of operations. Following lines: operation and arguments.',
    outputFormat: 'Results of get operations.',
    constraints: '1 <= capacity <= 10^4\n0 <= key <= 10^5\n0 <= value <= 10^9\nAt most 2 * 10^5 calls to get and put.',
    examples: [{ input: '2 7\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nget 3', output: '1\n-1\n3', explanation: 'Key 2 evicted (LFU). After get(1), key 1 has freq 2.' }],
    testCases: [
      { stdin: '2 7\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nget 3', expectedStdout: '1\n-1\n3' },
    ],
  },
  {
    slug: 'time-based-key-value-store',
    title: 'Time Based Key-Value Store',
    description: 'Design a time-based key-value data structure that can store multiple values for the same key at different timestamps and retrieve the key\'s value at a certain timestamp.\n\nImplement the `TimeMap` class:\n- `set(key, value, timestamp)` Stores the key with the value at the given timestamp.\n- `get(key, timestamp)` Returns a value such that `set` was called previously with timestamp_prev <= timestamp. If there are multiple such values, return the value with the largest timestamp_prev. If no values, return "".',
    difficulty: 'Medium',
    tags: ['Design', 'Binary Search', 'Hash Table'],
    companyTags: ['Atlassian', 'Google', 'Amazon', 'Microsoft'],
    inputFormat: 'Operations one per line.',
    outputFormat: 'Results of get operations.',
    constraints: '1 <= key.length, value.length <= 100\ntimestamps are strictly increasing for set calls.\nAt most 2 * 10^5 calls.',
    examples: [{ input: 'set foo bar 1\nget foo 1\nget foo 3\nset foo bar2 4\nget foo 4\nget foo 5', output: 'bar\nbar\nbar2\nbar2', explanation: 'Binary search finds closest timestamp.' }],
    testCases: [
      { stdin: 'set foo bar 1\nget foo 1\nget foo 3\nset foo bar2 4\nget foo 4\nget foo 5', expectedStdout: 'bar\nbar\nbar2\nbar2' },
    ],
  },
  {
    slug: 'flatten-nested-list-iterator',
    title: 'Flatten Nested List Iterator',
    description: 'You are given a nested list of integers. Each element is either an integer or a list whose elements may also be integers or other lists. Implement an iterator to flatten it.\n\nImplement the `NestedIterator` class:\n- `next()` Returns the next integer in the nested list.\n- `hasNext()` Returns true if there are still some integers in the nested list.',
    difficulty: 'Medium',
    tags: ['Stack', 'Design', 'Queue', 'Iterator'],
    companyTags: ['Atlassian', 'Google', 'Meta', 'Amazon'],
    inputFormat: 'Nested list in bracket notation.',
    outputFormat: 'Space-separated flattened integers.',
    constraints: '1 <= nestedList.length <= 500\nThe values of the integers are in the range [-10^6, 10^6].',
    examples: [{ input: '[[1,1],2,[1,1]]', output: '1 1 2 1 1', explanation: 'Nested list flattened.' }],
    testCases: [
      { stdin: '[[1,1],2,[1,1]]', expectedStdout: '1 1 2 1 1' },
      { stdin: '[1,[4,[6]]]', expectedStdout: '1 4 6' },
    ],
  },

  // ======================== ZOHO (more) ========================
  {
    slug: 'first-non-repeating-character',
    title: 'First Non-Repeating Character',
    description: 'Given a string `s`, find the first non-repeating character in it and return its index. If it does not exist, return -1.',
    difficulty: 'Easy',
    tags: ['Hash Table', 'Strings', 'Queue'],
    companyTags: ['Zoho', 'Amazon', 'Adobe', 'Goldman Sachs'],
    inputFormat: 'A single string.',
    outputFormat: 'An integer (index or -1).',
    constraints: '1 <= s.length <= 10^5\ns consists of only lowercase English letters.',
    examples: [{ input: 'leetcode', output: '0', explanation: 'l is the first non-repeating character.' }],
    testCases: [
      { stdin: 'leetcode', expectedStdout: '0' },
      { stdin: 'loveleetcode', expectedStdout: '2' },
      { stdin: 'aabb', expectedStdout: '-1' },
    ],
  },
  {
    slug: 'count-primes',
    title: 'Count Primes',
    description: 'Given an integer `n`, return the number of prime numbers that are strictly less than `n`.\n\nUse the Sieve of Eratosthenes for an efficient solution.',
    difficulty: 'Medium',
    tags: ['Math', 'Sieve', 'Arrays'],
    companyTags: ['Zoho', 'TCS', 'Infosys', 'Adobe'],
    inputFormat: 'An integer n.',
    outputFormat: 'An integer — count of primes < n.',
    constraints: '0 <= n <= 5 * 10^6',
    examples: [{ input: '10', output: '4', explanation: 'Primes less than 10: 2, 3, 5, 7.' }],
    testCases: [
      { stdin: '10', expectedStdout: '4' },
      { stdin: '0', expectedStdout: '0' },
      { stdin: '1', expectedStdout: '0' },
    ],
  },
  {
    slug: 'generate-parentheses',
    title: 'Generate Parentheses',
    description: 'Given `n` pairs of parentheses, write a function to generate all combinations of well-formed parentheses.',
    difficulty: 'Medium',
    tags: ['Backtracking', 'Strings', 'Dynamic Programming'],
    companyTags: ['Zoho', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'An integer n.',
    outputFormat: 'All valid combinations, one per line.',
    constraints: '1 <= n <= 8',
    examples: [{ input: '3', output: '((()))\n(()())\n(())()\n()(())\n()()()', explanation: 'All valid combinations for n=3.' }],
    testCases: [
      { stdin: '2', expectedStdout: '(())\n()()' },
      { stdin: '1', expectedStdout: '()' },
    ],
  },
  {
    slug: 'power-of-two',
    title: 'Power of Two',
    description: 'Given an integer `n`, return `true` if it is a power of two. Otherwise, return `false`.\n\nAn integer `n` is a power of two if there exists an integer `x` such that `n == 2^x`.',
    difficulty: 'Easy',
    tags: ['Bit Manipulation', 'Math'],
    companyTags: ['Zoho', 'TCS', 'Infosys', 'Wipro'],
    inputFormat: 'An integer.',
    outputFormat: 'true or false.',
    constraints: '-2^31 <= n <= 2^31 - 1',
    examples: [{ input: '16', output: 'true', explanation: '2^4 = 16' }],
    testCases: [
      { stdin: '1', expectedStdout: 'true' },
      { stdin: '16', expectedStdout: 'true' },
      { stdin: '3', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'matrix-diagonal-sum',
    title: 'Matrix Diagonal Sum',
    description: 'Given a square matrix `mat`, return the sum of the matrix diagonals. Only include the sum of all elements on the primary diagonal and all elements on the secondary diagonal that are not part of the primary diagonal.',
    difficulty: 'Easy',
    tags: ['Matrix', 'Arrays', 'Math'],
    companyTags: ['Zoho', 'TCS', 'Wipro'],
    inputFormat: 'First line: n. Following n lines: n space-separated integers.',
    outputFormat: 'An integer.',
    constraints: 'n == mat.length == mat[i].length\n1 <= n <= 100\n1 <= mat[i][j] <= 100',
    examples: [{ input: '3\n1 2 3\n4 5 6\n7 8 9', output: '25', explanation: 'Primary: 1+5+9=15, Secondary: 3+5+7=15, minus overlap 5 = 25.' }],
    testCases: [
      { stdin: '3\n1 2 3\n4 5 6\n7 8 9', expectedStdout: '25' },
      { stdin: '2\n1 1\n1 1', expectedStdout: '4' },
    ],
  },

  // ======================== TCS / INFOSYS / WIPRO / ACCENTURE (more) ========================
  {
    slug: 'reverse-string',
    title: 'Reverse String',
    description: 'Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.',
    difficulty: 'Easy',
    tags: ['Strings', 'Two Pointers'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture'],
    inputFormat: 'A string.',
    outputFormat: 'The reversed string.',
    constraints: '1 <= s.length <= 10^5\ns[i] is a printable ascii character.',
    examples: [{ input: 'hello', output: 'olleh', explanation: 'String reversed in-place.' }],
    testCases: [
      { stdin: 'hello', expectedStdout: 'olleh' },
      { stdin: 'Hannah', expectedStdout: 'hannaH' },
    ],
  },
  {
    slug: 'missing-number',
    title: 'Missing Number',
    description: 'Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.',
    difficulty: 'Easy',
    tags: ['Arrays', 'Math', 'Bit Manipulation'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — the missing number.',
    constraints: 'n == nums.length\n1 <= n <= 10^4\n0 <= nums[i] <= n\nAll numbers are unique.',
    examples: [{ input: '3\n3 0 1', output: '2', explanation: 'Numbers 0,1,3 present. 2 is missing.' }],
    testCases: [
      { stdin: '3\n3 0 1', expectedStdout: '2' },
      { stdin: '2\n0 1', expectedStdout: '2' },
      { stdin: '9\n9 6 4 2 3 5 7 0 1', expectedStdout: '8' },
    ],
  },
  {
    slug: 'majority-element',
    title: 'Majority Element',
    description: 'Given an array `nums` of size `n`, return the majority element.\n\nThe majority element is the element that appears more than ⌊n / 2⌋ times. You may assume the majority element always exists.',
    difficulty: 'Easy',
    tags: ['Arrays', 'Hash Table', 'Sorting', 'Divide and Conquer'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Google'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — the majority element.',
    constraints: 'n == nums.length\n1 <= n <= 5 * 10^4\n-10^9 <= nums[i] <= 10^9',
    examples: [{ input: '7\n2 2 1 1 1 2 2', output: '2', explanation: '2 appears 4 times (> 7/2).' }],
    testCases: [
      { stdin: '3\n3 2 3', expectedStdout: '3' },
      { stdin: '7\n2 2 1 1 1 2 2', expectedStdout: '2' },
    ],
  },
  {
    slug: 'single-number',
    title: 'Single Number',
    description: 'Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.',
    difficulty: 'Easy',
    tags: ['Bit Manipulation', 'Arrays'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Adobe'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — the single number.',
    constraints: '1 <= nums.length <= 3 * 10^4\n-3 * 10^4 <= nums[i] <= 3 * 10^4\nEach element appears twice except one.',
    examples: [{ input: '5\n4 1 2 1 2', output: '4', explanation: 'XOR all elements: duplicates cancel out.' }],
    testCases: [
      { stdin: '3\n2 2 1', expectedStdout: '1' },
      { stdin: '5\n4 1 2 1 2', expectedStdout: '4' },
    ],
  },
  {
    slug: 'intersection-of-two-arrays',
    title: 'Intersection of Two Arrays',
    description: 'Given two integer arrays `nums1` and `nums2`, return an array of their intersection. Each element in the result must be unique and you may return the result in any order.',
    difficulty: 'Easy',
    tags: ['Hash Table', 'Arrays', 'Two Pointers', 'Sorting'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Zoho'],
    inputFormat: 'First line: m n. Second line: m integers. Third line: n integers.',
    outputFormat: 'Space-separated unique intersection elements.',
    constraints: '1 <= nums1.length, nums2.length <= 1000\n0 <= nums1[i], nums2[i] <= 1000',
    examples: [{ input: '4 2\n1 2 2 1\n2 2', output: '2', explanation: 'Common element is 2 (unique).' }],
    testCases: [
      { stdin: '4 2\n1 2 2 1\n2 2', expectedStdout: '2' },
      { stdin: '3 5\n4 9 5\n9 4 9 8 4', expectedStdout: '4 9' },
    ],
  },
  {
    slug: 'remove-duplicates-sorted-array',
    title: 'Remove Duplicates from Sorted Array',
    description: 'Given an integer array `nums` sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Return the number of unique elements.',
    difficulty: 'Easy',
    tags: ['Arrays', 'Two Pointers'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon'],
    inputFormat: 'First line: n. Second line: n sorted integers.',
    outputFormat: 'An integer — count of unique elements.',
    constraints: '1 <= nums.length <= 3 * 10^4\n-100 <= nums[i] <= 100\nnums is sorted in non-decreasing order.',
    examples: [{ input: '7\n0 0 1 1 1 2 2', output: '3', explanation: '3 unique elements: 0, 1, 2.' }],
    testCases: [
      { stdin: '3\n1 1 2', expectedStdout: '2' },
      { stdin: '7\n0 0 1 1 1 2 2', expectedStdout: '3' },
    ],
  },
  {
    slug: 'best-time-buy-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve. If you cannot achieve any profit, return 0.',
    difficulty: 'Easy',
    tags: ['Arrays', 'Dynamic Programming'],
    companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon', 'Goldman Sachs'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — max profit.',
    constraints: '1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4',
    examples: [{ input: '6\n7 1 5 3 6 4', output: '5', explanation: 'Buy at 1, sell at 6. Profit = 6-1 = 5.' }],
    testCases: [
      { stdin: '6\n7 1 5 3 6 4', expectedStdout: '5' },
      { stdin: '5\n7 6 4 3 1', expectedStdout: '0' },
    ],
  },

  // ======================== GOLDMAN SACHS (more) ========================
  {
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    description: 'Given an array of intervals where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Sorting'],
    companyTags: ['Goldman Sachs', 'Amazon', 'Google', 'Meta', 'Microsoft'],
    inputFormat: 'First line: n. Following n lines: start end.',
    outputFormat: 'Merged intervals, each on one line.',
    constraints: '1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= starti <= endi <= 10^4',
    examples: [{ input: '4\n1 3\n2 6\n8 10\n15 18', output: '1 6\n8 10\n15 18', explanation: '[1,3] and [2,6] overlap, merged to [1,6].' }],
    testCases: [
      { stdin: '4\n1 3\n2 6\n8 10\n15 18', expectedStdout: '1 6\n8 10\n15 18' },
      { stdin: '2\n1 4\n4 5', expectedStdout: '1 5' },
    ],
  },
  {
    slug: 'jump-game',
    title: 'Jump Game',
    description: 'You are given an integer array `nums`. You are initially positioned at the array\'s first index, and each element in the array represents your maximum jump length at that position.\n\nReturn `true` if you can reach the last index, or `false` otherwise.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Greedy', 'Dynamic Programming'],
    companyTags: ['Goldman Sachs', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'true or false.',
    constraints: '1 <= nums.length <= 10^4\n0 <= nums[i] <= 10^5',
    examples: [{ input: '5\n2 3 1 1 4', output: 'true', explanation: 'Jump 1 step from index 0 to 1, then 3 steps to last index.' }],
    testCases: [
      { stdin: '5\n2 3 1 1 4', expectedStdout: 'true' },
      { stdin: '5\n3 2 1 0 4', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'word-break',
    title: 'Word Break',
    description: 'Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.',
    difficulty: 'Medium',
    tags: ['Dynamic Programming', 'Trie', 'Hash Table', 'Strings'],
    companyTags: ['Goldman Sachs', 'Amazon', 'Google', 'Meta', 'Apple'],
    inputFormat: 'First line: s. Second line: space-separated dictionary words.',
    outputFormat: 'true or false.',
    constraints: '1 <= s.length <= 300\n1 <= wordDict.length <= 1000\n1 <= wordDict[i].length <= 20',
    examples: [{ input: 'leetcode\nleet code', output: 'true', explanation: '"leet" + "code" segments the string.' }],
    testCases: [
      { stdin: 'leetcode\nleet code', expectedStdout: 'true' },
      { stdin: 'applepenapple\napple pen', expectedStdout: 'true' },
      { stdin: 'catsandog\ncats dog sand and cat', expectedStdout: 'false' },
    ],
  },
  {
    slug: 'find-median-data-stream',
    title: 'Find Median from Data Stream',
    description: 'The median is the middle value in an ordered integer list. If the size is even, the median is the mean of the two middle values.\n\nImplement the `MedianFinder` class:\n- `addNum(int num)` adds the integer to the data structure.\n- `findMedian()` returns the median of all elements so far.',
    difficulty: 'Hard',
    tags: ['Heap', 'Design', 'Two Pointers', 'Sorting'],
    companyTags: ['Goldman Sachs', 'Amazon', 'Google', 'Microsoft'],
    inputFormat: 'Operations one per line: addNum val or findMedian.',
    outputFormat: 'Results of findMedian operations.',
    constraints: '-10^5 <= num <= 10^5\nThere will be at least one element before findMedian is called.\nAt most 5 * 10^4 calls.',
    examples: [{ input: 'addNum 1\naddNum 2\nfindMedian\naddNum 3\nfindMedian', output: '1.5\n2.0', explanation: 'After [1,2]: median=1.5. After [1,2,3]: median=2.0.' }],
    testCases: [
      { stdin: 'addNum 1\naddNum 2\nfindMedian\naddNum 3\nfindMedian', expectedStdout: '1.5\n2.0' },
    ],
  },

  // ======================== FLIPKART (more) ========================
  {
    slug: 'sort-colors',
    title: 'Sort Colors (Dutch National Flag)',
    description: 'Given an array `nums` with `n` objects colored red, white, or blue (represented as 0, 1, and 2), sort them in-place so that objects of the same color are adjacent, in the order red, white, blue.\n\nYou must solve this without using the library sort function.',
    difficulty: 'Medium',
    tags: ['Arrays', 'Two Pointers', 'Sorting'],
    companyTags: ['Flipkart', 'Amazon', 'Microsoft', 'Adobe'],
    inputFormat: 'First line: n. Second line: n space-separated integers (0, 1, or 2).',
    outputFormat: 'Space-separated sorted integers.',
    constraints: 'n == nums.length\n1 <= n <= 300\nnums[i] is 0, 1, or 2.',
    examples: [{ input: '6\n2 0 2 1 1 0', output: '0 0 1 1 2 2', explanation: 'Dutch National Flag algorithm.' }],
    testCases: [
      { stdin: '6\n2 0 2 1 1 0', expectedStdout: '0 0 1 1 2 2' },
      { stdin: '3\n2 0 1', expectedStdout: '0 1 2' },
    ],
  },
  {
    slug: 'largest-rectangle-histogram',
    title: 'Largest Rectangle in Histogram',
    description: 'Given an array of integers `heights` representing the histogram bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.',
    difficulty: 'Hard',
    tags: ['Stack', 'Arrays', 'Monotonic Stack'],
    companyTags: ['Flipkart', 'Amazon', 'Google', 'Goldman Sachs'],
    inputFormat: 'First line: n. Second line: n space-separated integers.',
    outputFormat: 'An integer — max rectangle area.',
    constraints: '1 <= heights.length <= 10^5\n0 <= heights[i] <= 10^4',
    examples: [{ input: '6\n2 1 5 6 2 3', output: '10', explanation: 'Rectangle with height 5 spanning 2 bars (indices 2-3).' }],
    testCases: [
      { stdin: '6\n2 1 5 6 2 3', expectedStdout: '10' },
      { stdin: '2\n2 4', expectedStdout: '4' },
    ],
  },
  {
    slug: 'matrix-chain-multiplication',
    title: 'Matrix Chain Multiplication',
    description: 'Given a sequence of matrices, find the most efficient way to multiply these matrices together. The problem is not actually to perform the multiplications, but merely to decide in which order to perform the multiplications.\n\nGiven an array `p[]` of dimensions where the ith matrix has dimensions `p[i-1] x p[i]`, return the minimum number of scalar multiplications needed.',
    difficulty: 'Hard',
    tags: ['Dynamic Programming', 'Recursion'],
    companyTags: ['Flipkart', 'Amazon', 'Adobe', 'Goldman Sachs'],
    inputFormat: 'First line: n. Second line: n space-separated dimensions.',
    outputFormat: 'An integer — minimum multiplications.',
    constraints: '2 <= n <= 100\n1 <= p[i] <= 500',
    examples: [{ input: '4\n40 20 30 10', output: '26000', explanation: '(A1(A2*A3)) costs 20*30*10 + 40*20*10 = 6000 + 8000... Actually optimal is 26000.' }],
    testCases: [
      { stdin: '5\n1 2 3 4 3', expectedStdout: '30' },
      { stdin: '4\n10 30 5 60', expectedStdout: '4500' },
    ],
  },
];

// Bulk import
console.log(`Importing ${problems.length} additional interview questions...`);

const BATCH_SIZE = 50;
let upserted = 0;
let modified = 0;

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
  } else {
    const result = await res.json();
    upserted += result.upserted ?? 0;
    modified += result.modified ?? 0;
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: upserted=${result.upserted}, modified=${result.modified}`);
  }
}

console.log(`\nDone! New: ${upserted}, Updated: ${modified}`);

// Final count per company
const allRes = await fetch(`${API}/api/admin/problems?limit=500`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const allData = await allRes.json();
const companyCounts = {};
for (const p of allData.problems) {
  for (const c of (p.companyTags ?? [])) {
    companyCounts[c] = (companyCounts[c] || 0) + 1;
  }
}
console.log('\nFinal company question counts:');
Object.entries(companyCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([company, count]) => console.log(`  ${company}: ${count} questions`));
