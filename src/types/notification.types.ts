export type NotificationType = 
  | 'invite'
  | 'approved'
  | 'waitlist_promoted'
  | 'waitlist_position_changed'
  | 'event_canceled'
  | 'event_updated';

export interface Notification {
  id: string;
  type: NotificationType;
  relatedEntityId: string; // Usually eventId
  isRead: boolean;
  createdAt: Date;
}