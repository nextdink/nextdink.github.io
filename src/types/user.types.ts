/**
 * Notification preferences for push notifications
 */
export interface NotificationPreferences {
  /** Receive notifications when invited to an event */
  eventInvites: boolean;
  /** Receive notifications when someone claims a slot on your team */
  slotClaimed: boolean;
  /** Receive notifications when promoted from waitlist */
  waitlistPromotion: boolean;
  /** Receive notifications when an event is canceled */
  eventCanceled: boolean;
  /** Receive notifications when event details are updated */
  eventUpdated: boolean;
}

/**
 * Default notification preferences (all enabled)
 */
export const defaultNotificationPreferences: NotificationPreferences = {
  eventInvites: true,
  slotClaimed: true,
  waitlistPromotion: true,
  eventCanceled: true,
  eventUpdated: true,
};

export interface User {
  id: string;
  displayName: string;
  /**
   * Photo URL from OAuth provider (Google, Microsoft).
   * For users without an OAuth photo, a deterministic avatar is generated
   * client-side based on the user ID using the avatarUtils.
   */
  photoUrl: string | null;
  /**
   * Firebase Cloud Messaging tokens for push notifications.
   * A user may have multiple tokens (one per device).
   */
  fcmTokens?: string[];
  /**
   * User's notification preferences.
   * Controls which types of notifications the user receives.
   */
  notificationSettings?: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  displayName: string;
  /**
   * Photo URL from OAuth provider (Google, Microsoft).
   * For users without an OAuth photo, a deterministic avatar is generated
   * client-side based on the user ID using the avatarUtils.
   */
  photoUrl: string | null;
}
