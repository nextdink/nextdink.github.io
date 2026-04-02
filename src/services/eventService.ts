import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  type Timestamp,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/config/firebase";
import type {
  Event,
  CreateEventData,
  UpdateEventData,
  TeamRegistration,
  TeamMember,
} from "@/types/event.types";
import { generateEventCode } from "@/utils/eventCodeUtils";

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | Date | null): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
};

// Convert Firestore team registration data
const convertTeamRegistration = (
  data: Record<string, unknown>,
): TeamRegistration => ({
  id: data.id as string,
  createdBy: data.createdBy as string,
  createdAt: convertTimestamp(data.createdAt as Timestamp),
  members: (data.members as TeamMember[]) || [],
});

// Convert Firestore document to Event
const docToEvent = (id: string, data: Record<string, unknown>): Event => ({
  id,
  name: data.name as string,
  description: data.description as string | undefined,
  date: convertTimestamp(data.date as Timestamp),
  durationInMinutes: (data.durationInMinutes as number) || 60,
  teamSize: (data.teamSize as number) || 1,
  maxTeams: (data.maxTeams as number) || 8,
  venueName: data.venueName as string,
  formattedAddress: data.formattedAddress as string,
  latitude: data.latitude as number,
  longitude: data.longitude as number,
  placeId: data.placeId as string | undefined,
  visibility: data.visibility as Event["visibility"],
  eventCode: data.eventCode as string,
  status: data.status as Event["status"],
  ownerId: data.ownerId as string,
  adminIds: (data.adminIds as string[]) || [],
  registrations: ((data.registrations as Record<string, unknown>[]) || []).map(
    convertTeamRegistration,
  ),
  invitedUserIds: (data.invitedUserIds as string[]) || [],
  declinedUserIds: (data.declinedUserIds as string[]) || [],
  createdAt: convertTimestamp(data.createdAt as Timestamp),
  updatedAt: convertTimestamp(data.updatedAt as Timestamp),
});

