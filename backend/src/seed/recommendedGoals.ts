/**
 * recommendedGoals.ts — seed script for curated recommended goal templates.
 *
 * Run with: npx tsx src/seed/recommendedGoals.ts
 *
 * Creates public template goals that users can "enroll" in (clone into their own).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { connectDB } from '../config/db.js';
import { Goal } from '../models/Goal.js';

const ADMIN_USER_ID = '000000000000000000000000'; // placeholder; templates use isPublic

interface Template {
  name: string;
  icon: string;
  description: string;
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  goalType: string;
  category: string;
  companyTarget?: string;
  estimatedHours: number;
  xpReward: number;
  resources: Array<{ title: string; url: string; type: string }>;
  modules: Array<{
    title: string;
    description: string;
    topics: string[];
    estimatedHours: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }>;
}

const TEMPLATES: Template[] = [
  {
    name: 'Striver DSA Sheet',
    icon: '📊',
    description: 'Master 180+ curated DSA problems — the most popular interview prep sheet.',
    topic: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    goalType: 'recommended',
    category: 'dsa',
    estimatedHours: 120,
    xpReward: 500,
    resources: [
      { title: 'Striver SDE Sheet', url: 'https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/', type: 'docs' },
      { title: 'NeetCode 150', url: 'https://neetcode.io/practice', type: 'practice' },
      { title: 'DSA Visualizer', url: 'https://visualgo.net/', type: 'docs' },
    ],
    modules: [
      { title: 'Arrays & Hashing', description: 'Master array manipulation and hash-based techniques', topics: ['Arrays', 'Hash Maps', 'Two Pointers', 'Prefix Sum'], estimatedHours: 12, difficulty: 'Easy' },
      { title: 'Strings', description: 'String manipulation, pattern matching, and parsing', topics: ['Strings', 'Sliding Window', 'KMP', 'Rabin-Karp'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Linked Lists', description: 'Singly, doubly linked lists and advanced techniques', topics: ['Linked Lists', 'Fast-Slow Pointers', 'Reversal'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Stacks & Queues', description: 'Stack/queue implementations and monotonic patterns', topics: ['Stacks', 'Queues', 'Monotonic Stack', 'Next Greater Element'], estimatedHours: 8, difficulty: 'Medium' },
      { title: 'Binary Trees', description: 'Tree traversals, construction, and path problems', topics: ['Binary Trees', 'DFS', 'BFS', 'Tree Construction'], estimatedHours: 14, difficulty: 'Medium' },
      { title: 'Binary Search Trees', description: 'BST properties, validation, and operations', topics: ['BST', 'Inorder', 'LCA', 'Iterator'], estimatedHours: 8, difficulty: 'Medium' },
      { title: 'Graphs', description: 'Graph traversal, shortest paths, and topological sort', topics: ['Graphs', 'BFS', 'DFS', 'Dijkstra', 'Topological Sort'], estimatedHours: 18, difficulty: 'Hard' },
      { title: 'Dynamic Programming', description: 'Classic DP patterns from 1D to 2D to optimization', topics: ['DP', 'Memoization', 'Tabulation', 'Knapsack', 'LIS'], estimatedHours: 22, difficulty: 'Hard' },
      { title: 'Greedy & Backtracking', description: 'Greedy algorithms and backtracking solutions', topics: ['Greedy', 'Backtracking', 'N-Queens', 'Subset Sum'], estimatedHours: 12, difficulty: 'Hard' },
      { title: 'Advanced Topics', description: 'Tries, segment trees, and bit manipulation', topics: ['Tries', 'Segment Trees', 'Bit Manipulation', 'Math'], estimatedHours: 6, difficulty: 'Hard' },
    ],
  },
  {
    name: 'Google Interview Preparation',
    icon: '🔍',
    description: 'Comprehensive preparation for Google SDE interviews — DSA, system design, and behavioral.',
    topic: 'Google Interview',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Google',
    estimatedHours: 100,
    xpReward: 600,
    resources: [
      { title: 'Google Interview Tips', url: 'https://www.google.com/about/careers/how-we-hire/', type: 'docs' },
      { title: 'LeetCode Google Tag', url: 'https://leetcode.com/company/google/', type: 'practice' },
      { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'github' },
    ],
    modules: [
      { title: 'Google DSA Patterns', description: 'Most frequently asked DSA patterns at Google', topics: ['Arrays', 'Graphs', 'DP', 'Binary Search', 'Trees'], estimatedHours: 25, difficulty: 'Hard' },
      { title: 'System Design for Google', description: 'Design YouTube, Google Maps, Gmail-scale systems', topics: ['System Design', 'Distributed Systems', 'Load Balancing', 'Caching'], estimatedHours: 20, difficulty: 'Hard' },
      { title: 'SQL & Data Problems', description: 'SQL queries and data manipulation questions', topics: ['SQL', 'Window Functions', 'Aggregation', 'Joins'], estimatedHours: 12, difficulty: 'Medium' },
      { title: 'Behavioral & Leadership', description: 'STAR method, googleyness, leadership principles', topics: ['Behavioral', 'STAR', 'Leadership', 'Googleyness'], estimatedHours: 8, difficulty: 'Easy' },
      { title: 'Mock Interview Practice', description: 'End-to-end mock interview simulations', topics: ['Mock Interview', 'Communication', 'Problem Solving'], estimatedHours: 10, difficulty: 'Hard' },
    ],
  },
  {
    name: 'Amazon SDE Roadmap',
    icon: '📦',
    description: 'Target Amazon SDE interviews with LP-focused preparation and system design.',
    topic: 'Amazon Interview',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Amazon',
    estimatedHours: 90,
    xpReward: 550,
    resources: [
      { title: 'Amazon Leadership Principles', url: 'https://www.amazon.jobs/en/principles', type: 'docs' },
      { title: 'LeetCode Amazon Tag', url: 'https://leetcode.com/company/amazon/', type: 'practice' },
    ],
    modules: [
      { title: 'Amazon DSA Favorites', description: 'Top problems asked at Amazon', topics: ['Arrays', 'Trees', 'Graphs', 'BFS/DFS', 'DP'], estimatedHours: 20, difficulty: 'Hard' },
      { title: 'Leadership Principles Deep Dive', description: 'Master all 16 Amazon LPs with STAR stories', topics: ['Leadership Principles', 'Behavioral', 'STAR Method'], estimatedHours: 15, difficulty: 'Medium' },
      { title: 'System Design for Amazon', description: 'Design e-commerce, delivery, recommendation systems', topics: ['System Design', 'Microservices', 'DynamoDB'], estimatedHours: 18, difficulty: 'Hard' },
      { title: 'Object-Oriented Design', description: 'LLD problems: parking lot, elevator, etc.', topics: ['OOD', 'Design Patterns', 'SOLID'], estimatedHours: 12, difficulty: 'Medium' },
    ],
  },
  {
    name: 'SQL Mastery Path',
    icon: '🗄️',
    description: 'From SELECT * to window functions — master SQL for interviews and production.',
    topic: 'SQL',
    difficulty: 'Beginner',
    goalType: 'quest',
    category: 'sql',
    estimatedHours: 40,
    xpReward: 250,
    resources: [
      { title: 'SQLZoo', url: 'https://sqlzoo.net/', type: 'practice' },
      { title: 'Mode SQL Tutorial', url: 'https://mode.com/sql-tutorial/', type: 'docs' },
      { title: 'LeetCode SQL 50', url: 'https://leetcode.com/studyplan/top-sql-50/', type: 'practice' },
    ],
    modules: [
      { title: 'SQL Fundamentals', description: 'SELECT, WHERE, ORDER BY, LIMIT basics', topics: ['SELECT', 'WHERE', 'ORDER BY', 'LIMIT'], estimatedHours: 5, difficulty: 'Easy' },
      { title: 'Joins & Relationships', description: 'INNER, LEFT, RIGHT, FULL joins and subqueries', topics: ['JOINs', 'Subqueries', 'Foreign Keys'], estimatedHours: 8, difficulty: 'Medium' },
      { title: 'Aggregation & Grouping', description: 'GROUP BY, HAVING, aggregate functions', topics: ['GROUP BY', 'HAVING', 'COUNT', 'SUM', 'AVG'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Window Functions', description: 'ROW_NUMBER, RANK, LAG, LEAD and partitioning', topics: ['Window Functions', 'PARTITION BY', 'RANK', 'LAG'], estimatedHours: 8, difficulty: 'Hard' },
      { title: 'Advanced SQL', description: 'CTEs, recursive queries, pivoting, optimization', topics: ['CTE', 'Recursive', 'Indexing', 'Performance'], estimatedHours: 8, difficulty: 'Hard' },
      { title: 'Interview SQL Problems', description: '50 most-asked SQL interview questions', topics: ['Interview', 'Edge Cases', 'Complex Queries'], estimatedHours: 5, difficulty: 'Hard' },
    ],
  },
  {
    name: 'Full Stack Developer Path',
    icon: '🌐',
    description: 'Become a full stack developer — HTML/CSS, JS, React, Node.js, databases, and deployment.',
    topic: 'Full Stack Development',
    difficulty: 'Beginner',
    goalType: 'recommended',
    category: 'fullstack',
    estimatedHours: 200,
    xpReward: 800,
    resources: [
      { title: 'The Odin Project', url: 'https://www.theodinproject.com/', type: 'docs' },
      { title: 'freeCodeCamp', url: 'https://www.freecodecamp.org/', type: 'practice' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/', type: 'docs' },
    ],
    modules: [
      { title: 'HTML & CSS Foundations', description: 'Semantic HTML, CSS layouts, responsive design', topics: ['HTML', 'CSS', 'Flexbox', 'Grid', 'Responsive'], estimatedHours: 20, difficulty: 'Easy' },
      { title: 'JavaScript Essentials', description: 'ES6+, async/await, DOM manipulation', topics: ['JavaScript', 'ES6', 'Async', 'DOM', 'Events'], estimatedHours: 25, difficulty: 'Medium' },
      { title: 'React & Frontend Frameworks', description: 'Components, hooks, state management, routing', topics: ['React', 'Hooks', 'State', 'Router', 'Next.js'], estimatedHours: 30, difficulty: 'Medium' },
      { title: 'Node.js & Express', description: 'REST APIs, middleware, authentication', topics: ['Node.js', 'Express', 'REST', 'JWT', 'Middleware'], estimatedHours: 25, difficulty: 'Medium' },
      { title: 'Databases', description: 'SQL and NoSQL — PostgreSQL, MongoDB, ORMs', topics: ['PostgreSQL', 'MongoDB', 'Mongoose', 'Prisma'], estimatedHours: 20, difficulty: 'Medium' },
      { title: 'DevOps & Deployment', description: 'Docker, CI/CD, cloud deployment', topics: ['Docker', 'CI/CD', 'AWS', 'Vercel', 'Nginx'], estimatedHours: 15, difficulty: 'Hard' },
    ],
  },
  {
    name: 'System Design Preparation',
    icon: '🏗️',
    description: 'Learn to design scalable systems — from basics to FAANG-level interviews.',
    topic: 'System Design',
    difficulty: 'Advanced',
    goalType: 'recommended',
    category: 'system_design',
    estimatedHours: 80,
    xpReward: 450,
    resources: [
      { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'github' },
      { title: 'Designing Data-Intensive Applications', url: 'https://dataintensive.net/', type: 'docs' },
      { title: 'ByteByteGo', url: 'https://bytebytego.com/', type: 'youtube' },
    ],
    modules: [
      { title: 'Fundamentals', description: 'Scalability, latency, throughput, CAP theorem', topics: ['Scalability', 'CAP', 'Latency', 'Throughput'], estimatedHours: 10, difficulty: 'Easy' },
      { title: 'Building Blocks', description: 'Load balancers, caches, CDNs, message queues', topics: ['Load Balancer', 'Cache', 'CDN', 'Message Queue'], estimatedHours: 12, difficulty: 'Medium' },
      { title: 'Database Design', description: 'SQL vs NoSQL, sharding, replication, indexing', topics: ['SQL', 'NoSQL', 'Sharding', 'Replication'], estimatedHours: 14, difficulty: 'Medium' },
      { title: 'Classic Designs', description: 'URL shortener, Twitter, Netflix, chat system', topics: ['URL Shortener', 'Social Feed', 'Video Streaming', 'Chat'], estimatedHours: 22, difficulty: 'Hard' },
      { title: 'Advanced Patterns', description: 'Event sourcing, CQRS, distributed consensus', topics: ['Event Sourcing', 'CQRS', 'Raft', 'Distributed'], estimatedHours: 12, difficulty: 'Hard' },
    ],
  },
  {
    name: 'AI/ML Learning Plan',
    icon: '🤖',
    description: 'From linear regression to deep learning — a structured AI/ML journey.',
    topic: 'Artificial Intelligence & Machine Learning',
    difficulty: 'Intermediate',
    goalType: 'recommended',
    category: 'ai_ml',
    estimatedHours: 150,
    xpReward: 600,
    resources: [
      { title: 'Andrew Ng ML Course', url: 'https://www.coursera.org/learn/machine-learning', type: 'youtube' },
      { title: 'Fast.ai', url: 'https://www.fast.ai/', type: 'docs' },
      { title: 'Kaggle', url: 'https://www.kaggle.com/', type: 'practice' },
    ],
    modules: [
      { title: 'Math Foundations', description: 'Linear algebra, calculus, probability, statistics', topics: ['Linear Algebra', 'Calculus', 'Probability', 'Statistics'], estimatedHours: 20, difficulty: 'Medium' },
      { title: 'Classical ML', description: 'Regression, classification, clustering, ensemble methods', topics: ['Regression', 'SVM', 'Decision Trees', 'KNN', 'K-Means'], estimatedHours: 25, difficulty: 'Medium' },
      { title: 'Deep Learning', description: 'Neural networks, CNNs, RNNs, transformers', topics: ['Neural Networks', 'CNN', 'RNN', 'Transformers'], estimatedHours: 30, difficulty: 'Hard' },
      { title: 'NLP', description: 'Text processing, embeddings, LLMs', topics: ['NLP', 'Word2Vec', 'BERT', 'GPT', 'LLM'], estimatedHours: 20, difficulty: 'Hard' },
      { title: 'MLOps & Deployment', description: 'Model serving, monitoring, CI/CD for ML', topics: ['MLOps', 'Docker', 'Model Serving', 'Monitoring'], estimatedHours: 15, difficulty: 'Hard' },
    ],
  },
  {
    name: 'DBMS Interview Crash Course',
    icon: '💾',
    description: 'Essential DBMS concepts for technical interviews — normalization to transactions.',
    topic: 'Database Management Systems',
    difficulty: 'Intermediate',
    goalType: 'recommended',
    category: 'dbms',
    estimatedHours: 30,
    xpReward: 200,
    resources: [
      { title: 'GeeksForGeeks DBMS', url: 'https://www.geeksforgeeks.org/dbms/', type: 'docs' },
      { title: 'Database Systems Concepts', url: 'https://www.db-book.com/', type: 'docs' },
    ],
    modules: [
      { title: 'ER Models & Relational Design', description: 'Entity-relationship diagrams and relational algebra', topics: ['ER Diagram', 'Relational Model', 'Keys'], estimatedHours: 5, difficulty: 'Easy' },
      { title: 'Normalization', description: '1NF through BCNF and denormalization trade-offs', topics: ['1NF', '2NF', '3NF', 'BCNF', 'Denormalization'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Transactions & Concurrency', description: 'ACID, isolation levels, deadlock handling', topics: ['ACID', 'Isolation', 'Deadlock', 'Serializability'], estimatedHours: 8, difficulty: 'Hard' },
      { title: 'Indexing & Storage', description: 'B+ trees, hashing, storage engines', topics: ['B+ Tree', 'Hashing', 'Indexing', 'Storage'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Interview Questions', description: '30 most-asked DBMS interview questions', topics: ['Interview', 'Scenarios', 'Comparison'], estimatedHours: 5, difficulty: 'Medium' },
    ],
  },
  {
    name: 'Aptitude Placement Prep',
    icon: '🧮',
    description: 'Quantitative aptitude, logical reasoning, and verbal ability for placement exams.',
    topic: 'Aptitude',
    difficulty: 'Beginner',
    goalType: 'recommended',
    category: 'aptitude',
    estimatedHours: 40,
    xpReward: 200,
    resources: [
      { title: 'IndiaBix', url: 'https://www.indiabix.com/', type: 'practice' },
      { title: 'PrepInsta', url: 'https://prepinsta.com/', type: 'practice' },
    ],
    modules: [
      { title: 'Number Systems & Arithmetic', description: 'HCF, LCM, percentages, ratios', topics: ['Numbers', 'Percentages', 'Ratios', 'HCF/LCM'], estimatedHours: 8, difficulty: 'Easy' },
      { title: 'Algebra & Equations', description: 'Linear equations, quadratic, progressions', topics: ['Algebra', 'Equations', 'AP', 'GP'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Logical Reasoning', description: 'Puzzles, seating, blood relations, coding-decoding', topics: ['Puzzles', 'Seating', 'Blood Relations', 'Coding'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Data Interpretation', description: 'Tables, charts, graphs analysis', topics: ['Tables', 'Pie Charts', 'Bar Graphs', 'Line Charts'], estimatedHours: 8, difficulty: 'Medium' },
      { title: 'Verbal Ability', description: 'Reading comprehension, grammar, vocabulary', topics: ['Reading', 'Grammar', 'Vocabulary', 'Synonyms'], estimatedHours: 8, difficulty: 'Easy' },
    ],
  },
  // Additional Quest-type goals
  {
    name: 'DSA Quest: Arrays to Graphs',
    icon: '⚔️',
    description: 'Sequential quest — master each DSA topic before unlocking the next. From arrays to advanced graphs.',
    topic: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    goalType: 'quest',
    category: 'dsa',
    estimatedHours: 80,
    xpReward: 400,
    resources: [
      { title: 'NeetCode Roadmap', url: 'https://neetcode.io/roadmap', type: 'practice' },
      { title: 'Visualgo', url: 'https://visualgo.net/', type: 'docs' },
      { title: 'CP Handbook', url: 'https://cses.fi/book/book.pdf', type: 'pdf' },
    ],
    modules: [
      { title: 'Quest 1: Arrays', description: 'Master array techniques: two pointers, prefix sum, kadane\'s', topics: ['Arrays', 'Two Pointers', 'Prefix Sum', 'Kadane'], estimatedHours: 8, difficulty: 'Easy' },
      { title: 'Quest 2: Strings', description: 'String manipulation, sliding window, pattern matching', topics: ['Strings', 'Sliding Window', 'Anagrams', 'Palindromes'], estimatedHours: 8, difficulty: 'Easy' },
      { title: 'Quest 3: Linked Lists', description: 'Singly/doubly linked lists, cycle detection, reversal', topics: ['Linked Lists', 'Fast-Slow', 'Reversal', 'Merge'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Quest 4: Stacks & Queues', description: 'Monotonic stack, next greater element, queue-based BFS', topics: ['Stacks', 'Queues', 'Monotonic Stack', 'Deque'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Quest 5: Trees', description: 'Binary trees, BST, traversals, path problems', topics: ['Binary Trees', 'BST', 'DFS', 'BFS', 'LCA'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Quest 6: Heaps & Priority Queues', description: 'Min/max heap, top-K problems, median finding', topics: ['Heaps', 'Priority Queue', 'Top-K', 'Median'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Quest 7: Graphs', description: 'BFS, DFS, shortest paths, connected components', topics: ['Graphs', 'BFS', 'DFS', 'Dijkstra', 'Union-Find'], estimatedHours: 12, difficulty: 'Hard' },
      { title: 'Quest 8: Dynamic Programming', description: '1D/2D DP, knapsack, LCS, LIS, state machine', topics: ['DP', 'Knapsack', 'LCS', 'LIS', 'Memoization'], estimatedHours: 14, difficulty: 'Hard' },
      { title: 'Quest 9: Backtracking', description: 'Permutations, combinations, N-Queens, Sudoku', topics: ['Backtracking', 'Permutations', 'N-Queens', 'Sudoku'], estimatedHours: 6, difficulty: 'Hard' },
      { title: 'Quest 10: Advanced', description: 'Tries, segment trees, bit manipulation, math tricks', topics: ['Tries', 'Segment Trees', 'Bit Manipulation', 'Number Theory'], estimatedHours: 4, difficulty: 'Hard' },
    ],
  },
  {
    name: 'DBMS Quest: Foundations to Transactions',
    icon: '🗃️',
    description: 'Sequential quest through DBMS — ER diagrams, normalization, SQL, indexing, and transactions.',
    topic: 'Database Management Systems',
    difficulty: 'Intermediate',
    goalType: 'quest',
    category: 'dbms',
    estimatedHours: 35,
    xpReward: 250,
    resources: [
      { title: 'GeeksForGeeks DBMS', url: 'https://www.geeksforgeeks.org/dbms/', type: 'docs' },
      { title: 'JavaTPoint DBMS', url: 'https://www.javatpoint.com/dbms-tutorial', type: 'docs' },
    ],
    modules: [
      { title: 'Quest 1: ER Diagrams', description: 'Entities, relationships, cardinality, participation', topics: ['ER Diagram', 'Entities', 'Relationships', 'Cardinality'], estimatedHours: 5, difficulty: 'Easy' },
      { title: 'Quest 2: Relational Model', description: 'Relational algebra, keys, constraints', topics: ['Relational Model', 'Keys', 'Relational Algebra', 'Constraints'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Quest 3: Normalization', description: '1NF, 2NF, 3NF, BCNF, functional dependencies', topics: ['1NF', '2NF', '3NF', 'BCNF', 'Functional Dependencies'], estimatedHours: 7, difficulty: 'Medium' },
      { title: 'Quest 4: SQL Deep Dive', description: 'DDL, DML, joins, subqueries, views', topics: ['DDL', 'DML', 'JOINs', 'Subqueries', 'Views'], estimatedHours: 7, difficulty: 'Medium' },
      { title: 'Quest 5: Indexing & Storage', description: 'B+ trees, hashing, file organization', topics: ['B+ Tree', 'Hashing', 'File Organization', 'Clustering'], estimatedHours: 5, difficulty: 'Hard' },
      { title: 'Quest 6: Transactions & Concurrency', description: 'ACID, serializability, deadlock, recovery', topics: ['ACID', 'Serializability', 'Deadlock', 'Recovery', 'Isolation Levels'], estimatedHours: 5, difficulty: 'Hard' },
    ],
  },
  {
    name: 'System Design Quest',
    icon: '🏰',
    description: 'Progressive system design quest — from fundamentals to designing complex distributed systems.',
    topic: 'System Design',
    difficulty: 'Advanced',
    goalType: 'quest',
    category: 'system_design',
    estimatedHours: 60,
    xpReward: 350,
    resources: [
      { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'github' },
      { title: 'ByteByteGo YouTube', url: 'https://www.youtube.com/@ByteByteGo', type: 'youtube' },
      { title: 'High Scalability Blog', url: 'http://highscalability.com/', type: 'blog' },
    ],
    modules: [
      { title: 'Quest 1: Networking Basics', description: 'HTTP, DNS, TCP/IP, load balancing fundamentals', topics: ['HTTP', 'DNS', 'TCP/IP', 'Load Balancer'], estimatedHours: 6, difficulty: 'Easy' },
      { title: 'Quest 2: Databases', description: 'SQL vs NoSQL, sharding, replication, partitioning', topics: ['SQL', 'NoSQL', 'Sharding', 'Replication', 'Partitioning'], estimatedHours: 8, difficulty: 'Medium' },
      { title: 'Quest 3: Caching & CDN', description: 'Cache strategies, Redis, CDN, invalidation patterns', topics: ['Redis', 'CDN', 'Cache Aside', 'Write Through', 'Invalidation'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Quest 4: Message Queues', description: 'Kafka, RabbitMQ, event-driven architecture', topics: ['Kafka', 'RabbitMQ', 'Event Driven', 'Pub/Sub'], estimatedHours: 6, difficulty: 'Medium' },
      { title: 'Quest 5: Design URL Shortener', description: 'Design TinyURL — hashing, base62, analytics', topics: ['URL Shortener', 'Hashing', 'Base62', 'Analytics'], estimatedHours: 4, difficulty: 'Medium' },
      { title: 'Quest 6: Design Twitter/Feed', description: 'News feed, fan-out, real-time updates', topics: ['Social Feed', 'Fan-out', 'Timeline', 'Push vs Pull'], estimatedHours: 6, difficulty: 'Hard' },
      { title: 'Quest 7: Design Chat System', description: 'WhatsApp/Slack-like messaging, WebSocket, presence', topics: ['Chat System', 'WebSocket', 'Presence', 'Delivery Guarantees'], estimatedHours: 6, difficulty: 'Hard' },
      { title: 'Quest 8: Design YouTube/Netflix', description: 'Video streaming, transcoding, recommendation engine', topics: ['Video Streaming', 'Transcoding', 'CDN', 'Recommendation'], estimatedHours: 6, difficulty: 'Hard' },
      { title: 'Quest 9: Design Uber/Ride Sharing', description: 'Location tracking, matching, surge pricing', topics: ['Location', 'Matching', 'Geospatial', 'Surge Pricing'], estimatedHours: 6, difficulty: 'Hard' },
      { title: 'Quest 10: Design Google Docs', description: 'Real-time collaboration, CRDT, conflict resolution', topics: ['CRDT', 'OT', 'Real-time Collaboration', 'Conflict Resolution'], estimatedHours: 6, difficulty: 'Hard' },
    ],
  },
];

// Company prep templates for remaining companies — each with REAL detailed modules & resources
const COMPANY_TEMPLATES: Template[] = [
  {
    name: 'Microsoft Interview Preparation',
    icon: '🪟',
    description: 'Prepare for Microsoft SDE interviews — coding rounds, system design, and behavioral with emphasis on problem solving.',
    topic: 'Microsoft Interview',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Microsoft',
    estimatedHours: 90,
    xpReward: 500,
    resources: [
      { title: 'LeetCode Microsoft Tag', url: 'https://leetcode.com/company/microsoft/', type: 'practice' },
      { title: 'Microsoft Careers', url: 'https://careers.microsoft.com/', type: 'docs' },
      { title: 'Grokking the System Design', url: 'https://github.com/donnemartin/system-design-primer', type: 'github' },
    ],
    modules: [
      { title: 'Microsoft DSA Patterns', description: 'Arrays, Strings, Trees, Graphs — top asked patterns at Microsoft', topics: ['Arrays', 'Strings', 'Binary Trees', 'Graphs', 'DP', 'Sliding Window'], estimatedHours: 25, difficulty: 'Hard' },
      { title: 'System Design at Scale', description: 'Design OneDrive, Teams, Azure-scale distributed systems', topics: ['System Design', 'Cloud Architecture', 'Azure', 'Distributed Systems'], estimatedHours: 20, difficulty: 'Hard' },
      { title: 'Object-Oriented Design', description: 'LLD problems: design patterns, SOLID, parking lot, elevator', topics: ['OOD', 'Design Patterns', 'SOLID Principles', 'UML'], estimatedHours: 15, difficulty: 'Medium' },
      { title: 'SQL & Data', description: 'Complex SQL queries asked in Microsoft interviews', topics: ['SQL', 'Window Functions', 'CTEs', 'Optimization'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Behavioral & Culture', description: 'Growth mindset, collaboration stories, STAR format', topics: ['Behavioral', 'Growth Mindset', 'STAR Method', 'Teamwork'], estimatedHours: 8, difficulty: 'Easy' },
      { title: 'Mock Interviews', description: 'End-to-end Microsoft-style mock rounds', topics: ['Mock Interview', 'Whiteboard Coding', 'Communication'], estimatedHours: 12, difficulty: 'Hard' },
    ],
  },
  {
    name: 'Atlassian Interview Preparation',
    icon: '🔷',
    description: 'Ace Atlassian interviews — values-based assessment, coding, and system design for Jira/Confluence-scale products.',
    topic: 'Atlassian Interview',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Atlassian',
    estimatedHours: 75,
    xpReward: 450,
    resources: [
      { title: 'Atlassian Values', url: 'https://www.atlassian.com/company/values', type: 'docs' },
      { title: 'LeetCode Atlassian Tag', url: 'https://leetcode.com/company/atlassian/', type: 'practice' },
    ],
    modules: [
      { title: 'Atlassian Values Deep Dive', description: 'Open company, no BS; Build with heart and balance; Don\'t #@!% the customer; Play as a team; Be the change you seek', topics: ['Company Values', 'Behavioral', 'Culture Fit'], estimatedHours: 8, difficulty: 'Easy' },
      { title: 'DSA Problems', description: 'Graph traversals, hash maps, string manipulation — Atlassian favorites', topics: ['Graphs', 'Hash Maps', 'Strings', 'BFS/DFS', 'Priority Queue'], estimatedHours: 20, difficulty: 'Hard' },
      { title: 'System Design', description: 'Design Jira, Confluence, Bitbucket-like systems', topics: ['System Design', 'Task Management', 'Real-time Collaboration', 'Webhooks'], estimatedHours: 18, difficulty: 'Hard' },
      { title: 'Karat Coding Screen', description: 'Prepare for the Karat initial coding screen', topics: ['Karat', 'Live Coding', 'Problem Solving', 'Edge Cases'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Manager/Team Round', description: 'Leadership stories, conflict resolution, team dynamics', topics: ['Leadership', 'Conflict Resolution', 'Team Dynamics'], estimatedHours: 6, difficulty: 'Easy' },
    ],
  },
  {
    name: 'Adobe Interview Preparation',
    icon: '🎨',
    description: 'Comprehensive Adobe SDE prep — DSA, system design, and portfolio-driven discussions.',
    topic: 'Adobe Interview',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Adobe',
    estimatedHours: 80,
    xpReward: 450,
    resources: [
      { title: 'LeetCode Adobe Tag', url: 'https://leetcode.com/company/adobe/', type: 'practice' },
      { title: 'Adobe Careers', url: 'https://www.adobe.com/careers.html', type: 'docs' },
      { title: 'GeeksForGeeks Adobe', url: 'https://www.geeksforgeeks.org/adobe-interview-preparation/', type: 'docs' },
    ],
    modules: [
      { title: 'Adobe DSA Patterns', description: 'DP, Trees, Graphs, Strings — most asked at Adobe', topics: ['DP', 'Binary Trees', 'Graphs', 'Strings', 'Backtracking', 'Matrix'], estimatedHours: 22, difficulty: 'Hard' },
      { title: 'System Design', description: 'Design Photoshop collaboration, Adobe Creative Cloud, PDF renderer', topics: ['System Design', 'File Processing', 'CDN', 'Collaboration'], estimatedHours: 18, difficulty: 'Hard' },
      { title: 'OOP & Design Patterns', description: 'Factory, Observer, Strategy patterns — Adobe loves OOP', topics: ['OOP', 'Design Patterns', 'SOLID', 'Clean Code'], estimatedHours: 12, difficulty: 'Medium' },
      { title: 'SQL & Databases', description: 'Complex queries, normalization, indexing', topics: ['SQL', 'Normalization', 'Indexing', 'Query Optimization'], estimatedHours: 8, difficulty: 'Medium' },
      { title: 'Behavioral & HR', description: 'Adobe culture, creativity questions, situational responses', topics: ['Behavioral', 'Creativity', 'STAR Method'], estimatedHours: 6, difficulty: 'Easy' },
    ],
  },
  {
    name: 'Flipkart Interview Preparation',
    icon: '🛒',
    description: 'Prepare for Flipkart SDE interviews — machine coding, DSA, and e-commerce system design.',
    topic: 'Flipkart Interview',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Flipkart',
    estimatedHours: 85,
    xpReward: 500,
    resources: [
      { title: 'LeetCode Flipkart Tag', url: 'https://leetcode.com/company/flipkart/', type: 'practice' },
      { title: 'GeeksForGeeks Flipkart', url: 'https://www.geeksforgeeks.org/flipkart-interview-preparation/', type: 'docs' },
    ],
    modules: [
      { title: 'Flipkart DSA Favorites', description: 'Arrays, DP, Graphs, Trees — Flipkart\'s most asked', topics: ['Arrays', 'DP', 'Graphs', 'Trees', 'Greedy', 'Binary Search'], estimatedHours: 22, difficulty: 'Hard' },
      { title: 'Machine Coding Round', description: 'Build a working system in 90 minutes — snakes & ladders, parking lot, splitwise', topics: ['Machine Coding', 'OOD', 'Clean Architecture', 'Time Management'], estimatedHours: 15, difficulty: 'Hard' },
      { title: 'System Design for E-commerce', description: 'Design Flipkart search, cart, payments, delivery tracking', topics: ['System Design', 'E-commerce', 'Search', 'Payment Gateway', 'Microservices'], estimatedHours: 20, difficulty: 'Hard' },
      { title: 'SQL & Problem Solving', description: 'Complex SQL queries and analytical problems', topics: ['SQL', 'Analytics', 'Window Functions'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'HR & Behavioral', description: 'Flipkart values, situational questions, team fit', topics: ['Behavioral', 'Company Values', 'Situational'], estimatedHours: 6, difficulty: 'Easy' },
    ],
  },
  {
    name: 'PayPal Interview Preparation',
    icon: '💳',
    description: 'Prepare for PayPal SDE interviews — fintech system design, security-focused DSA, and behavioral.',
    topic: 'PayPal Interview',
    difficulty: 'Advanced',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'PayPal',
    estimatedHours: 75,
    xpReward: 400,
    resources: [
      { title: 'LeetCode PayPal Tag', url: 'https://leetcode.com/company/paypal/', type: 'practice' },
      { title: 'PayPal Engineering Blog', url: 'https://medium.com/paypal-tech', type: 'blog' },
    ],
    modules: [
      { title: 'PayPal DSA Patterns', description: 'String manipulation, graphs, DP — PayPal interview favorites', topics: ['Strings', 'Graphs', 'DP', 'Hash Maps', 'Trees'], estimatedHours: 20, difficulty: 'Hard' },
      { title: 'System Design for Fintech', description: 'Design payment processing, fraud detection, wallet systems', topics: ['System Design', 'Payment Processing', 'Fraud Detection', 'Idempotency'], estimatedHours: 18, difficulty: 'Hard' },
      { title: 'Security & Compliance', description: 'OWASP, encryption, PCI-DSS awareness for fintech', topics: ['Security', 'Encryption', 'OWASP', 'PCI-DSS'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Java/Spring Fundamentals', description: 'PayPal uses Java/Spring heavily — key concepts', topics: ['Java', 'Spring Boot', 'REST APIs', 'Microservices'], estimatedHours: 12, difficulty: 'Medium' },
      { title: 'Behavioral Round', description: 'PayPal values, inclusion, innovation stories', topics: ['Behavioral', 'Innovation', 'Inclusion', 'STAR'], estimatedHours: 6, difficulty: 'Easy' },
    ],
  },
  {
    name: 'TCS Interview Preparation',
    icon: '🏢',
    description: 'Complete TCS NQT and interview preparation — aptitude, coding, and technical rounds.',
    topic: 'TCS Interview',
    difficulty: 'Intermediate',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'TCS',
    estimatedHours: 60,
    xpReward: 300,
    resources: [
      { title: 'TCS NQT Preparation', url: 'https://www.geeksforgeeks.org/tcs-nqt/', type: 'docs' },
      { title: 'PrepInsta TCS', url: 'https://prepinsta.com/tcs/', type: 'practice' },
    ],
    modules: [
      { title: 'TCS NQT Aptitude', description: 'Quantitative aptitude, logical reasoning, verbal ability', topics: ['Quantitative', 'Logical Reasoning', 'Verbal', 'Percentages', 'Time & Work'], estimatedHours: 15, difficulty: 'Easy' },
      { title: 'TCS NQT Coding', description: 'Basic coding problems in C/Java/Python', topics: ['Basic Coding', 'Patterns', 'String Manipulation', 'Arrays'], estimatedHours: 12, difficulty: 'Easy' },
      { title: 'TCS Technical Round', description: 'OOP, DBMS, OS, CN — key theory questions', topics: ['OOP', 'DBMS', 'Operating Systems', 'Networking'], estimatedHours: 15, difficulty: 'Medium' },
      { title: 'TCS Managerial Round', description: 'Situational questions, project discussions, communication', topics: ['Managerial', 'Communication', 'Project Discussion'], estimatedHours: 8, difficulty: 'Easy' },
      { title: 'TCS HR Round', description: 'Company knowledge, relocation, salary expectations', topics: ['HR', 'Company Research', 'Salary Negotiation'], estimatedHours: 5, difficulty: 'Easy' },
    ],
  },
  {
    name: 'Infosys Interview Preparation',
    icon: '🏛️',
    description: 'Complete Infosys InfyTQ, HackWithInfy, and interview preparation guide.',
    topic: 'Infosys Interview',
    difficulty: 'Intermediate',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Infosys',
    estimatedHours: 55,
    xpReward: 300,
    resources: [
      { title: 'InfyTQ Platform', url: 'https://infytq.infosys.com/', type: 'practice' },
      { title: 'GeeksForGeeks Infosys', url: 'https://www.geeksforgeeks.org/infosys-interview-preparation/', type: 'docs' },
    ],
    modules: [
      { title: 'InfyTQ Certification', description: 'Python, DBMS, DSA modules on InfyTQ platform', topics: ['Python', 'DBMS', 'DSA Basics', 'InfyTQ'], estimatedHours: 12, difficulty: 'Easy' },
      { title: 'HackWithInfy Prep', description: 'Competitive coding for HackWithInfy — DP, Graphs, Greedy', topics: ['DP', 'Graphs', 'Greedy', 'Competitive Programming'], estimatedHours: 15, difficulty: 'Hard' },
      { title: 'Technical Interview', description: 'DBMS, OOP, OS, CN — commonly asked theory', topics: ['DBMS', 'OOP', 'OS', 'Computer Networks'], estimatedHours: 12, difficulty: 'Medium' },
      { title: 'Coding Round', description: 'Medium-level DSA: arrays, strings, sorting, searching', topics: ['Arrays', 'Strings', 'Sorting', 'Searching'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'HR & Behavioral', description: 'Infosys values, willingness to relocate, long-term goals', topics: ['HR', 'Values', 'Career Goals'], estimatedHours: 6, difficulty: 'Easy' },
    ],
  },
  {
    name: 'Zoho Interview Preparation',
    icon: '📧',
    description: 'Prepare for Zoho\'s unique multi-round interview — programming, advanced coding, and system design.',
    topic: 'Zoho Interview',
    difficulty: 'Intermediate',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Zoho',
    estimatedHours: 70,
    xpReward: 350,
    resources: [
      { title: 'GeeksForGeeks Zoho', url: 'https://www.geeksforgeeks.org/zoho-interview-preparation/', type: 'docs' },
      { title: 'Zoho Careers', url: 'https://www.zoho.com/careers.html', type: 'docs' },
    ],
    modules: [
      { title: 'Zoho Round 1: C Programming', description: 'Output prediction, pointer arithmetic, C fundamentals', topics: ['C Programming', 'Pointers', 'Memory', 'Output Prediction'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Zoho Round 2: Basic Programs', description: 'Pattern printing, matrix operations, string manipulation', topics: ['Patterns', 'Matrix', 'String Manipulation', 'Number Theory'], estimatedHours: 12, difficulty: 'Medium' },
      { title: 'Zoho Round 3: Advanced Coding', description: 'Complex problems — chess board, calendar, game logic', topics: ['Advanced Coding', 'Game Logic', 'Simulation', 'Data Structures'], estimatedHours: 18, difficulty: 'Hard' },
      { title: 'Zoho System Design', description: 'Design CRM, email client, project management tool', topics: ['System Design', 'CRM', 'SaaS Architecture'], estimatedHours: 15, difficulty: 'Hard' },
      { title: 'Zoho HR Round', description: 'Company knowledge, puzzle solving, general aptitude', topics: ['HR', 'Puzzles', 'Aptitude'], estimatedHours: 5, difficulty: 'Easy' },
    ],
  },
  {
    name: 'Wipro Interview Preparation',
    icon: '🌿',
    description: 'Complete Wipro NLTH, Elite, and interview preparation — aptitude, coding, and technical.',
    topic: 'Wipro Interview',
    difficulty: 'Beginner',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Wipro',
    estimatedHours: 45,
    xpReward: 250,
    resources: [
      { title: 'PrepInsta Wipro', url: 'https://prepinsta.com/wipro/', type: 'practice' },
      { title: 'GeeksForGeeks Wipro', url: 'https://www.geeksforgeeks.org/wipro-interview-preparation/', type: 'docs' },
    ],
    modules: [
      { title: 'Wipro Online Assessment', description: 'Aptitude, verbal, logical reasoning for Wipro test', topics: ['Aptitude', 'Verbal', 'Logical Reasoning', 'Reading Comprehension'], estimatedHours: 10, difficulty: 'Easy' },
      { title: 'Wipro Coding Test', description: 'Basic to intermediate coding in C/Java/Python', topics: ['Basic Coding', 'Arrays', 'Strings', 'Conditionals'], estimatedHours: 10, difficulty: 'Easy' },
      { title: 'Technical Interview', description: 'OOP, DBMS, basic DSA concepts', topics: ['OOP', 'DBMS', 'DSA Basics', 'SQL'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'HR Interview', description: 'Wipro values, team spirit, professional goals', topics: ['HR', 'Values', 'Goals', 'Communication'], estimatedHours: 5, difficulty: 'Easy' },
    ],
  },
  {
    name: 'Accenture Interview Preparation',
    icon: '⚡',
    description: 'Prepare for Accenture\'s assessment and interview rounds — cognitive, technical, and coding.',
    topic: 'Accenture Interview',
    difficulty: 'Beginner',
    goalType: 'company_prep',
    category: 'company',
    companyTarget: 'Accenture',
    estimatedHours: 45,
    xpReward: 250,
    resources: [
      { title: 'PrepInsta Accenture', url: 'https://prepinsta.com/accenture/', type: 'practice' },
      { title: 'Accenture Careers', url: 'https://www.accenture.com/us-en/careers', type: 'docs' },
    ],
    modules: [
      { title: 'Cognitive Assessment', description: 'Quantitative aptitude, logical reasoning, verbal ability, abstract reasoning', topics: ['Aptitude', 'Logical Reasoning', 'Verbal', 'Abstract Reasoning'], estimatedHours: 10, difficulty: 'Easy' },
      { title: 'Technical Assessment', description: 'DBMS, networking, OOP, cloud basics', topics: ['DBMS', 'Networking', 'OOP', 'Cloud Computing'], estimatedHours: 10, difficulty: 'Medium' },
      { title: 'Coding Assessment', description: 'DSA basics, pseudocode, code output prediction', topics: ['Pseudocode', 'Arrays', 'Loops', 'Functions'], estimatedHours: 10, difficulty: 'Easy' },
      { title: 'Communication Assessment', description: 'Email writing, sentence correction, vocabulary', topics: ['Email Writing', 'Grammar', 'Vocabulary'], estimatedHours: 5, difficulty: 'Easy' },
      { title: 'Interview Rounds', description: 'Technical discussion, HR, project presentation', topics: ['Technical Discussion', 'HR', 'Project Presentation'], estimatedHours: 8, difficulty: 'Easy' },
    ],
  },
];

async function seed() {
  await connectDB();

  // Remove old templates
  await Goal.deleteMany({ isPublic: true, userId: ADMIN_USER_ID });

  const deadline = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  for (const t of TEMPLATES) {
    await Goal.create({
      userId: ADMIN_USER_ID,
      name: t.name,
      icon: t.icon,
      description: t.description,
      topic: t.topic,
      difficulty: t.difficulty,
      goalType: t.goalType,
      category: t.category,
      companyTarget: t.companyTarget ?? null,
      estimatedHours: t.estimatedHours,
      xpReward: t.xpReward,
      resources: t.resources,
      isPublic: true,
      deadline,
      modules: t.modules.map((m, i) => ({
        moduleId: crypto.randomUUID(),
        title: m.title,
        description: m.description,
        topics: m.topics,
        estimatedHours: m.estimatedHours,
        difficulty: m.difficulty,
        status: 'not_started',
        actualMinutes: 0,
        quizScore: null,
        problemsSolved: 0,
        completedAt: null,
        dueDate: null,
      })),
    });
    console.log(`✅ Created template: ${t.name}`);
  }

  // Seed detailed company prep templates
  for (const t of COMPANY_TEMPLATES) {
    await Goal.create({
      userId: ADMIN_USER_ID,
      name: t.name,
      icon: t.icon,
      description: t.description,
      topic: t.topic,
      difficulty: t.difficulty,
      goalType: t.goalType,
      category: t.category,
      companyTarget: t.companyTarget ?? null,
      estimatedHours: t.estimatedHours,
      xpReward: t.xpReward,
      resources: t.resources,
      isPublic: true,
      deadline,
      modules: t.modules.map((m) => ({
        moduleId: crypto.randomUUID(),
        title: m.title,
        description: m.description,
        topics: m.topics,
        estimatedHours: m.estimatedHours,
        difficulty: m.difficulty,
        status: 'not_started',
        actualMinutes: 0,
        quizScore: null,
        problemsSolved: 0,
        completedAt: null,
        dueDate: null,
      })),
    });
    console.log(`✅ Created company template: ${t.name}`);
  }

  console.log(`\n🎉 All ${TEMPLATES.length + COMPANY_TEMPLATES.length} templates seeded (${TEMPLATES.length} core + ${COMPANY_TEMPLATES.length} company)!`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
