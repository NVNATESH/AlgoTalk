export type RoomRole = 'asker' | 'writer' | 'readonly' | null;

export interface Room {
  id: string;
  name: string;
  description: string;
  icon: string;
  asker: string;
  writers: string[];
  readOnly: string[];
  participantCount: number;
  writerCount: number;
  readOnlyCount: number;
  maxWriters: number;
  maxReadOnly: number;
  initialContent: string;
  language: string;
  inviteCode?: string;
  myRole: RoomRole;
  isAsker: boolean;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface RoomParticipant {
  userId: string;
  role: 'asker' | 'writer' | 'readonly';
  username: string;
  name: string;
  profilePic: string;
  level: string;
}
