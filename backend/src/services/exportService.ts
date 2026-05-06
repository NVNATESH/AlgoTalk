import { Types } from 'mongoose';
import { User, publicUser } from '../models/User.js';
import { Submission, submissionToJSON } from '../models/Submission.js';
import { ExtractedSubmission, extractedToJSON } from '../models/ExtractedSubmission.js';
import { Integration, integrationToJSON } from '../models/Integration.js';
import { Goal, goalToJSON } from '../models/Goal.js';
import { LearningContent } from '../models/LearningContent.js';
import { Badge } from '../models/Badge.js';
import { Notification, notificationToJSON } from '../models/Notification.js';
import { Group } from '../models/Group.js';
import { GroupChallenge } from '../models/GroupChallenge.js';
import { Room } from '../models/Room.js';
import { MeetRequest } from '../models/MeetRequest.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { MentorConversation } from '../models/MentorConversation.js';
import { ApiError } from '../utils/ApiError.js';

export async function buildAccountExport(userId: string) {
  const userObjId = new Types.ObjectId(userId);

  const user = await User.findById(userObjId).lean();
  if (!user) throw ApiError.notFound('User not found');

  const [
    submissions,
    extractedSubmissions,
    integrations,
    goals,
    learningContents,
    badges,
    notifications,
    groups,
    challengeResponses,
    rooms,
    meets,
    interviews,
    mentorConvos,
  ] = await Promise.all([
    Submission.find({ userId: userObjId }).sort({ createdAt: 1 }).lean(),
    ExtractedSubmission.find({ userId: userObjId }).sort({ submittedAt: 1 }).lean(),
    Integration.find({ userId: userObjId }).lean(),
    Goal.find({ userId: userObjId }).sort({ createdAt: 1 }).lean(),
    LearningContent.find({ userId: userObjId }).sort({ createdAt: 1 }).lean(),
    Badge.find({ userId: userObjId }).sort({ earnedAt: 1 }).lean(),
    Notification.find({ userId: userObjId }).sort({ createdAt: -1 }).limit(500).lean(),
    Group.find({ 'members.userId': userObjId })
      .select('name description privacy inviteCode admin createdAt')
      .lean(),
    GroupChallenge.find({ 'responses.userId': userObjId })
      .select('groupId title type points createdAt expiresAt resolvedAt responses')
      .lean(),
    Room.find({
      $or: [{ asker: userObjId }, { writers: userObjId }, { readOnly: userObjId }],
    })
      .select('name description language inviteCode asker createdAt expiresAt')
      .lean(),
    MeetRequest.find({
      $or: [{ requesterId: userObjId }, { partnerId: userObjId }],
    })
      .select('groupId challengeId status preferredTime message roomId createdAt')
      .lean(),
    InterviewSession.find({ userId: userObjId })
      .select('topic difficulty role problem evaluation status createdAt')
      .lean(),
    MentorConversation.find({ userId: userObjId })
      .select('title messages createdAt updatedAt')
      .limit(50)
      .lean(),
  ]);

  // Project per-user slice of each challenge's responses (drop other users' responses)
  const challengesProjected = challengeResponses.map((c: any) => {
    const ourResponse = (c.responses ?? []).find(
      (r: any) => String(r.userId) === userId
    );
    return {
      challengeId: String(c._id),
      groupId: String(c.groupId),
      title: c.title,
      type: c.type,
      points: c.points,
      createdAt: c.createdAt,
      expiresAt: c.expiresAt,
      resolvedAt: c.resolvedAt,
      yourResponse: ourResponse
        ? {
            isCorrect: ourResponse.isCorrect ?? null,
            pointsAwarded: ourResponse.pointsAwarded ?? 0,
            selectedOption: ourResponse.selectedOption ?? null,
            verifiedAt: ourResponse.verifiedAt ?? null,
            answeredAt: ourResponse.answeredAt ?? null,
          }
        : null,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    user: {
      ...publicUser(user),
      bio: user.bio ?? '',
      location: user.location ?? '',
      education: user.education ?? '',
      socialLinks: user.socialLinks ?? { github: '', linkedin: '', twitter: '' },
      skills: user.skills ?? [],
      followersCount: user.followers?.length ?? 0,
      followingCount: user.following?.length ?? 0,
      lastLoginAt: user.lastLoginAt ?? null,
    },
    submissions: submissions.map(submissionToJSON),
    extractedSubmissions: extractedSubmissions.map(extractedToJSON),
    integrations: integrations.map(integrationToJSON),
    goals: goals.map(goalToJSON),
    learningContent: learningContents.map((lc: any) => ({
      id: String(lc._id),
      moduleId: String(lc.moduleId),
      bestPercentage: lc.bestPercentage ?? 0,
      attempts: lc.attempts ?? 0,
      lastAttemptAt: lc.lastAttemptAt ?? null,
      createdAt: lc.createdAt,
    })),
    badges: badges.map((b: any) => ({
      key: b.key,
      earnedAt: b.earnedAt,
    })),
    notifications: notifications.map(notificationToJSON),
    groups: groups.map((g: any) => ({
      id: String(g._id),
      name: g.name,
      description: g.description,
      privacy: g.privacy,
      role: String(g.admin) === userId ? 'admin' : 'member',
      createdAt: g.createdAt,
    })),
    challengeResponses: challengesProjected,
    rooms: rooms.map((r: any) => ({
      id: String(r._id),
      name: r.name,
      description: r.description,
      language: r.language,
      role: String(r.asker) === userId ? 'asker' : 'participant',
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    })),
    meets: meets.map((m: any) => ({
      id: String(m._id),
      groupId: String(m.groupId),
      challengeId: m.challengeId ? String(m.challengeId) : null,
      role: String(m.requesterId) === userId ? 'requester' : 'partner',
      status: m.status,
      preferredTime: m.preferredTime ?? null,
      message: m.message ?? '',
      roomId: m.roomId ? String(m.roomId) : null,
      createdAt: m.createdAt,
    })),
    interviews: interviews.map((s: any) => ({
      id: String(s._id),
      topic: s.topic,
      difficulty: s.difficulty,
      role: s.role,
      problemTitle: s.problem?.title ?? '(untitled)',
      verdict: s.evaluation?.verdict ?? null,
      complexity: s.evaluation?.complexity ?? null,
      status: s.status,
      createdAt: s.createdAt,
    })),
    mentorConversations: mentorConvos.map((c: any) => ({
      id: String(c._id),
      title: c.title,
      messageCount: (c.messages ?? []).length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    counts: {
      submissions: submissions.length,
      extractedSubmissions: extractedSubmissions.length,
      integrations: integrations.length,
      goals: goals.length,
      learningContent: learningContents.length,
      badges: badges.length,
      notifications: notifications.length,
      groups: groups.length,
      challengeResponses: challengesProjected.length,
      rooms: rooms.length,
      meets: meets.length,
      interviews: interviews.length,
      mentorConversations: mentorConvos.length,
    },
  };
}
