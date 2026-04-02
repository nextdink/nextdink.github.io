/**
 * Firebase Cloud Functions for Next Dink Push Notifications
 *
 * These functions are triggered by Firestore document changes
 * and send push notifications to relevant users via FCM.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Types
interface NotificationPreferences {
  eventInvites: boolean;
  slotClaimed: boolean;
  waitlistPromotion: boolean;
  eventCanceled: boolean;
  eventUpdated: boolean;
}

interface UserDoc {
  displayName?: string;
  fcmTokens?: string[];
  notificationSettings?: NotificationPreferences;
}

interface TeamMember {
  type: "user" | "guest" | "open";
  userId: string | null;
  displayName: string | null;
}

interface TeamRegistration {
  id: string;
  createdBy: string;
  members: TeamMember[];
}

interface EventDoc {
  name: string;
  eventCode: string;
  status: "active" | "canceled" | "completed";
  maxTeams: number;
  ownerId: string;
  adminIds: string[];
  invitedUserIds: string[];
  registrations: TeamRegistration[];
  date: admin.firestore.Timestamp;
  venueName: string;
}

/**
 * Send FCM notification to a user
 * Handles token cleanup for invalid tokens
 */
async function sendNotificationToUser(
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  },
  preferenceKey?: keyof NotificationPreferences,
): Promise<void> {
  try {
    // Get user document
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return;
    }

    const userData = userDoc.data() as UserDoc;

    // Deduplicate tokens (in case duplicates were stored)
    const tokens = [...new Set(userData.fcmTokens || [])];

    if (tokens.length === 0) {
      console.log(`User ${userId} has no FCM tokens`);
      return;
    }

    console.log(`User ${userId} has ${tokens.length} unique token(s)`);

    // Check user preferences
    if (preferenceKey && userData.notificationSettings) {
      const prefs = userData.notificationSettings;
      if (!prefs[preferenceKey]) {
        console.log(
          `User ${userId} has disabled ${preferenceKey} notifications`,
        );
        return;
      }
    }

    // Send to all tokens
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

    // Clean up invalid tokens
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
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
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
 * Get all participant user IDs from an event
 */
function getEventParticipantIds(event: EventDoc): string[] {
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
 * Get the captain (creator) of a registration
 */
function getRegistrationCaptain(
  registrations: TeamRegistration[],
  slotUserId: string,
): string | null {
  for (const registration of registrations) {
    for (const member of registration.members) {
      if (member.userId === slotUserId) {
        return registration.createdBy;
      }
    }
  }
  return null;
}

// ============================================
// NOTIFICATION TRIGGERS
// ============================================

/**
 * Trigger: User invited to event
 * Fires when invitedUserIds array changes
 */
export const onEventInvite = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as EventDoc;
    const after = change.after.data() as EventDoc;

    // Only process active events
    if (after.status !== "active") {
      return;
    }

    // Find newly invited users
    const beforeInvites = new Set(before.invitedUserIds || []);
    const newInvites = (after.invitedUserIds || []).filter(
      (id) => !beforeInvites.has(id),
    );

    if (newInvites.length === 0) {
      return;
    }

    console.log(`New invites for event ${context.params.eventId}:`, newInvites);

    // Send notifications to newly invited users
    const promises = newInvites.map((userId) =>
      sendNotificationToUser(
        userId,
        {
          title: "Event Invitation",
          body: `You've been invited to ${after.name}`,
          data: {
            type: "event_invite",
            eventId: context.params.eventId,
            eventCode: after.eventCode,
          },
        },
        "eventInvites",
      ),
    );

    await Promise.all(promises);
  });

/**
 * Trigger: Someone claimed a slot on a team
 * Fires when a registration member changes from 'open' or 'guest' to 'user'
 */
