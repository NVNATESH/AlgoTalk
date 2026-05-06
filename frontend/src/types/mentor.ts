export interface MentorMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

export interface MentorConversation {
  id: string;
  goalId: string;
  moduleId: string;
  messages: MentorMessage[];
  lastMessageAt: string;
}

export type StreamEvent =
  | { type: 'start'; userMessageId: string; assistantMessageId: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
