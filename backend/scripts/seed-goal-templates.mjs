/**
 * Seed script: Admin-curated Goal Templates
 * - LeetCode-style quests (goalType: 'quest', isPublic: true)
 * - Popular coding sheets as recommended goals (goalType: 'recommended', isPublic: true)
 * - Company prep goals (goalType: 'company_prep', isPublic: true)
 *
 * Run: node scripts/seed-goal-templates.mjs
 */

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/learnhub';

const moduleSchema = new mongoose.Schema({
  moduleId: String, title: String, description: String,
  topics: [String], difficulty: String, status: String,
  estimatedHours: Number, problemSlugs: [String],
});
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId() },
  name: String, icon: String, description: String, topic: String,
  difficulty: String, goalType: String, category: String,
  companyTarget: String, roleTarget: String,
  questOrder: Number, isLocked: Boolean,
  xpReward: Number, estimatedHours: Number,
  isPublic: Boolean, templateId: mongoose.Schema.Types.ObjectId,
  modules: [moduleSchema], progress: Number, status: String,
  isFocus: Boolean, weeklyHours: Number,
  startDate: Date, deadline: Date, streak: Number, rationale: String,
}, { timestamps: true });

const Goal = mongoose.models.Goal || mongoose.model('Goal', goalSchema);

// Admin userId placeholder (quests are templates, no real user owns them)
const SYSTEM_USER = new mongoose.Types.ObjectId('000000000000000000000001');
const deadline = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead

