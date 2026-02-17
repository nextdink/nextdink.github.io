import { db } from "@/config/firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import {
  registerForPushNotifications,
  setupForegroundMessageHandler,
} from "@/config/firebase";

/**
 * Notification types that can be triggered
 */
export type NotificationType =
  | "event_invite"
  | "slot_claimed"
  | "waitlist_promotion"
  | "event_canceled"
  | "event_updated";

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  eventInvites: boolean;
  slotClaimed: boolean;
  waitlistPromotion: boolean;
  eventCanceled: boolean;
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

/**
 * Foreground notification payload
 */
export interface ForegroundNotification {
  title: string;
  body: string;
  type?: NotificationType;
  eventId?: string;
  eventCode?: string;
}

/**
 * Register current device for push notifications and save token to user profile
 *
 * @param userId - The Firebase user ID
 * @returns true if registration succeeded, false otherwise
 */
export async function registerDeviceForNotifications(
  userId: string,
): Promise<boolean> {
  try {
    // Get FCM token (this also requests permission if needed)
    const token = await registerForPushNotifications();

    if (!token) {
      console.log("Failed to get FCM token");
      return false;
    }

    // Save token to user document
    await saveUserFCMToken(userId, token);

    console.log("Device registered for notifications");
    return true;
  } catch (error) {
    console.error("Error registering device for notifications:", error);
    return false;
  }
}

/**
 * Save FCM token to user document
 * Uses arrayUnion to avoid duplicates
 *
 * @param userId - The Firebase user ID
 * @param token - The FCM token
 */
export async function saveUserFCMToken(
  userId: string,
  token: string,
): Promise<void> {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    fcmTokens: arrayUnion(token),
  });

  console.log("FCM token saved to user profile");
}

/**
 * Remove FCM token from user document
 * Called when user logs out or disables notifications
 *
 * @param userId - The Firebase user ID
 * @param token - The FCM token to remove
 */
export async function removeUserFCMToken(
  userId: string,
  token: string,
): Promise<void> {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    fcmTokens: arrayRemove(token),
  });

  console.log("FCM token removed from user profile");
}

/**
 * Update user's notification preferences
 *
 * @param userId - The Firebase user ID
 * @param preferences - Partial preferences to update
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<void> {
  const userRef = doc(db, "users", userId);

  // Build update object with nested fields
  const updates: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(preferences)) {
    updates[`notificationSettings.${key}`] = value;
  }

  await updateDoc(userRef, updates);

  console.log("Notification preferences updated");
}

/**
 * Get user's notification preferences
 *
 * @param userId - The Firebase user ID
 * @returns User's notification preferences or defaults
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return defaultNotificationPreferences;
  }

  const data = snapshot.data();
  return {
    ...defaultNotificationPreferences,
    ...data.notificationSettings,
  };
}

/**
 * Check if push notifications are available and enabled
 */
export function getNotificationStatus(): {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
} {
  if (!("Notification" in window)) {
    return { supported: false, permission: "unsupported" };
  }

  return {
    supported: true,
    permission: Notification.permission,
  };
}

/**
 * Request notification permission from the user
 *
 * @returns The permission status after the request
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to foreground notifications
 * Shows a toast/banner when a notification is received while the app is open
 *
 * @param onNotification - Callback when a notification is received
 * @returns Unsubscribe function
 */
export async function subscribeToForegroundNotifications(
  onNotification: (notification: ForegroundNotification) => void,
): Promise<(() => void) | null> {
  return setupForegroundMessageHandler((payload) => {
    const notification: ForegroundNotification = {
      title: payload.notification?.title || "Next Dink",
      body: payload.notification?.body || "You have a new notification",
      type: payload.data?.type as NotificationType | undefined,
      eventId: payload.data?.eventId,
      eventCode: payload.data?.eventCode,
    };

    onNotification(notification);
  });
}

/**
 * Show a local notification (useful for foreground notifications)
 *
 * @param title - Notification title
 * @param options - Notification options
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions & { data?: Record<string, string> },
): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.warn("Cannot show local notification: permission not granted");
    return;
  }

  // Try using service worker for notification (more reliable)
  const registration = await navigator.serviceWorker?.ready;
  if (registration) {
    await registration.showNotification(title, {
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      ...options,
    });
  } else {
    // Fallback to Notification API
    new Notification(title, {
      icon: "/icons/icon-192.png",
      ...options,
    });
  }
}

/**
 * Get the current FCM token (if available)
 * Useful for debugging or displaying to user
 */
export async function getCurrentFCMToken(): Promise<string | null> {
  try {
    return await registerForPushNotifications();
  } catch {
    return null;
  }
}
