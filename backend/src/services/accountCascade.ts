import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';
import { Integration } from '../models/Integration.js';
import { Goal } from '../models/Goal.js';
import { LearningContent } from '../models/LearningContent.js';
import { Badge } from '../models/Badge.js';
import { Notification } from '../models/Notification.js';
import { Group } from '../models/Group.js';
import { GroupChallenge } from '../models/GroupChallenge.js';
import { Room } from '../models/Room.js';
import { RoomSnapshot } from '../models/RoomSnapshot.js';
import { MeetRequest } from '../models/MeetRequest.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { MentorConversation } from '../models/MentorConversation.js';
import { CodeReview } from '../models/CodeReview.js';
import { logger } from '../config/logger.js';

export interface CascadeSummary {
  submissions: number;
  extractedSubmissions: number;
  integrations: number;
  goals: number;
  learningContent: number;
  badges: number;
  notifications: number;
  groupsDeleted: number;
  groupsTransferred: number;
  groupMembershipsRemoved: number;
  challengeResponsesRemoved: number;
  roomsDeleted: number;
  roomMembershipsRemoved: number;
  meetsDeleted: number;
  interviews: number;
  mentorConversations: number;
  codeReviews: number;
  socialEdgesRemoved: number;
}

/**
 * Cascade-delete every record scoped to `userId` across the platform. Returns
 * counts per collection so the caller can surface a summary.
 *
 * Behavior for shared collections:
 *  - Group: solo-admin → group is deleted (including its challenges); admin
 *    with co-members → ownership transfers to the oldest joined member;
 *    plain member → membership removed.
 *  - Room: asker → room is deleted; participant → removed from writers/readOnly.
 *  - GroupChallenge: only the user's own response sub-doc is pulled — the
 *    challenge stays for everyone else.
 *  - MeetRequest: any meet where the user was requester OR acceptor is deleted
 *    (these are bilateral by nature).
 *  - User.followers/following: pull the user from every other user's lists.
 *
 * Does NOT use a transaction — local Mongo isn't a replica set in dev. A
 * partial failure leaves some orphans, which is still strictly better than
 * the previous baseline of "always orphans every collection".
 */
export async function cascadeDeleteUser(userId: string): Promise<CascadeSummary> {
  const oid = new Types.ObjectId(userId);
  const summary: CascadeSummary = {
    submissions: 0,
    extractedSubmissions: 0,
    integrations: 0,
    goals: 0,
    learningContent: 0,
    badges: 0,
    notifications: 0,
    groupsDeleted: 0,
    groupsTransferred: 0,
    groupMembershipsRemoved: 0,
    challengeResponsesRemoved: 0,
    roomsDeleted: 0,
    roomMembershipsRemoved: 0,
    meetsDeleted: 0,
    interviews: 0,
    mentorConversations: 0,
    codeReviews: 0,
    socialEdgesRemoved: 0,
  };

  // 1) Simple per-user collections — delete everything they own.
  const simple = await Promise.all([
    Submission.deleteMany({ userId: oid }),
    ExtractedSubmission.deleteMany({ userId: oid }),
    Integration.deleteMany({ userId: oid }),
    Goal.deleteMany({ userId: oid }),
    LearningContent.deleteMany({ userId: oid }),
    Badge.deleteMany({ userId: oid }),
    Notification.deleteMany({ userId: oid }),
    InterviewSession.deleteMany({ userId: oid }),
    MentorConversation.deleteMany({ userId: oid }),
    CodeReview.deleteMany({ userId: oid }),
  ]);
  summary.submissions = simple[0].deletedCount ?? 0;
  summary.extractedSubmissions = simple[1].deletedCount ?? 0;
  summary.integrations = simple[2].deletedCount ?? 0;
  summary.goals = simple[3].deletedCount ?? 0;
  summary.learningContent = simple[4].deletedCount ?? 0;
  summary.badges = simple[5].deletedCount ?? 0;
  summary.notifications = simple[6].deletedCount ?? 0;
  summary.interviews = simple[7].deletedCount ?? 0;
  summary.mentorConversations = simple[8].deletedCount ?? 0;
  summary.codeReviews = simple[9].deletedCount ?? 0;

  // 2) Groups — for each group the user is a member of, decide based on role.
  const groups = await Group.find({ 'members.userId': oid }).lean();
  for (const g of groups) {
    const members = (g.members ?? []) as Array<{ userId: any; role?: string; joinedAt?: Date }>;
    const isAdmin = String(g.admin) === userId;
    const remaining = members.filter((m: any) => String(m.userId) !== userId);
    if (isAdmin) {
      if (remaining.length === 0) {
        // Solo admin — delete the group + cascade its challenges.
        await Group.deleteOne({ _id: g._id });
        await GroupChallenge.deleteMany({ groupId: g._id });
        summary.groupsDeleted++;
      } else {
        // Transfer admin to the oldest remaining member (by joinedAt asc).
        const oldest = remaining
          .slice()
          .sort(
            (a: any, b: any) =>
              new Date(a.joinedAt ?? 0).getTime() - new Date(b.joinedAt ?? 0).getTime()
          )[0];
        const newAdminId = oldest.userId;
        await Group.updateOne(
          { _id: g._id },
          {
            $set: {
              admin: newAdminId,
              members: remaining.map((m: any) =>
                String(m.userId) === String(newAdminId) ? { ...m, role: 'admin' } : m
              ),
            },
          }
        );
        summary.groupsTransferred++;
      }
    } else {
      await Group.updateOne({ _id: g._id }, { $pull: { members: { userId: oid } } });
      summary.groupMembershipsRemoved++;
    }
  }

  // 3) GroupChallenge — pull the user's own response sub-doc from any
  // challenge they participated in (challenge itself stays).
  const challengeRes = await GroupChallenge.updateMany(
    { 'responses.userId': oid },
    { $pull: { responses: { userId: oid } } }
  );
  summary.challengeResponsesRemoved = challengeRes.modifiedCount ?? 0;

  // 4) Rooms — askers' rooms get deleted; participant memberships are pulled.
  const askedRooms = await Room.find({ asker: oid }).select('_id').lean();
  if (askedRooms.length > 0) {
    const askedIds = askedRooms.map((r: any) => r._id);
    const r = await Room.deleteMany({ _id: { $in: askedIds } });
    summary.roomsDeleted = r.deletedCount ?? 0;
    // Drop the recorded session tape with the room.
    await RoomSnapshot.deleteMany({ roomId: { $in: askedIds } });
  }
  const participantRes = await Room.updateMany(
    {
      $or: [{ writers: oid }, { readOnly: oid }],
    },
    { $pull: { writers: oid, readOnly: oid } }
  );
  summary.roomMembershipsRemoved = participantRes.modifiedCount ?? 0;

  // 5) MeetRequest — bilateral; delete any record involving the user.
  const meetRes = await MeetRequest.deleteMany({
    $or: [{ requesterId: oid }, { acceptedBy: oid }],
  });
  summary.meetsDeleted = meetRes.deletedCount ?? 0;

  // 6) Pull this user from everyone else's followers/following arrays.
  const socialRes = await User.updateMany(
    { $or: [{ followers: oid }, { following: oid }] },
    { $pull: { followers: oid, following: oid } }
  );
  summary.socialEdgesRemoved = socialRes.modifiedCount ?? 0;

  // 7) Finally, remove the User row itself. (Caller asserted password earlier.)
  await User.deleteOne({ _id: oid });

  logger.info({ userId, summary }, 'cascade delete complete');
  return summary;
}
