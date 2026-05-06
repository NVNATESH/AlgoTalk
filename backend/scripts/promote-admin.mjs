// Promote a user to admin (or back to user) via direct Mongo write.
// Usage: node scripts/promote-admin.mjs <username> [admin|user]
import mongoose from 'mongoose';

const [, , username, role = 'admin'] = process.argv;
if (!username) {
  console.error('usage: node scripts/promote-admin.mjs <username> [admin|user]');
  process.exit(1);
}

const uri = 'mongodb://localhost:27017/learnhub';
await mongoose.connect(uri);
const r = await mongoose.connection.db
  .collection('users')
  .updateOne({ username }, { $set: { role } });
const u = await mongoose.connection.db
  .collection('users')
  .findOne({ username }, { projection: { username: 1, role: 1 } });
console.log('matched:', r.matchedCount, 'modified:', r.modifiedCount);
console.log('user:', u);
await mongoose.disconnect();