export const onSlotClaimed = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as EventDoc;
    const after = change.after.data() as EventDoc;

    // Only process active events
    if (after.status !== "active") {
      return;
    }

    // Find newly claimed slots (type changed to 'user' with a userId)
    const claimedSlots: Array<{ userId: string; captainId: string }> = [];

    for (const afterReg of after.registrations) {
      const beforeReg = before.registrations.find((r) => r.id === afterReg.id);
      if (!beforeReg) continue;

      for (let i = 0; i < afterReg.members.length; i++) {
        const afterMember = afterReg.members[i];
        const beforeMember = beforeReg.members[i];

        if (!beforeMember || !afterMember) continue;

        // Check if slot was claimed (became user type)
        if (
          afterMember.type === "user" &&
          afterMember.userId &&
          beforeMember.type !== "user"
        ) {
          // Notify the team captain (not the person who claimed)
          if (afterReg.createdBy !== afterMember.userId) {
            claimedSlots.push({
              userId: afterReg.createdBy,
              captainId: afterReg.createdBy,
            });
          }
        }
      }
    }

    if (claimedSlots.length === 0) {
      return;
    }

    console.log(`Slot claimed in event ${context.params.eventId}`);

    // Notify team captains
    const uniqueCaptains = [...new Set(claimedSlots.map((s) => s.captainId))];
    const promises = uniqueCaptains.map((captainId) =>
      sendNotificationToUser(
        captainId,
        {
          title: "Team Update",
          body: `Someone joined your team for ${after.name}`,
          data: {
            type: "slot_claimed",
            eventId: context.params.eventId,
            eventCode: after.eventCode,
          },
        },
        "slotClaimed",
      ),
    );

    await Promise.all(promises);
  });

/**
 * Trigger: Waitlist promotion
 * Fires when a registration moves from waitlist to joined (index < maxTeams)
 */
export const onWaitlistPromotion = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as EventDoc;
    const after = change.after.data() as EventDoc;

    // Only process active events
    if (after.status !== "active") {
      return;
    }

    // Get registrations that were on waitlist (index >= maxTeams) but now joined
    const beforeJoined = before.registrations.slice(0, before.maxTeams);
    const afterJoined = after.registrations.slice(0, after.maxTeams);

    // Find registrations that weren't in beforeJoined but are in afterJoined
    const beforeJoinedIds = new Set(beforeJoined.map((r) => r.id));
    const promoted = afterJoined.filter((r) => !beforeJoinedIds.has(r.id));

    if (promoted.length === 0) {
      return;
    }

    console.log(
      `Waitlist promotions for event ${context.params.eventId}:`,
      promoted.length,
    );

    // Notify promoted team captains
    const promises = promoted.map((registration) =>
      sendNotificationToUser(
        registration.createdBy,
        {
          title: "You're In! 🎉",
          body: `Your team has been promoted from the waitlist for ${after.name}`,
          data: {
            type: "waitlist_promotion",
            eventId: context.params.eventId,
            eventCode: after.eventCode,
          },
        },
        "waitlistPromotion",
      ),
    );

    await Promise.all(promises);
  });

/**
 * Trigger: Event canceled
 * Fires when event status changes to 'canceled'
 */
export const onEventCanceled = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as EventDoc;
    const after = change.after.data() as EventDoc;

    // Only process if status changed to canceled
    if (before.status === "canceled" || after.status !== "canceled") {
      return;
    }

    console.log(`Event ${context.params.eventId} was canceled`);

    // Get all participants and invited users
    const participantIds = getEventParticipantIds(after);
    const allRecipients = [
      ...new Set([...participantIds, ...after.invitedUserIds]),
    ];

    // Don't notify the owner (they're the one who canceled)
    const recipientsExcludingOwner = allRecipients.filter(
      (id) => id !== after.ownerId,
    );

    if (recipientsExcludingOwner.length === 0) {
      return;
    }

    const promises = recipientsExcludingOwner.map((userId) =>
      sendNotificationToUser(
        userId,
        {
          title: "Event Canceled",
          body: `${after.name} has been canceled`,
          data: {
            type: "event_canceled",
            eventId: context.params.eventId,
            eventCode: after.eventCode,
          },
        },
        "eventCanceled",
      ),
    );

    await Promise.all(promises);
  });

/**
 * Trigger: Event details updated
 * Fires when important event details change (date, time, location)
 */
