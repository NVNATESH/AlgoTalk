// Smoke test: insert a synthetic user with rows across every cascading
// collection, run the cascade, then verify zero rows remain pointing at that
// userId. We talk to Mongo directly (the backend doesn't have to be running).
import mongoose from 'mongoose';

const URI = 'mongodb://localhost:27017/learnhub';
await mongoose.connect(URI);
const db = mongoose.connection.db;

const userId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const stamp = Date.now();

console.log('seeding user', String(userId));

// Minimal valid User row (passwordHash is required).
await db.collection('users').insertMany([
  {
    _id: userId,
    name: 'Smoke User',
    username: `smoke_${stamp}`,
    email: `smoke_${stamp}@example.com`,
    passwordHash: 'x',
    isVerified: true,
    role: 'user',
    profilePic: '',
    bio: '',
    socialLinks: {},
    skills: [],
    followers: [otherId],
    following: [otherId],
    xp: 0,
    level: 'Beginner',
    preferences: {},
    refreshTokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: otherId,
    name: 'Friend',
    username: `friend_${stamp}`,
    email: `friend_${stamp}@example.com`,
    passwordHash: 'x',
    isVerified: true,
    role: 'user',
    profilePic: '',
    bio: '',
    socialLinks: {},
    skills: [],
    followers: [userId],
    following: [userId],
    xp: 0,
    level: 'Beginner',
    preferences: {},
    refreshTokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

const probId = new mongoose.Types.ObjectId();
const subId = new mongoose.Types.ObjectId();
const grpId = new mongoose.Types.ObjectId();
const challengeId = new mongoose.Types.ObjectId();
const roomId = new mongoose.Types.ObjectId();

await Promise.all([
  db.collection('submissions').insertOne({
    _id: subId, userId, problemId: probId, code: 'x', language: 'python', status: 'accepted',
    passedCount: 1, totalCount: 1, runtimeMs: 5, memoryKb: 0, createdAt: new Date(), updatedAt: new Date(),
  }),
  db.collection('extractedsubmissions').insertOne({
    userId, integrationId: new mongoose.Types.ObjectId(), platform: 'codeforces',
    externalId: `ext_${stamp}`, problemId: '1A', problemTitle: 'X', topics: [], difficulty: 'unknown',
    status: 'accepted', language: 'C++', submittedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  }),
  db.collection('integrations').insertOne({
    userId, platform: 'leetcode', handle: 'smoker', extra: {}, isActive: true,
    syncCount: 0, submissionCount: 0, createdAt: new Date(), updatedAt: new Date(),
  }),
  db.collection('goals').insertOne({
    userId, title: 'g', topic: 't', durationDays: 7, status: 'active',
    modules: [], createdAt: new Date(), updatedAt: new Date(),
  }),
  db.collection('learningcontents').insertOne({
    userId, goalId: new mongoose.Types.ObjectId(), moduleId: 'm1', concepts: [], examples: [],
    quiz: [], bestPercentage: 0, attempts: 0, createdAt: new Date(), updatedAt: new Date(),
  }),
  db.collection('badges').insertOne({ userId, key: 'first_step', earnedAt: new Date() }),
  db.collection('notifications').insertMany([
    { userId, type: 'badge_earned', title: 'X', message: '', icon: '🏆', read: false, createdAt: new Date() },
    { userId, type: 'goal_completed', title: 'Y', message: '', icon: '🎯', read: false, createdAt: new Date() },
  ]),
  db.collection('interviewsessions').insertOne({
    userId, topic: 'arrays', difficulty: 'easy', role: 'Generic',
    problem: { title: 'X', description: 'd', input_format: '', output_format: '', constraints: '', examples: [] },
    code: '', language: 'python', approachFeedbacks: [], followUps: [], status: 'in_progress',
    startedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  }),
  db.collection('mentorconversations').insertOne({
    userId, goalId: new mongoose.Types.ObjectId(), moduleId: '', messages: [],
    createdAt: new Date(), updatedAt: new Date(),
  }),
  db.collection('codereviews').insertOne({
    userId, submissionId: subId, problemId: probId, overall: 'ok', score: 70,
    strengths: [], weaknesses: [], lineComments: [], language: 'python',
    model: 'gemini-2.5-flash', createdAt: new Date(), updatedAt: new Date(),
  }),
  // Group where user is admin AND has a co-member → should TRANSFER
  db.collection('groups').insertOne({
    _id: grpId, name: 'My Group', description: '', icon: '👥', privacy: 'public',
    inviteCode: `INV${stamp}`, admin: userId,
    members: [
      { userId, role: 'admin', joinedAt: new Date(stamp - 1000) },
      { userId: otherId, role: 'member', joinedAt: new Date(stamp) },
    ],
    createdAt: new Date(), updatedAt: new Date(),
  }),
  // GroupChallenge with our user's response — only the response should be pulled
  db.collection('groupchallenges').insertOne({
    _id: challengeId, groupId: grpId, type: 'aptitude', title: 'Q', description: '', points: 10,
    postedBy: otherId, expiresAt: new Date(Date.now() + 86400000),
    options: { A: '1', B: '2', C: '3', D: '4' }, correctAnswer: 'A',
    responses: [
      { userId, selectedOption: 'A', isCorrect: true, pointsAwarded: 10, answeredAt: new Date() },
      { userId: otherId, selectedOption: 'B', isCorrect: false, pointsAwarded: 0, answeredAt: new Date() },
    ],
    createdAt: new Date(), updatedAt: new Date(),
  }),
  // Room where user is the asker → should be DELETED
  db.collection('rooms').insertOne({
    _id: roomId, name: 'My Room', description: '', icon: '🤝', asker: userId,
    writers: [userId], readOnly: [otherId], inviteCode: `RM${stamp}`,
    initialContent: '', language: 'js', expiresAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  }),
  // MeetRequest where user is requester → should be DELETED
  db.collection('meetrequests').insertOne({
    groupId: grpId, challengeId, requesterId: userId,
    preferredTime: null, message: '', status: 'pending', acceptedBy: null, roomId: null,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(), updatedAt: new Date(),
  }),
]);

// Show seeded counts
const before = {
  user: await db.collection('users').countDocuments({ _id: userId }),
  submissions: await db.collection('submissions').countDocuments({ userId }),
  extracted: await db.collection('extractedsubmissions').countDocuments({ userId }),
  integrations: await db.collection('integrations').countDocuments({ userId }),
  goals: await db.collection('goals').countDocuments({ userId }),
  learning: await db.collection('learningcontents').countDocuments({ userId }),
  badges: await db.collection('badges').countDocuments({ userId }),
  notifications: await db.collection('notifications').countDocuments({ userId }),
  interviews: await db.collection('interviewsessions').countDocuments({ userId }),
  mentor: await db.collection('mentorconversations').countDocuments({ userId }),
  codeReviews: await db.collection('codereviews').countDocuments({ userId }),
  groupMember: await db.collection('groups').countDocuments({ 'members.userId': userId }),
  challengeResp: await db.collection('groupchallenges').countDocuments({ 'responses.userId': userId }),
  roomAsker: await db.collection('rooms').countDocuments({ asker: userId }),
  meetRequester: await db.collection('meetrequests').countDocuments({ requesterId: userId }),
  followerEdge: await db.collection('users').countDocuments({ followers: userId }),
};
console.log('before:', before);

// Run cascade
const { cascadeDeleteUser } = await import('../dist/services/accountCascade.js');
const summary = await cascadeDeleteUser(String(userId));
console.log('summary:', summary);

// Verify zero orphans
const after = {
  user: await db.collection('users').countDocuments({ _id: userId }),
  submissions: await db.collection('submissions').countDocuments({ userId }),
  extracted: await db.collection('extractedsubmissions').countDocuments({ userId }),
  integrations: await db.collection('integrations').countDocuments({ userId }),
  goals: await db.collection('goals').countDocuments({ userId }),
  learning: await db.collection('learningcontents').countDocuments({ userId }),
  badges: await db.collection('badges').countDocuments({ userId }),
  notifications: await db.collection('notifications').countDocuments({ userId }),
  interviews: await db.collection('interviewsessions').countDocuments({ userId }),
  mentor: await db.collection('mentorconversations').countDocuments({ userId }),
  codeReviews: await db.collection('codereviews').countDocuments({ userId }),
  groupMember: await db.collection('groups').countDocuments({ 'members.userId': userId }),
  challengeResp: await db.collection('groupchallenges').countDocuments({ 'responses.userId': userId }),
  roomAsker: await db.collection('rooms').countDocuments({ asker: userId }),
  meetRequester: await db.collection('meetrequests').countDocuments({ requesterId: userId }),
  followerEdge: await db.collection('users').countDocuments({ followers: userId }),
};
console.log('after:', after);

// Verify other user's group survived as ADMIN, room is gone, challenge is intact w/o our response
const grp = await db.collection('groups').findOne({ _id: grpId });
const ch = await db.collection('groupchallenges').findOne({ _id: challengeId });
const rm = await db.collection('rooms').findOne({ _id: roomId });
console.log('group still exists:', !!grp, 'admin transferred:', String(grp?.admin) === String(otherId));
console.log('challenge still exists:', !!ch, 'responses count:', ch?.responses?.length, '(should be 1, the other user\'s)');
console.log('room deleted:', !rm);

// Cleanup the friend user
await db.collection('users').deleteOne({ _id: otherId });
await db.collection('groups').deleteOne({ _id: grpId });
await db.collection('groupchallenges').deleteOne({ _id: challengeId });

const allZero = Object.values(after).every((v) => v === 0);
const groupOk = !!grp && String(grp.admin) === String(otherId);
const chOk = !!ch && ch.responses.length === 1;
const roomOk = !rm;

console.log('result:', allZero && groupOk && chOk && roomOk ? 'PASS' : 'FAIL');
await mongoose.disconnect();
process.exit(allZero && groupOk && chOk && roomOk ? 0 : 1);