/* ═══════════════════════════════════════════════════════════════════
   QUEST TEMPLATES  (LeetCode-style quests)
═══════════════════════════════════════════════════════════════════ */
const QUEST_TEMPLATES = [
  {
    name: 'Top Interview 150',
    icon: '💼',
    description: 'Master the 150 most frequently asked interview questions across all major topics. Designed by ex-FAANG engineers.',
    topic: 'Interview Preparation',
    difficulty: 'Intermediate',
    goalType: 'quest',
    category: 'dsa',
    questOrder: 1,
    estimatedHours: 60,
    xpReward: 1500,
    rationale: 'The 150 problems that appear most frequently in FAANG interviews, curated from thousands of interview reports.',
    modules: [
      { moduleId: 'iq150-array', title: 'Array / String', description: '34 problems covering merge sorted array, jump game, candy, text justification, and more.', topics: ['Arrays', 'Strings', 'Two Pointers'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'iq150-two-ptr', title: 'Two Pointers', description: 'Valid palindrome, 3sum, container with most water.', topics: ['Two Pointers'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'iq150-sliding', title: 'Sliding Window', description: 'Minimum size subarray, longest substring without repeating chars.', topics: ['Sliding Window'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'iq150-matrix', title: 'Matrix', description: 'Valid sudoku, spiral matrix, rotate image, set matrix zeroes.', topics: ['Matrix', '2D Arrays'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'iq150-hashmap', title: 'Hashmap', description: 'Ransom note, isomorphic strings, group anagrams, two sum.', topics: ['Hash Table', 'HashMap'], difficulty: 'Easy', estimatedHours: 4 },
      { moduleId: 'iq150-intervals', title: 'Intervals', description: 'Summary ranges, merge intervals, insert interval.', topics: ['Intervals', 'Greedy'], difficulty: 'Medium', estimatedHours: 3 },
      { moduleId: 'iq150-stack', title: 'Stack', description: 'Valid parentheses, simplify path, min stack, evaluate reverse polish notation.', topics: ['Stack'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'iq150-linked-list', title: 'Linked List', description: 'Linked list cycle, add two numbers, merge k sorted lists, reverse nodes in k-group.', topics: ['Linked List'], difficulty: 'Hard', estimatedHours: 6 },
      { moduleId: 'iq150-tree', title: 'Binary Tree', description: 'Max depth, same tree, invert tree, construct from preorder/inorder, level order traversal.', topics: ['Binary Tree', 'BFS', 'DFS'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'iq150-graph', title: 'Graph', description: 'Number of islands, surrounded regions, clone graph, course schedule II.', topics: ['Graph', 'BFS', 'DFS', 'Union Find'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'iq150-dp', title: 'Dynamic Programming', description: 'Climbing stairs, house robber, coin change, longest increasing subsequence.', topics: ['DP', 'Memoization'], difficulty: 'Hard', estimatedHours: 8 },
      { moduleId: 'iq150-bit', title: 'Bit Manipulation', description: 'Add binary, reverse bits, number of 1 bits, single number.', topics: ['Bit Manipulation'], difficulty: 'Easy', estimatedHours: 3 },
    ],
  },
  {
    name: '30 Days of Array Challenges',
    icon: '📅',
    description: 'A structured 30-day plan to go from array basics to advanced techniques including prefix sum, two pointers, and sliding window.',
    topic: 'Arrays',
    difficulty: 'Beginner',
    goalType: 'quest',
    category: 'dsa',
    questOrder: 2,
    estimatedHours: 30,
    xpReward: 750,
    rationale: 'Arrays are the most fundamental data structure. Mastering them unlocks 60% of all DSA problems.',
    modules: [
      { moduleId: 'd30a-basics', title: 'Week 1: Basics', description: 'Traversal, insertion, deletion, searching in arrays.', topics: ['Arrays', 'Linear Search'], difficulty: 'Easy', estimatedHours: 6 },
      { moduleId: 'd30a-sorting', title: 'Week 2: Sorting', description: 'Bubble, selection, insertion sort. Merge sort and quick sort.', topics: ['Sorting', 'Divide & Conquer'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'd30a-techniques', title: 'Week 3: Core Techniques', description: 'Prefix sums, difference arrays, two pointers, sliding window.', topics: ['Prefix Sum', 'Two Pointers', 'Sliding Window'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'd30a-advanced', title: 'Week 4: Advanced', description: 'Kadane\'s algorithm, Dutch national flag, next permutation, meeting rooms.', topics: ['Greedy', 'Advanced Arrays'], difficulty: 'Hard', estimatedHours: 8 },
    ],
  },
  {
    name: 'SQL 50',
    icon: '🗄️',
    description: 'Solve 50 SQL problems covering SELECT, JOINs, aggregations, window functions, and subqueries — exactly what top companies test.',
    topic: 'SQL',
    difficulty: 'Intermediate',
    goalType: 'quest',
    category: 'sql',
    questOrder: 3,
    estimatedHours: 20,
    xpReward: 600,
    rationale: 'SQL is tested in 80% of data engineering and backend roles. These 50 problems cover all real interview patterns.',
    modules: [
      { moduleId: 'sql50-select', title: 'SELECT Queries', description: 'Basic SELECT, WHERE, DISTINCT, ORDER BY, LIMIT.', topics: ['SQL', 'SELECT'], difficulty: 'Easy', estimatedHours: 4 },
      { moduleId: 'sql50-joins', title: 'JOINs', description: 'INNER JOIN, LEFT/RIGHT JOIN, FULL OUTER JOIN, SELF JOIN.', topics: ['SQL', 'JOINs'], difficulty: 'Medium', estimatedHours: 5 },
      { moduleId: 'sql50-agg', title: 'Aggregation Functions', description: 'COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING.', topics: ['SQL', 'Aggregation'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'sql50-subquery', title: 'Subqueries & CTEs', description: 'Nested queries, correlated subqueries, WITH (CTE).', topics: ['SQL', 'Subqueries', 'CTE'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'sql50-window', title: 'Window Functions', description: 'ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, PARTITION BY.', topics: ['SQL', 'Window Functions'], difficulty: 'Hard', estimatedHours: 3 },
    ],
  },
  {
    name: 'Graph Theory Challenge',
    icon: '🕸️',
    description: 'Master graph algorithms: BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Kruskal, Prim, and Topological Sort.',
    topic: 'Graph Algorithms',
    difficulty: 'Advanced',
    goalType: 'quest',
    category: 'dsa',
    questOrder: 4,
    estimatedHours: 35,
    xpReward: 1000,
    rationale: 'Graphs appear in 40% of advanced rounds at FAANG companies. Most candidates fail on graph problems due to lack of practice.',
    modules: [
      { moduleId: 'graph-repr', title: 'Graph Representation', description: 'Adjacency matrix, adjacency list, edge list. BFS and DFS fundamentals.', topics: ['Graphs', 'BFS', 'DFS'], difficulty: 'Easy', estimatedHours: 5 },
      { moduleId: 'graph-shortest', title: 'Shortest Path', description: 'Dijkstra\'s algorithm, Bellman-Ford, Floyd-Warshall. Negative weights.', topics: ['Dijkstra', 'Shortest Path'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'graph-mst', title: 'Minimum Spanning Tree', description: 'Kruskal\'s with Union-Find, Prim\'s algorithm.', topics: ['MST', 'Union Find', 'Greedy'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'graph-topo', title: 'Topological Sort & DAGs', description: 'Kahn\'s algorithm, DFS-based topological sort, detecting cycles.', topics: ['Topological Sort', 'DAG'], difficulty: 'Medium', estimatedHours: 6 },
      { moduleId: 'graph-adv', title: 'Advanced Topics', description: 'Strongly connected components (Kosaraju), bridges & articulation points, bipartite check.', topics: ['SCC', 'Bridges', 'Bipartite'], difficulty: 'Hard', estimatedHours: 9 },
    ],
  },
  {
    name: 'Dynamic Programming Mastery',
    icon: '🧠',
    description: 'From memoization to tabulation, 1D DP to grid DP, knapsack to interval DP — the complete DP journey.',
    topic: 'Dynamic Programming',
    difficulty: 'Advanced',
    goalType: 'quest',
    category: 'dsa',
    questOrder: 5,
    estimatedHours: 40,
    xpReward: 1200,
    rationale: 'DP is the #1 topic in FAANG interviews. Most candidates who fail have weak DP — this quest fixes that.',
    modules: [
      { moduleId: 'dp-1d', title: '1D Dynamic Programming', description: 'Climbing stairs, house robber, fibonacci, jump game, decode ways.', topics: ['DP', '1D DP'], difficulty: 'Easy', estimatedHours: 6 },
      { moduleId: 'dp-grid', title: 'Grid DP', description: 'Unique paths, minimum path sum, edit distance (2D).', topics: ['DP', 'Grid', '2D DP'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'dp-knapsack', title: 'Knapsack Patterns', description: '0/1 knapsack, unbounded knapsack, subset sum, partition equal subset.', topics: ['Knapsack', 'DP'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'dp-strings', title: 'String DP', description: 'Longest common subsequence, longest palindromic subsequence, edit distance.', topics: ['DP', 'Strings', 'LCS'], difficulty: 'Hard', estimatedHours: 8 },
      { moduleId: 'dp-interval', title: 'Interval & Bitmask DP', description: 'Burst balloons, matrix chain multiplication, traveling salesman.', topics: ['Interval DP', 'Bitmask DP'], difficulty: 'Hard', estimatedHours: 11 },
    ],
  },
  {
    name: 'System Design for SDE-2+',
    icon: '🏗️',
    description: 'Learn to design scalable systems: URL shortener, Netflix, Uber, WhatsApp, Twitter. Covers HLD, LLD, databases, caching, and more.',
    topic: 'System Design',
    difficulty: 'Advanced',
    goalType: 'quest',
    category: 'system_design',
    questOrder: 6,
    estimatedHours: 50,
    xpReward: 1500,
    rationale: 'System design is mandatory for SDE-2+ roles. Companies like Google, Uber, and Meta eliminate candidates who cannot design systems under pressure.',
    modules: [
      { moduleId: 'sd-foundations', title: 'Foundations', description: 'CAP theorem, scalability, load balancing, caching, CDN, databases.', topics: ['System Design', 'Scalability', 'CAP Theorem'], difficulty: 'Medium', estimatedHours: 10 },
      { moduleId: 'sd-databases', title: 'Database Design', description: 'SQL vs NoSQL, sharding, replication, ACID, BASE, indexing.', topics: ['Databases', 'SQL', 'NoSQL', 'Sharding'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'sd-api', title: 'API Design & Microservices', description: 'REST vs GraphQL, API gateway, service mesh, circuit breaker.', topics: ['APIs', 'Microservices', 'REST', 'gRPC'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'sd-case1', title: 'Case Studies: Messaging & Social', description: 'Design WhatsApp, Twitter/X, Instagram, YouTube.', topics: ['System Design', 'Messaging', 'Social Media'], difficulty: 'Hard', estimatedHours: 12 },
      { moduleId: 'sd-case2', title: 'Case Studies: Infra & E-commerce', description: 'Design URL shortener, Uber, Amazon, distributed cache, notification system.', topics: ['System Design', 'Distributed Systems'], difficulty: 'Hard', estimatedHours: 13 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   RECOMMENDED GOAL TEMPLATES  (Popular coding sheets)
═══════════════════════════════════════════════════════════════════ */
const RECOMMENDED_TEMPLATES = [
  {
    name: 'Striver SDE Sheet (191 Problems)',
    icon: '⭐',
    description: 'The most popular DSA sheet by Raj Vikramaditya (Striver). Covers all essential DSA topics with 191 handpicked problems from LeetCode and GFG. Used by 1M+ students.',
    topic: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 120,
    xpReward: 3000,
    rationale: 'Striver\'s SDE Sheet is the gold standard for DSA preparation. It systematically covers all topics needed for FAANG and product-based company interviews.',
    modules: [
      { moduleId: 'striver-day1-2', title: 'Day 1-2: Arrays (Hard)', description: 'Set matrix zeroes, Pascal\'s triangle, next permutation, Kadane\'s algorithm, sort 0s 1s 2s, buy & sell stock, merge overlapping intervals.', topics: ['Arrays', 'Greedy'], difficulty: 'Hard', estimatedHours: 8 },
      { moduleId: 'striver-day3-4', title: 'Day 3-4: Arrays (Medium)', description: 'Two sum, repeat & missing, merge sorted arrays without extra space, count inversions.', topics: ['Arrays', 'Sorting'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'striver-day5-6', title: 'Day 5-6: Linked List', description: 'Reverse linked list, middle of linked list, merge two sorted lists, detect cycle, find start of cycle.', topics: ['Linked List'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'striver-day7-8', title: 'Day 7-8: Recursion & Backtracking', description: 'Subset sums, N-Queens, Sudoku solver, M coloring problem.', topics: ['Recursion', 'Backtracking'], difficulty: 'Hard', estimatedHours: 9 },
      { moduleId: 'striver-day9-10', title: 'Day 9-10: Binary Search', description: 'Binary search basics, search in rotated array, find peak, median of sorted arrays.', topics: ['Binary Search'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'striver-day11-12', title: 'Day 11-12: Heaps & Priority Queues', description: 'Kth largest, merge K sorted lists, top K frequent, median from data stream.', topics: ['Heap', 'Priority Queue'], difficulty: 'Hard', estimatedHours: 8 },
      { moduleId: 'striver-day13-14', title: 'Day 13-14: Stack & Queue', description: 'Implement stack using queues, LRU cache, max sliding window.', topics: ['Stack', 'Queue', 'Deque'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'striver-day15-17', title: 'Day 15-17: String Algorithms', description: 'Reverse words, longest palindromic substring, implement strStr, Z-algorithm, KMP.', topics: ['Strings', 'Pattern Matching'], difficulty: 'Hard', estimatedHours: 9 },
      { moduleId: 'striver-day18-20', title: 'Day 18-20: Binary Trees', description: 'Max depth, diameter, LCA, zigzag traversal, path sum II, construct from traversals.', topics: ['Binary Tree', 'DFS', 'BFS'], difficulty: 'Medium', estimatedHours: 10 },
      { moduleId: 'striver-day21-22', title: 'Day 21-22: BST', description: 'Search, insert, delete in BST. Kth smallest, floor & ceil in BST. Validate BST.', topics: ['BST', 'Binary Tree'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'striver-day23-24', title: 'Day 23-24: Graphs', description: 'BFS, DFS, topological sort, Dijkstra, Prim, number of islands.', topics: ['Graph', 'BFS', 'DFS'], difficulty: 'Hard', estimatedHours: 10 },
      { moduleId: 'striver-day25-26', title: 'Day 25-26: Dynamic Programming', description: 'Knapsack, LCS, LIS, matrix chain multiplication, DP on trees.', topics: ['DP'], difficulty: 'Hard', estimatedHours: 12 },
      { moduleId: 'striver-day27-28', title: 'Day 27-28: Tries & Advanced', description: 'Implement trie, word search II, segment trees, disjoint set union.', topics: ['Trie', 'Segment Tree', 'Union Find'], difficulty: 'Hard', estimatedHours: 10 },
      { moduleId: 'striver-day29-30', title: 'Day 29-30: Greedy & Bit Manipulation', description: 'Activity selection, job scheduling, N meetings, bit tricks.', topics: ['Greedy', 'Bit Manipulation'], difficulty: 'Medium', estimatedHours: 8 },
    ],
  },
  {
    name: 'Love Babbar DSA Sheet (450 Problems)',
    icon: '🔥',
    description: 'The legendary 450-problem DSA sheet by Love Babbar. Covers arrays to graphs, from easy to hard. Preferred by campus placement aspirants.',
    topic: 'Data Structures & Algorithms',
    difficulty: 'Beginner',
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 180,
    xpReward: 4500,
    rationale: 'Love Babbar\'s 450 DSA sheet is the most comprehensive resource for placement preparation. It starts from absolute basics and builds up to hard interview problems.',
    modules: [
      { moduleId: 'lb-arrays', title: 'Arrays (37 Problems)', description: 'Reverse, rotate, duplicates, max sum subarray, majority element, merge intervals.', topics: ['Arrays'], difficulty: 'Easy', estimatedHours: 15 },
      { moduleId: 'lb-matrix', title: 'Matrix (15 Problems)', description: 'Rotate matrix, spiral order, set zeroes, search in sorted matrix.', topics: ['Matrix'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'lb-strings', title: 'Strings (30 Problems)', description: 'Anagram check, palindrome, longest common prefix, valid parentheses.', topics: ['Strings'], difficulty: 'Easy', estimatedHours: 12 },
      { moduleId: 'lb-searching', title: 'Searching & Sorting (30 Problems)', description: 'Binary search variants, QuickSort, merge sort, counting sort.', topics: ['Searching', 'Sorting', 'Binary Search'], difficulty: 'Medium', estimatedHours: 12 },
      { moduleId: 'lb-linked-list', title: 'Linked List (30 Problems)', description: 'Reverse, detect cycle, merge sort on list, flatten list.', topics: ['Linked List'], difficulty: 'Medium', estimatedHours: 13 },
      { moduleId: 'lb-stack-queue', title: 'Stack & Queue (30 Problems)', description: 'NGE, stock span, LRU cache, sliding window max.', topics: ['Stack', 'Queue'], difficulty: 'Medium', estimatedHours: 12 },
      { moduleId: 'lb-tree', title: 'Binary Tree (40 Problems)', description: 'Traversals, views, diameter, LCA, serialize/deserialize.', topics: ['Binary Tree'], difficulty: 'Medium', estimatedHours: 16 },
      { moduleId: 'lb-bst', title: 'BST (26 Problems)', description: 'Operations, kth smallest, recover BST, convert to DLL.', topics: ['BST'], difficulty: 'Medium', estimatedHours: 11 },
      { moduleId: 'lb-greedy', title: 'Greedy (16 Problems)', description: 'Activity selection, fractional knapsack, job sequencing.', topics: ['Greedy'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'lb-backtracking', title: 'Backtracking (20 Problems)', description: 'N-Queens, Sudoku, word break, rat in a maze.', topics: ['Backtracking', 'Recursion'], difficulty: 'Hard', estimatedHours: 10 },
      { moduleId: 'lb-graph', title: 'Graph (29 Problems)', description: 'Traversals, shortest path, MST, topological sort, strongly connected components.', topics: ['Graph'], difficulty: 'Hard', estimatedHours: 15 },
      { moduleId: 'lb-dp', title: 'Dynamic Programming (56 Problems)', description: 'All classic DP patterns: knapsack, LCS, LIS, matrix DP, bitmask DP.', topics: ['DP'], difficulty: 'Hard', estimatedHours: 25 },
      { moduleId: 'lb-trie', title: 'Trie (10 Problems)', description: 'Insert, search, startsWith, word search.', topics: ['Trie'], difficulty: 'Medium', estimatedHours: 5 },
      { moduleId: 'lb-heap', title: 'Heap (15 Problems)', description: 'Kth largest/smallest, merge K sorted lists, median stream.', topics: ['Heap'], difficulty: 'Hard', estimatedHours: 7 },
      { moduleId: 'lb-misc', title: 'Bit Manipulation & Math (40 Problems)', description: 'Bit tricks, number theory, prime sieve.', topics: ['Bit Manipulation', 'Math'], difficulty: 'Medium', estimatedHours: 13 },
    ],
  },
  {
    name: 'NeetCode 150',
    icon: '🦅',
    description: 'The curated 150-problem list by NeetCode (YouTube). Categorized by pattern for optimal learning. Most efficient path to passing FAANG interviews.',
    topic: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 80,
    xpReward: 2000,
    rationale: 'NeetCode 150 is pattern-based and efficient. Each category teaches you a reusable template that applies to dozens of problems.',
    modules: [
      { moduleId: 'nc-arrays-hash', title: 'Arrays & Hashing (9)', description: 'Contains duplicate, anagram, two sum, group anagrams, top K frequent, product except self.', topics: ['Arrays', 'Hash Table'], difficulty: 'Easy', estimatedHours: 5 },
      { moduleId: 'nc-two-ptr', title: 'Two Pointers (5)', description: 'Valid palindrome, two sum II, 3Sum, trapping rain water.', topics: ['Two Pointers'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'nc-sliding', title: 'Sliding Window (6)', description: 'Buy & sell stock, longest no-repeat substring, longest repeating char replacement, permutation in string.', topics: ['Sliding Window'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'nc-stack', title: 'Stack (7)', description: 'Valid parentheses, min stack, evaluate RPN, generate parentheses, daily temperatures.', topics: ['Stack'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'nc-binary-search', title: 'Binary Search (7)', description: 'Binary search, search 2D matrix, Koko eating bananas, find minimum in rotated sorted array.', topics: ['Binary Search'], difficulty: 'Medium', estimatedHours: 5 },
      { moduleId: 'nc-linked-list', title: 'Linked List (11)', description: 'Reverse list, merge two sorted lists, reorder list, remove Nth from end, LRU cache.', topics: ['Linked List'], difficulty: 'Medium', estimatedHours: 6 },
      { moduleId: 'nc-trees', title: 'Trees (15)', description: 'Invert binary tree, max depth, diameter, same tree, subtree, LCA, level order, kth smallest in BST.', topics: ['Binary Tree', 'BST'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'nc-heap', title: 'Heap / Priority Queue (7)', description: 'Kth largest, last stone weight, K closest points, task scheduler, design Twitter.', topics: ['Heap'], difficulty: 'Medium', estimatedHours: 5 },
      { moduleId: 'nc-backtrack', title: 'Backtracking (9)', description: 'Subsets, combination sum, permutations, word search, N-Queens.', topics: ['Backtracking'], difficulty: 'Hard', estimatedHours: 7 },
      { moduleId: 'nc-graphs', title: 'Graphs (13)', description: 'Islands, max area, clone graph, walls and gates, rotting oranges, course schedule, word ladder.', topics: ['Graph', 'BFS', 'DFS', 'Union Find'], difficulty: 'Hard', estimatedHours: 9 },
      { moduleId: 'nc-dp1', title: '1-D DP (12)', description: 'Climbing stairs, min cost climbing, house robber I&II, word break, decode ways, coin change.', topics: ['1D DP'], difficulty: 'Medium', estimatedHours: 7 },
      { moduleId: 'nc-dp2', title: '2-D DP (11)', description: 'Unique paths, longest common subsequence, best time to buy/sell stocks, edit distance, interleaving.', topics: ['2D DP'], difficulty: 'Hard', estimatedHours: 8 },
      { moduleId: 'nc-greedy', title: 'Greedy (8)', description: 'Maximum subarray, jump game I&II, gas station, candy, hand of straights.', topics: ['Greedy'], difficulty: 'Medium', estimatedHours: 5 },
      { moduleId: 'nc-intervals', title: 'Intervals (6)', description: 'Insert interval, merge intervals, non-overlapping, meeting rooms.', topics: ['Intervals'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'nc-math-bit', title: 'Math & Bit Manipulation (8)', description: 'Single number, reverse bits, number of 1 bits, missing number, sum of two integers.', topics: ['Bit Manipulation', 'Math'], difficulty: 'Easy', estimatedHours: 4 },
      { moduleId: 'nc-advanced-graphs', title: 'Advanced Graphs (6)', description: 'Reconstruct itinerary, min cost to connect all points, network delay time, alien dictionary.', topics: ['Advanced Graphs', 'Dijkstra'], difficulty: 'Hard', estimatedHours: 8 },
    ],
  },
  {
    name: 'GFG Top 100 Interview Questions',
    icon: '🌿',
    description: 'GeeksForGeeks\'s curated top 100 interview questions across all DSA topics. Widely used for Indian product company and service company placements.',
    topic: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 50,
    xpReward: 1200,
    rationale: 'GFG Top 100 is specifically curated for Indian company interviews (Flipkart, Zoho, TCS, Infosys, etc.) and covers all commonly asked problem patterns.',
    modules: [
      { moduleId: 'gfg-arrays', title: 'Arrays & Strings', description: 'Rotate array, leaders in array, max consecutive 1s, next permutation, anagram check.', topics: ['Arrays', 'Strings'], difficulty: 'Easy', estimatedHours: 8 },
      { moduleId: 'gfg-linked-list', title: 'Linked List', description: 'Detect loop, remove duplicates, reverse in groups, add two numbers.', topics: ['Linked List'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'gfg-tree', title: 'Trees & BST', description: 'Height, views, LCA, Morris traversal, convert sorted array to BST.', topics: ['Tree', 'BST'], difficulty: 'Medium', estimatedHours: 10 },
      { moduleId: 'gfg-dp', title: 'Dynamic Programming', description: 'Egg drop, matrix chain, Boolean parenthesization, DP on sequences.', topics: ['DP'], difficulty: 'Hard', estimatedHours: 12 },
      { moduleId: 'gfg-graph', title: 'Graph Algorithms', description: 'Dijkstra, Floyd-Warshall, strongly connected, bipartite, bridge.', topics: ['Graph'], difficulty: 'Hard', estimatedHours: 12 },
    ],
  },
  {
    name: 'Blind 75 — Classic Must-Dos',
    icon: '👁️',
    description: 'The original "Blind 75" list — 75 LeetCode problems that commonly appear in top-tier tech interviews. Compact and highly effective.',
    topic: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 40,
    xpReward: 1000,
    rationale: 'The Blind 75 originated from a viral tech forum post. Despite being the shortest list, it has the highest interview hit rate of all DSA sheets.',
    modules: [
      { moduleId: 'b75-array', title: 'Array (11)', description: 'Two sum, best time to buy sell, contains duplicate, product except self, max subarray.', topics: ['Arrays'], difficulty: 'Easy', estimatedHours: 5 },
      { moduleId: 'b75-binary', title: 'Binary (5)', description: 'Sum of two integers, number of 1 bits, counting bits, missing number, reverse bits.', topics: ['Bit Manipulation'], difficulty: 'Easy', estimatedHours: 3 },
      { moduleId: 'b75-dp', title: 'Dynamic Programming (11)', description: 'Climbing stairs, coin change, longest increasing subseq, word break, combination sum IV.', topics: ['DP'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'b75-graph', title: 'Graph (8)', description: 'Clone graph, course schedule, pacific Atlantic, number of islands, alien dictionary.', topics: ['Graph'], difficulty: 'Hard', estimatedHours: 7 },
      { moduleId: 'b75-interval', title: 'Interval (5)', description: 'Insert, merge, non-overlapping, meeting rooms.', topics: ['Intervals'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'b75-linked-list', title: 'Linked List (6)', description: 'Reverse, detect cycle, merge two sorted, remove Nth, reorder.', topics: ['Linked List'], difficulty: 'Medium', estimatedHours: 5 },
      { moduleId: 'b75-matrix', title: 'Matrix (4)', description: 'Set zeroes, spiral order, rotate image, word search.', topics: ['Matrix'], difficulty: 'Medium', estimatedHours: 4 },
      { moduleId: 'b75-string', title: 'String (10)', description: 'Longest substring, grouping anagrams, palindromic substrings, encode/decode strings.', topics: ['Strings'], difficulty: 'Medium', estimatedHours: 6 },
      { moduleId: 'b75-tree', title: 'Tree (11)', description: 'Max depth, same tree, invert, LCA, construct from traversals, serialize/deserialize.', topics: ['Binary Tree', 'BST'], difficulty: 'Medium', estimatedHours: 8 },
      { moduleId: 'b75-heap', title: 'Heap (4)', description: 'Merge K sorted lists, top K frequent, find median, K closest.', topics: ['Heap'], difficulty: 'Hard', estimatedHours: 5 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   COMPANY PREP TEMPLATES
═══════════════════════════════════════════════════════════════════ */
const COMPANY_PREP_TEMPLATES = [
  {
    name: 'Google SWE Interview Prep',
    icon: '🔍',
    description: 'Targeted preparation for Google SWE interviews. Covers algorithms, system design, and Googleyness. Based on real interview reports from Glassdoor and blind.',
    topic: 'Google Interview Preparation',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Google',
    roleTarget: 'SWE',
    estimatedHours: 80,
    xpReward: 2000,
    rationale: 'Google interviews focus heavily on algorithms, data structures, and system design. This prep covers Google-specific patterns from hundreds of real interview reports.',
    modules: [
      { moduleId: 'google-algo', title: 'Algorithm Rounds', description: 'Arrays, strings, trees, graphs, DP — all with Google\'s expected O(n log n) or O(n) complexity focus.', topics: ['DSA', 'Algorithms', 'Complexity'], difficulty: 'Hard', estimatedHours: 25 },
      { moduleId: 'google-sd', title: 'System Design', description: 'Design Google Search, Google Maps, YouTube, Google Drive, Gmail.', topics: ['System Design', 'Distributed Systems'], difficulty: 'Hard', estimatedHours: 20 },
      { moduleId: 'google-coding', title: 'Coding Fundamentals', description: 'Clean code, SOLID principles, testing, debugging. How Google evaluates code quality.', topics: ['Coding Standards', 'OOP'], difficulty: 'Medium', estimatedHours: 10 },
      { moduleId: 'google-behavioral', title: 'Googleyness & Leadership', description: 'Behavioral questions focused on Googleyness: ambiguity, impact, teamwork, failure.', topics: ['Behavioral', 'Leadership'], difficulty: 'Easy', estimatedHours: 10 },
      { moduleId: 'google-mock', title: 'Mock Interviews', description: 'Full mock interview simulations with time limits and real Google-style questions.', topics: ['Mock Interview'], difficulty: 'Hard', estimatedHours: 15 },
    ],
  },
  {
    name: 'Amazon SDE Interview Prep',
    icon: '📦',
    description: 'Comprehensive Amazon SDE prep. OOP + design patterns, leadership principles, and DSA. Amazon\'s unique LP-based behavioral rounds make this distinct from other companies.',
    topic: 'Amazon Interview Preparation',
    difficulty: 'Intermediate',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Amazon',
    roleTarget: 'SDE',
    estimatedHours: 70,
    xpReward: 1800,
    rationale: 'Amazon is the #1 recruiter globally. LP-based behavioral rounds and OOP-focused coding rounds make Amazon prep unique. This guide is based on 500+ Amazon interview reports.',
    modules: [
      { moduleId: 'amazon-dsa', title: 'DSA Coding Rounds', description: 'Amazon focuses on arrays, trees, graphs, DP. Time complexity is critical — O(n) is often expected.', topics: ['DSA', 'Arrays', 'Trees', 'DP'], difficulty: 'Medium', estimatedHours: 20 },
      { moduleId: 'amazon-oop', title: 'OOP & LLD Design', description: 'Design a parking lot, chess game, elevator system, Amazon Locker. SOLID, design patterns.', topics: ['OOP', 'LLD', 'Design Patterns'], difficulty: 'Medium', estimatedHours: 15 },
      { moduleId: 'amazon-lp', title: 'Leadership Principles (14 LPs)', description: 'All 14 Amazon LPs with STAR method answers. Bias for Action, Customer Obsession, Ownership, etc.', topics: ['Behavioral', 'Amazon LPs', 'STAR Method'], difficulty: 'Easy', estimatedHours: 12 },
      { moduleId: 'amazon-sd', title: 'System Design HLD', description: 'Design Amazon.com, Prime Video, Kindle, AWS S3, SQS.', topics: ['System Design', 'AWS'], difficulty: 'Hard', estimatedHours: 15 },
      { moduleId: 'amazon-mock', title: 'Full Mock Loop', description: '4-round mock: 2 DSA + 1 LLD + 1 behavioral. Time-boxed.', topics: ['Mock Interview'], difficulty: 'Hard', estimatedHours: 8 },
    ],
  },
  {
    name: 'Microsoft SWE Interview Prep',
    icon: '🪟',
    description: 'Microsoft SWE interview prep covering coding, design, and behavioral rounds. Includes Windows, Azure, and product-specific contexts.',
    topic: 'Microsoft Interview Preparation',
    difficulty: 'Intermediate',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Microsoft',
    roleTarget: 'SWE',
    estimatedHours: 60,
    xpReward: 1600,
    rationale: 'Microsoft values both technical depth and collaborative mindset. Their interviews include group design rounds and focus on code quality over raw algorithm optimization.',
    modules: [
      { moduleId: 'ms-dsa', title: 'Coding Rounds', description: 'Arrays, strings, trees, graphs. Microsoft often asks 2-3 medium problems per round with discussion.', topics: ['DSA', 'Coding'], difficulty: 'Medium', estimatedHours: 20 },
      { moduleId: 'ms-design', title: 'System & OOP Design', description: 'Design Skype, OneDrive, Teams, Xbox Live. OOP and LLD patterns.', topics: ['System Design', 'OOP', 'LLD'], difficulty: 'Hard', estimatedHours: 18 },
      { moduleId: 'ms-behavioral', title: 'Growth Mindset & Culture Fit', description: 'Microsoft focuses on collaboration, growth mindset, and curiosity. STAR method with specific examples.', topics: ['Behavioral', 'Culture Fit'], difficulty: 'Easy', estimatedHours: 10 },
      { moduleId: 'ms-mock', title: 'Final Mock Interview', description: '3-round simulation: 2 coding + 1 design. Includes "As Appropriate" (AA) round guidance.', topics: ['Mock Interview'], difficulty: 'Hard', estimatedHours: 12 },
    ],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  let questsCreated = 0;
  let recommendedCreated = 0;
  let companyCreated = 0;

  const allTemplates = [
    ...QUEST_TEMPLATES.map((t) => ({ ...t, userId: SYSTEM_USER })),
    ...RECOMMENDED_TEMPLATES.map((t) => ({ ...t, userId: SYSTEM_USER })),
    ...COMPANY_PREP_TEMPLATES.map((t) => ({ ...t, userId: SYSTEM_USER })),
  ];

  for (const tmpl of allTemplates) {
    const modules = (tmpl.modules || []).map((m, i) => ({
      moduleId: m.moduleId || `module-${i + 1}`,
      title: m.title,
      description: m.description || '',
      topics: m.topics || [],
      difficulty: m.difficulty || 'Medium',
      status: 'not_started',
      estimatedHours: m.estimatedHours || 2,
      actualMinutes: 0,
      quizScore: null,
      problemSlugs: m.problemSlugs || [],
      problemsSolved: 0,
    }));

    const existing = await Goal.findOne({ name: tmpl.name, isPublic: true });
    if (existing) {
      console.log(`  ⏭  Already exists: "${tmpl.name}"`);
      continue;
    }

    await Goal.create({
      userId: SYSTEM_USER,
      name: tmpl.name,
      icon: tmpl.icon || '🎯',
      description: tmpl.description || '',
      topic: tmpl.topic,
      difficulty: tmpl.difficulty || 'Intermediate',
      goalType: tmpl.goalType,
      category: tmpl.category,
      companyTarget: tmpl.companyTarget || null,
      roleTarget: tmpl.roleTarget || null,
      questOrder: tmpl.questOrder || 0,
      isLocked: false,
      xpReward: tmpl.xpReward || 500,
      estimatedHours: tmpl.estimatedHours || 20,
      isPublic: true,
      modules,
      progress: 0,
      status: 'active',
      isFocus: false,
      weeklyHours: 10,
      startDate: new Date(),
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      streak: 0,
      rationale: tmpl.rationale || '',
    });

    if (tmpl.goalType === 'quest') { questsCreated++; console.log(`  ✅ Quest: "${tmpl.name}"`); }
    else if (tmpl.goalType === 'recommended') { recommendedCreated++; console.log(`  ✅ Recommended: "${tmpl.name}"`); }
    else { companyCreated++; console.log(`  ✅ Company Prep: "${tmpl.name}"`); }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Quests created:      ${questsCreated}`);
  console.log(`  Recommended created: ${recommendedCreated}`);
  console.log(`  Company prep created: ${companyCreated}`);

  await mongoose.disconnect();
  console.log('✅ Done!');
}

seed().catch((e) => { console.error(e); process.exit(1); });
