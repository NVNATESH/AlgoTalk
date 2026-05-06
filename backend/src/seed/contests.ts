/**
 * One-shot contest sync. Pulls upcoming contests from kontests.net + every
 * direct platform fetcher (CF, AtCoder, LeetCode, CodeChef) and upserts them
 * into the `contests` collection. Useful when you've just rebooted, the
 * scheduler hasn't ticked yet, and you want the contests page populated.
 *
 *   npm run seed:contests
 */

import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Contest } from '../models/Contest.js';
import { syncUpcomingContests } from '../services/contestAggregator.js';

async function main() {
  await connectDB();
  console.log('Pulling upcoming contests from every available source…\n');
  const result = await syncUpcomingContests();
  console.log('Sync result:', result);

  // Show a per-platform breakdown of what's now in the DB.
  const counts = await Contest.aggregate([
    { $match: { startTime: { $gte: new Date() } } },
    { $group: { _id: '$platform', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log('\n┌──────────────────────────────────────────┐');
  console.log('│  Upcoming contests now in DB by platform │');
  console.log('├──────────────────────────────────────────┤');
  if (counts.length === 0) {
    console.log('│  (none — all sources may be down)        │');
  } else {
    for (const r of counts as Array<{ _id: string; count: number }>) {
      console.log(`│  ${r._id.padEnd(14)} ${String(r.count).padStart(4)} contests`.padEnd(43) + '│');
    }
  }
  console.log('└──────────────────────────────────────────┘\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('contest sync failed:', err);
  process.exit(1);
});
