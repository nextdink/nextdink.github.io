import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { NotificationPreferences, UserDoc, EventDoc } from "./types";

// Initialize before any admin services are used
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Send FCM notification to a user.
 * Handles token cleanup for invalid tokens.
 */
export async function sendNotificationToUser(
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  },
  preferenceKey?: keyof NotificationPreferences,
): Promise<void> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return;
    }

    const userData = userDoc.data() as UserDoc;
    const tokens = [...new Set(userData.fcmTokens || [])];

    if (tokens.length === 0) {
      console.log(`User ${userId} has no FCM tokens`);
      return;
    }

    console.log(`User ${userId} has ${tokens.length} unique token(s)`);

    if (preferenceKey && userData.notificationSettings) {
      const prefs = userData.notificationSettings;
      if (!prefs[preferenceKey]) {
        console.log(
          `User ${userId} has disabled ${preferenceKey} notifications`,
        );
        return;
      }
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      webpush: {
        notification: {
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
        },
        fcmOptions: {
          link: notification.data?.eventCode
            ? `/#/events/${notification.data.eventCode}`
            : "/",
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    console.log(
      `Sent ${response.successCount} notifications to user ${userId}`,
    );

    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (
            error?.code === "messaging/invalid-registration-token" ||
            error?.code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await db
          .collection("users")
          .doc(userId)
          .update({
            fcmTokens: FieldValue.arrayRemove(...invalidTokens),
          });
        console.log(
          `Removed ${invalidTokens.length} invalid tokens for user ${userId}`,
        );
      }
    }
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
  }
}

/**
 * Get all participant user IDs from an event.
 */
export function getEventParticipantIds(event: EventDoc): string[] {
  const participantIds = new Set<string>();

  for (const registration of event.registrations) {
    for (const member of registration.members) {
      if (member.type === "user" && member.userId) {
        participantIds.add(member.userId);
      }
    }
  }

  return Array.from(participantIds);
}

/**
 * Check if a user is owner or admin of an event.
 */
export function isOwnerOrAdmin(event: EventDoc, userId: string): boolean {
  return event.ownerId === userId || event.adminIds.includes(userId);
}

/**
 * Generate a UUID for team registrations.
 */
export function generateTeamId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export { db };