// Helper to remove undefined values from an object (Firestore doesn't accept undefined)
const removeUndefined = <T extends object>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== undefined
    ) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const eventService = {
  // ============================================
  // Event CRUD Operations
  // ============================================

  /**
   * Create a new event - returns the generated eventCode for navigation
   */
  async create(data: CreateEventData, ownerId: string): Promise<string> {
    const eventsRef = collection(db, "events");

    // Generate a unique event code
    let eventCode = generateEventCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (
      !(await this.isEventCodeUnique(eventCode)) &&
      attempts < maxAttempts
    ) {
      eventCode = generateEventCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error(
        "Failed to generate unique event code. Please try again.",
      );
    }

    // Build the event data
    const eventData = removeUndefined({
      name: data.name,
      description: data.description,
      date: data.date,
      durationInMinutes: data.durationInMinutes,
      teamSize: data.teamSize || 1,
      maxTeams: data.maxTeams || 8,
      venueName: data.venueName,
      formattedAddress: data.formattedAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      placeId: data.placeId,
      visibility: data.visibility,
      eventCode,
      status: "active" as const,
      ownerId,
      adminIds: [],
      registrations: [],
      invitedUserIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(eventsRef, eventData);
    return eventCode;
  },

  /**
   * Get event by document ID
   */
  async getById(eventId: string): Promise<Event | null> {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return null;
    return docToEvent(eventSnap.id, eventSnap.data());
  },

  /**
   * Get event by event code
   */
  async getByCode(eventCode: string): Promise<Event | null> {
    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef,
      where("eventCode", "==", eventCode),
      where("status", "==", "active"),
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const eventDoc = snapshot.docs[0];
    return docToEvent(eventDoc.id, eventDoc.data());
  },

  /**
   * Update event details
   */
  async update(eventId: string, data: UpdateEventData): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    const cleanedData = removeUndefined(data);

    await updateDoc(eventRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Cancel event.
   * Delegates to the cancelEvent Cloud Function (owner only).
   */
  async cancel(eventId: string): Promise<void> {
    const fn = httpsCallable(functions, "cancelEvent");
    await fn({ eventId });
  },

  /**
   * Delete event permanently
   */
  async delete(eventId: string): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await deleteDoc(eventRef);
  },

  /**
   * Check if event code is unique among active events
   */
  async isEventCodeUnique(
    eventCode: string,
    excludeEventId?: string,
  ): Promise<boolean> {
    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef,
      where("eventCode", "==", eventCode),
      where("status", "==", "active"),
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return true;
    if (
      excludeEventId &&
      snapshot.docs.length === 1 &&
      snapshot.docs[0].id === excludeEventId
    ) {
      return true;
    }
    return false;
  },

  // ============================================
  // Event Query Operations
  // ============================================

  /**
   * Get public events
   */
  async getPublicEvents(limitCount = 20): Promise<Event[]> {
    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef,
      where("visibility", "==", "public"),
      where("status", "==", "active"),
      orderBy("date", "asc"),
      limit(limitCount),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((eventDoc) =>
      docToEvent(eventDoc.id, eventDoc.data()),
    );
  },

  /**
   * Get events by owner
   */
  async getByOwner(ownerId: string): Promise<Event[]> {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("ownerId", "==", ownerId));

    const snapshot = await getDocs(q);
    const events = snapshot.docs.map((eventDoc) =>
      docToEvent(eventDoc.id, eventDoc.data()),
    );
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  /**
   * Get events where user is a participant (in any team)
   */
  async getByParticipant(userId: string): Promise<Event[]> {
    // Note: Firestore doesn't support querying nested array fields directly,
    // so we need to fetch active events and filter client-side.
    // For scale, consider maintaining a separate userEvents collection.
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("status", "==", "active"));

    const snapshot = await getDocs(q);
    const events = snapshot.docs.map((eventDoc) =>
      docToEvent(eventDoc.id, eventDoc.data()),
    );

    // Filter to events where user is in any team
    const participantEvents = events.filter((event) =>
      event.registrations.some((team) =>
        team.members.some(
          (member) => member.type === "user" && member.userId === userId,
        ),
      ),
    );

    return participantEvents.sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  },

  /**
   * Get events where user is invited
   */
  async getByInvitedUser(userId: string): Promise<Event[]> {
    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef,
      where("invitedUserIds", "array-contains", userId),
      where("status", "==", "active"),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((eventDoc) =>
      docToEvent(eventDoc.id, eventDoc.data()),
    );
  },

  /**
   * Get events where user has declined
   */
  async getByDeclinedUser(userId: string): Promise<Event[]> {
    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef,
      where("declinedUserIds", "array-contains", userId),
      where("status", "==", "active"),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((eventDoc) =>
      docToEvent(eventDoc.id, eventDoc.data()),
    );
  },

  /**
   * Get events where user is an admin
   */
  async getByAdmin(userId: string): Promise<Event[]> {
    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef,
      where("adminIds", "array-contains", userId),
      where("status", "==", "active"),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((eventDoc) =>
      docToEvent(eventDoc.id, eventDoc.data()),
    );
  },

  // ============================================
  // Team Registration Operations (via Cloud Functions)
  // ============================================

  /**
   * Register a new team for an event.
   * Delegates to the registerTeam Cloud Function.
   */
  async registerTeam(
    eventId: string,
    _userId: string,
    _userDisplayName: string,
    _userPhotoUrl: string | null,
    teamData: { members: TeamMember[] },
  ): Promise<{ status: "joined" | "waitlisted"; teamId: string }> {
    const fn = httpsCallable<
      { eventId: string; members: TeamMember[] },
      { status: "joined" | "waitlisted"; teamId: string }
    >(functions, "registerTeam");
    const result = await fn({ eventId, members: teamData.members });
    return result.data;
  },

  /**
   * Leave a team / remove registration.
   * Delegates to the leaveTeam Cloud Function.
   */
  async leaveTeam(
    eventId: string,
    _userId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ teamRemoved: boolean }> {
    const fn = httpsCallable<{ eventId: string }, { teamRemoved: boolean }>(
      functions,
      "leaveTeam",
    );
    const result = await fn({ eventId });
    return result.data;
  },

  /**
   * Claim an open or guest slot in an existing team.
   * Delegates to the claimSlot Cloud Function.
   */
  async claimSlot(
    eventId: string,
    teamId: string,
    memberIndex: number,
    _userId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _userDisplayName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _userPhotoUrl: string | null, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ status: "joined" | "waitlisted" }> {
    const fn = httpsCallable<
      { eventId: string; teamId: string; memberIndex: number },
      { status: "joined" | "waitlisted" }
    >(functions, "claimSlot");
    const result = await fn({ eventId, teamId, memberIndex });
    return result.data;
  },

  /**
   * Update a team member (captain only).
   * Delegates to the updateTeamMember Cloud Function.
   */
  async updateTeamMember(
    eventId: string,
    teamId: string,
    memberIndex: number,
    _userId: string,
    newMember: TeamMember,
  ): Promise<void> {
    const fn = httpsCallable(functions, "updateTeamMember");
    await fn({ eventId, teamId, memberIndex, newMember });
  },

  /**
   * Remove a team (admin/owner action).
   * Delegates to the manageTeams Cloud Function.
   */
  async removeTeam(eventId: string, teamId: string): Promise<void> {
    const fn = httpsCallable(functions, "manageTeams");
    await fn({ eventId, action: "removeTeam", teamId });
  },

  /**
   * Remove a team member (admin/owner action).
   * Delegates to the manageTeams Cloud Function.
   */
  async removeTeamMember(
    eventId: string,
    teamId: string,
    memberIndex: number,
  ): Promise<{ teamRemoved: boolean }> {
    const fn = httpsCallable<
      { eventId: string; action: string; teamId: string; memberIndex: number },
      { success: boolean; teamRemoved: boolean }
    >(functions, "manageTeams");
    const result = await fn({
      eventId,
      action: "removeMember",
      teamId,
      memberIndex,
    });
    return { teamRemoved: result.data.teamRemoved };
  },

  /**
   * Fill an open slot with a guest name (admin/owner action).
   * Delegates to the manageTeams Cloud Function.
   */
  async fillOpenSlotWithGuest(
    eventId: string,
    teamId: string,
    memberIndex: number,
    guestName: string,
  ): Promise<void> {
    const fn = httpsCallable(functions, "manageTeams");
    await fn({
      eventId,
      action: "fillWithGuest",
      teamId,
      memberIndex,
      guestName,
    });
  },

  /**
   * Add a guest team (owner/admin action).
   * Delegates to the manageTeams Cloud Function.
   */
  async addGuestTeam(
    eventId: string,
    _adminUserId: string,
    guestNames: string[],
  ): Promise<{ status: "joined" | "waitlisted"; teamId: string }> {
    const fn = httpsCallable<
      { eventId: string; action: string; guestNames: string[] },
      { success: boolean; status: "joined" | "waitlisted"; teamId: string }
    >(functions, "manageTeams");
    const result = await fn({
      eventId,
      action: "addGuestTeam",
      guestNames,
    });
    return { status: result.data.status, teamId: result.data.teamId };
  },

  // ============================================
  // Invitation Operations (via Cloud Functions)
  // ============================================

  /**
   * Invite a user to an event.
   * Delegates to the manageInvitations Cloud Function.
   */
  async inviteUser(eventId: string, userId: string): Promise<void> {
    const fn = httpsCallable(functions, "manageInvitations");
    await fn({ eventId, targetUserId: userId, action: "invite" });
  },

  /**
   * Remove invitation.
   * Delegates to the manageInvitations Cloud Function.
   */
  async removeInvitation(eventId: string, userId: string): Promise<void> {
    const fn = httpsCallable(functions, "manageInvitations");
    await fn({ eventId, targetUserId: userId, action: "remove" });
  },

  /**
   * Decline invitation (user action).
   * Delegates to the respondToInvite Cloud Function.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async declineInvitation(eventId: string, _userId?: string): Promise<void> {
    const fn = httpsCallable(functions, "respondToInvite");
    await fn({ eventId, action: "decline" });
  },

  /**
   * Decline event (registered user action).
   * Delegates to the declineEvent Cloud Function.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async declineEvent(eventId: string, _userId?: string): Promise<void> {
    const fn = httpsCallable(functions, "declineEvent");
    await fn({ eventId });
  },

  // ============================================
  // Admin Operations (via Cloud Functions)
  // ============================================

  /**
   * Add admin to event.
   * Delegates to the manageAdmins Cloud Function.
   */
  async addAdmin(eventId: string, userId: string): Promise<void> {
    const fn = httpsCallable(functions, "manageAdmins");
    await fn({ eventId, targetUserId: userId, action: "add" });
  },

  /**
   * Remove admin from event.
   * Delegates to the manageAdmins Cloud Function.
   */
  async removeAdmin(eventId: string, userId: string): Promise<void> {
    const fn = httpsCallable(functions, "manageAdmins");
    await fn({ eventId, targetUserId: userId, action: "remove" });
  },
};
