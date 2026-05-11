export interface GroupSummary {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  icon: string;
  memberCount: number;
  inviteCode?: string;
  isMember: boolean;
  role: 'admin' | 'member' | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  username: string;
  name: string;
  profilePic: string;
  xp: number;
  level: string;
}

export interface GroupDetail extends GroupSummary {
  membersList: GroupMember[];
}

export type ChallengeType = 'coding' | 'aptitude';

export interface Challenge {
  id: string;
  groupId: string;
  type: ChallengeType;
  createdBy: string;
  createdByUsername: string;
  title: string;
  description: string;
  points: number;
  problemSlug: string | null;
  externalUrl: string | null;
  externalPlatform: string | null;
  externalProblemId: string | null;
  externalVerifiable: boolean;
  difficulty: string | null;
  tags: string[];
  questionImageUrl: string | null;
  options: { A: string; B: string; C: string; D: string } | null;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | null;
  expired: boolean;
  resolved: boolean;
  expiresAt: string;
  createdAt: string;
  responseCount: number;
  myResponse: {
    submittedAt: string;
    selectedOption: 'A' | 'B' | 'C' | 'D' | null;
    solved: boolean;
    pointsAwarded: number;
    isCorrect: boolean;
  } | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  name: string;
  profilePic: string;
  level: string;
  points: number;
  problemsAttempted: number;
  correct: number;
  accuracy: number;
}

export type MeetStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export interface MeetUser {
  userId: string;
  username: string;
  name: string;
  profilePic: string;
}

export interface MeetRequest {
  id: string;
  groupId: string;
  challengeId: string;
  challengeTitle: string | null;
  requesterId: string;
  requester: MeetUser | null;
  preferredTime: string | null;
  message: string;
  status: MeetStatus;
  acceptedBy: string | null;
  acceptor: MeetUser | null;
  scheduledTime: string | null;
  roomId: string | null;
  acceptedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string;
  createdAt: string | null;
}

export interface ActiveMeeting {
  roomId: string;
  name: string;
  icon: string;
  asker: string;
  writers: string[];
  readOnly: string[];
  participantCount: number;
  participants: Array<{ userId: string; username: string; name: string; profilePic: string }>;
  createdAt: string;
}

export interface ActiveMeetingResponse {
  active: ActiveMeeting | null;
  canStart: boolean;
}