export const onEventUpdated = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as EventDoc;
    const after = change.after.data() as EventDoc;

    // Only process active events
    if (after.status !== "active") {
      return;
    }

    // Check if important fields changed
    const dateChanged = before.date?.toMillis() !== after.date?.toMillis();
    const venueChanged = before.venueName !== after.venueName;
    const nameChanged = before.name !== after.name;

    // Check for status change (after.status is 'active' here since we returned early above)
    const statusChanged = before.status !== after.status;

    if (!dateChanged && !venueChanged && !nameChanged && !statusChanged) {
      return;
    }

    console.log(`Event ${context.params.eventId} details updated`);

    // Build notification body
    const changes: string[] = [];
    if (dateChanged) changes.push("date/time");
    if (venueChanged) changes.push("location");
    if (nameChanged) changes.push("name");

    const changeDescription =
      changes.length > 0 ? `${changes.join(", ")} changed` : "details updated";

    // Notify all participants
    const participantIds = getEventParticipantIds(after);

    // Don't notify the person who made the change (likely owner/admin)
    // Note: We can't easily determine who made the change from Firestore triggers
    // So we'll notify everyone except the owner
    const recipientsExcludingOwner = participantIds.filter(
      (id) => id !== after.ownerId,
    );

    if (recipientsExcludingOwner.length === 0) {
      return;
    }

    const promises = recipientsExcludingOwner.map((userId) =>
      sendNotificationToUser(
        userId,
        {
          title: "Event Updated",
          body: `${after.name}: ${changeDescription}`,
          data: {
            type: "event_updated",
            eventId: context.params.eventId,
            eventCode: after.eventCode,
          },
        },
        "eventUpdated",
      ),
    );

    await Promise.all(promises);
  });

// Suppress unused variable warning
void getRegistrationCaptain;

// ============================================
// AI TOURNAMENT DISCOVERY
// ============================================

/**
 * Callable function: Discover upcoming pickleball tournaments near a location
 * using Gemini AI with Google Search grounding.
 */
