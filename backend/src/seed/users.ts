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
    name: 'Goal Admin',
    username: 'goal_admin',
    email: 'goal_admin@learnhub.local',
    password: 'goaladminhunter2',
    role: 'admin',
    bio: 'Admin account for managing recommended goal templates, modules, and topics.',
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
    const email = u.email.toLowerCase();
    const username = u.username.toLowerCase();
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const conflict = await User.findOne({
        _id: { $ne: existing._id },
        $or: [{ email }, { username }],
      }).lean();
      if (conflict) {
        throw new Error(`cannot reset ${username}: desired username/email belongs to another user`);
      }

      // Reset password + verify status so the user is always usable after seed.
      existing.name = u.name;
      existing.username = username;
      existing.email = email;
      existing.passwordHash = await hashPassword(u.password);
      existing.isVerified = true;
      existing.verificationToken = undefined;
      existing.verificationExpires = undefined;
      if (u.role) existing.role = u.role;
      if (u.bio !== undefined) existing.bio = u.bio;
      await existing.save();
      logger.info(`reset existing user: ${username}`);
      continue;
    }
    await User.create({
      name: u.name,
      username,
      email,
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
