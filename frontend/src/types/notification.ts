export type NotificationType =
  | 'badge_earned'
  | 'goal_completed'
  | 'goal_module_completed'
  | 'quiz_passed'
  | 'challenge_posted'
  | 'challenge_won'
  | 'challenge_resolved'
  | 'sync_complete'
  | 'sync_failed'
  | 'group_joined'
  | 'mentor_replied';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  link: string | null;
  priority: NotificationPriority;
  read: boolean;
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