export const discoverTournaments = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (data, context) => {
      const { latitude, longitude, radiusMiles = 25 } = data;

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "latitude and longitude are required numbers",
        );
      }

      // Geo-bucketing: round to nearest 0.1° for cache key
      const bucketLat = parseFloat(
        (Math.round(latitude / 0.1) * 0.1).toFixed(1),
      );
      const bucketLng = parseFloat(
        (Math.round(longitude / 0.1) * 0.1).toFixed(1),
      );
      const cacheKey = `${bucketLat}_${bucketLng}`;

      // Check cache
      const cacheDoc = await db
        .collection("tournamentCache")
        .doc(cacheKey)
        .get();
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data();
        const cachedAt = cacheData?.cachedAt?.toDate();
        const now = new Date();
        const CACHE_TTL_HOURS = 72;

        if (
          cachedAt &&
          now.getTime() - cachedAt.getTime() < CACHE_TTL_HOURS * 60 * 60 * 1000
        ) {
          console.log(`Cache hit for ${cacheKey}`);
          return { tournaments: cacheData?.tournaments || [], fromCache: true };
        }
      }

      // Check monthly usage counter
      const usageRef = db.collection("config").doc("searchUsage");
      const usageDoc = await usageRef.get();
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usageData = usageDoc.exists ? usageDoc.data() : null;
      const monthlyCount =
        usageData?.month === currentMonth ? usageData?.count || 0 : 0;
      const MONTHLY_LIMIT = 4500;

      if (monthlyCount >= MONTHLY_LIMIT) {
        console.warn(
          `Monthly search limit reached (${monthlyCount}/${MONTHLY_LIMIT})`,
        );
        if (cacheDoc.exists) {
          return {
            tournaments: cacheDoc.data()?.tournaments || [],
            fromCache: true,
            limitReached: true,
          };
        }
        return { tournaments: [], fromCache: false, limitReached: true };
      }

      // Call Gemini API with Google Search grounding
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new functions.https.HttpsError(
          "internal",
          "GEMINI_API_KEY not configured",
        );
      }

      const ai = new GoogleGenAI({ apiKey });

      const locationPrompt = `latitude ${latitude}, longitude ${longitude}`;

      const prompt = `Find upcoming pickleball tournaments within ${radiusMiles} miles of ${locationPrompt}. Search for tournaments from all sources including pickleballtournaments.com, local recreation departments, community centers, and club events.

For each tournament, provide the following information in a JSON array. Return ONLY the JSON array with no markdown formatting, no code blocks, no additional text:

[
  {
    "name": "Tournament Name",
    "description": "Brief description",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "venueName": "Venue Name",
    "formattedAddress": "Full address",
    "latitude": 0.0,
    "longitude": 0.0,
    "format": "singles|doubles|mixed|multi",
    "skillLevels": ["3.0", "3.5", "4.0"],
    "entryFee": "$40/event",
    "organizerName": "Organizer",
    "sourceUrl": "https://...",
    "registrationUrl": "https://..."
  }
]

Important:
- Only include tournaments that haven't happened yet (upcoming)
- Include the actual source URL where you found each tournament
- If you can't find tournament details, use reasonable defaults
- If you can't find any tournaments, return an empty array []
- Return ONLY valid JSON, no other text`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const responseText = response.text?.trim() || "[]";

        // Parse the JSON response — handle potential markdown code blocks
        let cleanedText = responseText;
        if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "");
        }

        let tournaments: unknown[];
        try {
          tournaments = JSON.parse(cleanedText);
        } catch {
          console.error("Failed to parse Gemini response:", cleanedText);
          tournaments = [];
        }

        if (!Array.isArray(tournaments)) {
          tournaments = [];
        }

        // Normalize and validate results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizedTournaments = tournaments.map(
          (t: any, index: number) => ({
            id: `ai_${cacheKey}_${index}`,
            name: String(t.name || "Unknown Tournament"),
            description: t.description ? String(t.description) : null,
            startDate: String(
              t.startDate || new Date().toISOString().slice(0, 10),
            ),
            endDate: String(
              t.endDate || t.startDate || new Date().toISOString().slice(0, 10),
            ),
            venueName: String(t.venueName || "TBD"),
            formattedAddress: String(t.formattedAddress || ""),
            latitude: typeof t.latitude === "number" ? t.latitude : latitude,
            longitude:
              typeof t.longitude === "number" ? t.longitude : longitude,
            format: ["singles", "doubles", "mixed", "multi"].includes(t.format)
              ? t.format
              : "multi",
            skillLevels: Array.isArray(t.skillLevels)
              ? t.skillLevels.map(String)
              : [],
            entryFee: t.entryFee ? String(t.entryFee) : null,
            organizerName: t.organizerName ? String(t.organizerName) : null,
            sourceUrl: t.sourceUrl ? String(t.sourceUrl) : null,
            registrationUrl: t.registrationUrl
              ? String(t.registrationUrl)
              : null,
            source: "ai",
            cachedAt: new Date().toISOString(),
            status: "upcoming",
          }),
        );

        // Cache results
        await db
          .collection("tournamentCache")
          .doc(cacheKey)
          .set({
            tournaments: normalizedTournaments,
            cachedAt: FieldValue.serverTimestamp(),
            location: { latitude: bucketLat, longitude: bucketLng },
            radiusMiles,
          });

        // Increment usage counter
        await usageRef.set({
          month: currentMonth,
          count: monthlyCount + 1,
          lastSearchAt: FieldValue.serverTimestamp(),
        });

        console.log(
          `Found ${normalizedTournaments.length} tournaments near ${cacheKey}`,
        );
        return { tournaments: normalizedTournaments, fromCache: false };
      } catch (error) {
        console.error("Gemini API error:", error);
        if (cacheDoc.exists) {
          return {
            tournaments: cacheDoc.data()?.tournaments || [],
            fromCache: true,
            error: true,
          };
        }
        throw new functions.https.HttpsError(
          "internal",
          "Failed to discover tournaments",
        );
      }
    },
  );
