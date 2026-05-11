/**
 * Seed a past contest with submissions so we can test AI report generation.
 * Run: npx tsx src/seed/testContest.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Contest } from '../models/Contest.js';
import { UserContest } from '../models/UserContest.js';
import { User } from '../models/User.js';

async function seed() {
  await connectDB();

  // Find the test user
  const user = await User.findOne({ username: 'sai_test' });
  if (!user) { console.error('❌ User sai_test not found'); process.exit(1); }

  // Create a past Codeforces contest (ended 2 days ago)
  const now = new Date();
  const startTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const endTime = new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000); // 2.5 days ago

  const contest = await Contest.findOneAndUpdate(
    { platform: 'codeforces', externalId: 'test-round-999' },
    {
      $set: {
        platform: 'codeforces',
        externalId: 'test-round-999',
        name: 'Codeforces Round #999 (Div. 2)',
        url: 'https://codeforces.com/contest/999',
        startTime,
        endTime,
        durationMinutes: 120,
        type: 'div2',
        problems: [
          {
            index: 'A',
            title: 'Watermelon',
            difficulty: '800',
            tags: ['math', 'brute-force'],
            url: 'https://codeforces.com/contest/999/problem/A',
          },
          {
            index: 'B',
            title: 'Binary String Sort',
            difficulty: '1200',
            tags: ['greedy', 'strings'],
            url: 'https://codeforces.com/contest/999/problem/B',
          },
          {
            index: 'C',
            title: 'Array Transformation',
            difficulty: '1500',
            tags: ['sorting', 'greedy', 'two-pointers'],
            url: 'https://codeforces.com/contest/999/problem/C',
          },
          {
            index: 'D',
            title: 'Tree Queries',
            difficulty: '1900',
            tags: ['trees', 'dfs', 'binary-lifting'],
            url: 'https://codeforces.com/contest/999/problem/D',
          },
          {
            index: 'E',
            title: 'Graph Coloring',
            difficulty: '2200',
            tags: ['graphs', 'dp', 'bitmask'],
            url: 'https://codeforces.com/contest/999/problem/E',
          },
        ],
      },
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Contest created: ${contest!.name} (${String(contest!._id)})`);

  // Create user registration with submissions
  const reg = await UserContest.findOneAndUpdate(
    { userId: user._id, contestId: contest!._id },
    {
      $set: {
        userId: user._id,
        contestId: contest!._id,
        status: 'ended',
        rank: 3452,
        score: 3,
        penalty: 185,
        submissions: [
          {
            problemIndex: 'A',
            verdict: 'AC',
            timeFromStartSec: 180,
            language: 'python',
            code: `n = int(input())
if n > 2 and n % 2 == 0:
    print("YES")
else:
    print("NO")`,
          },
          {
            problemIndex: 'B',
            verdict: 'WA',
            timeFromStartSec: 900,
            language: 'python',
            code: `s = input()
# Wrong approach: tried to sort directly
result = ''.join(sorted(s))
print(result)`,
          },
          {
            problemIndex: 'B',
            verdict: 'AC',
            timeFromStartSec: 1500,
            language: 'python',
            code: `s = input()
n = len(s)
ones = s.count('1')
zeros = n - ones
# Move all 1s to the right
result = '0' * zeros + '1' * ones
print(result)`,
          },
          {
            problemIndex: 'C',
            verdict: 'TLE',
            timeFromStartSec: 3600,
            language: 'python',
            code: `n = int(input())
arr = list(map(int, input().split()))
# Brute force O(n^2) - too slow
for i in range(n):
    for j in range(i+1, n):
        if arr[i] > arr[j]:
            arr[i], arr[j] = arr[j], arr[i]
print(*arr)`,
          },
          {
            problemIndex: 'C',
            verdict: 'AC',
            timeFromStartSec: 5400,
            language: 'python',
            code: `n = int(input())
arr = list(map(int, input().split()))
arr.sort()
print(*arr)`,
          },
          {
            problemIndex: 'D',
            verdict: 'WA',
            timeFromStartSec: 6000,
            language: 'python',
            code: `# Attempted DFS but wrong logic
import sys
sys.setrecursionlimit(200000)
n, q = map(int, input().split())
# ... incomplete solution`,
          },
        ],
        ratingChange: -15,
      },
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Registration created for user ${user.username}, rank: ${reg!.rank}, score: ${reg!.score}`);
  console.log(`   Contest ID: ${String(contest!._id)}`);
  console.log(`\nNow you can visit: http://localhost:3000/contests/${String(contest!._id)}/report`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
