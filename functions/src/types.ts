import * as admin from "firebase-admin";

// ============================================
// Shared Types for Cloud Functions
// ============================================

export interface NotificationPreferences {
  eventInvites: boolean;
  slotClaimed: boolean;
  waitlistPromotion: boolean;
  eventCanceled: boolean;
  eventUpdated: boolean;
}

export interface UserDoc {
  displayName?: string;
  fcmTokens?: string[];
  notificationSettings?: NotificationPreferences;
}

export interface TeamMember {
  type: "user" | "guest" | "open";
  userId?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
}

export interface TeamRegistration {
  id: string;
  createdBy: string;
  createdAt?: admin.firestore.Timestamp | Date;
  members: TeamMember[];
}

export interface EventDoc {
  name: string;
  eventCode: string;
  status: "active" | "canceled" | "completed";
  teamSize: number;
  maxTeams: number;
  ownerId: string;
  adminIds: string[];
  invitedUserIds: string[];
  declinedUserIds: string[];
  registrations: TeamRegistration[];
  date: admin.firestore.Timestamp;
  venueName: string;
}
