/**
 * One-shot test-user seeder. Idempotent — safe to re-run.
 *
 * Each row is created with `isVerified: true` so you can skip the email
 * verification step (the dev mailer prints to the console, not your inbox).
 *
 * Run from the backend root:   npm run seed:users
 */

import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { logger } from '../config/logger.js';

interface SeedUser {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
  bio?: string;
}

const TEST_USERS: SeedUser[] = [
  {
    name: 'Sai Test',
    username: 'sai_test',
    email: 'sai_test@learnhub.local',
    password: 'newhunter2hunter',
    role: 'admin',
    bio: 'Primary test account — admin role.',
  },
  {
    name: 'Partner',
    username: 'partner',
    email: 'partner@learnhub.local',
    password: 'hunter2hunter',
    role: 'user',
    bio: 'Secondary test account for collab/group flows.',
  },
  {
    name: 'Reader',
    username: 'reader',
    email: 'reader@learnhub.local',
    password: 'hunter2hunter',
    role: 'user',
    bio: 'Third test account for 60-user RBAC testing (read-only role).',
  },
];

async function main() {
  await connectDB();

  for (const u of TEST_USERS) {
    const existing = await User.findOne({
      $or: [{ email: u.email.toLowerCase() }, { username: u.username.toLowerCase() }],
    });
    if (existing) {
      // Reset password + verify status so the user is always usable after seed.
      existing.passwordHash = await hashPassword(u.password);
      existing.isVerified = true;
      existing.verificationToken = undefined;
      existing.verificationExpires = undefined;
      if (u.role) existing.role = u.role;
      await existing.save();
      logger.info(`reset existing user: ${u.username}`);
      continue;
    }
    await User.create({
      name: u.name,
      username: u.username.toLowerCase(),
      email: u.email.toLowerCase(),
      passwordHash: await hashPassword(u.password),
      isVerified: true,
      role: u.role ?? 'user',
      bio: u.bio ?? '',
    });
    logger.info(`created: ${u.username}`);
  }

  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│  Test accounts ready (all verified — log in immediately)     │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  for (const u of TEST_USERS) {
    console.log(`│  ${u.username.padEnd(12)} · ${u.email.padEnd(28)} · ${u.password}`);
  }
  console.log('└──────────────────────────────────────────────────────────────┘\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
