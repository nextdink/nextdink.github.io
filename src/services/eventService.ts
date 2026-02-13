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
  runTransaction,
  arrayUnion,
  arrayRemove,
  type Timestamp,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type {
  Event,
  CreateEventData,
  UpdateEventData,
  TeamRegistration,
  TeamMember,
  RegisterTeamData,
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
  endTime: convertTimestamp(data.endTime as Timestamp),
  teamSize: (data.teamSize as number) || 1,
  maxTeams: (data.maxTeams as number) || 8,
  venueName: data.venueName as string,
  formattedAddress: data.formattedAddress as string,
  latitude: data.latitude as number,
  longitude: data.longitude as number,
  placeId: data.placeId as string | undefined,
  visibility: data.visibility as Event["visibility"],
  joinType: data.joinType as Event["joinType"],
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

// Generate a unique ID for team registrations
const generateTeamId = (): string => {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
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
      endTime: data.endTime,
      teamSize: data.teamSize || 1,
      maxTeams: data.maxTeams || 8,
      venueName: data.venueName,
      formattedAddress: data.formattedAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      placeId: data.placeId,
      visibility: data.visibility,
      joinType: data.joinType,
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
   * Cancel event
   */
  async cancel(eventId: string): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      status: "canceled",
      updatedAt: serverTimestamp(),
    });
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

  // ============================================
  // Team Registration Operations
  // ============================================

  /**
   * Register a new team for an event
   * Returns the status: 'joined' if within capacity, 'waitlisted' if beyond
   */
  async registerTeam(
    eventId: string,
    userId: string,
    userDisplayName: string,
    userPhotoUrl: string | null,
    teamData: RegisterTeamData,
  ): Promise<{ status: "joined" | "waitlisted"; teamId: string }> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const registrations = (eventData.registrations ||
        []) as TeamRegistration[];
      const teamSize = eventData.teamSize as number;
      const maxTeams = eventData.maxTeams as number;

      // Validate team size
      if (teamData.members.length !== teamSize) {
        throw new Error(`Team must have exactly ${teamSize} member(s)`);
      }

      // Check if user is already in a team
      const isAlreadyRegistered = registrations.some((team) =>
        team.members.some(
          (member) => member.type === "user" && member.userId === userId,
        ),
      );

      if (isAlreadyRegistered) {
        throw new Error("You are already registered for this event");
      }

      // Create the team registration
      // First member is always the captain (the user registering)
      const teamId = generateTeamId();
      const captainMember: TeamMember = {
        type: "user",
        userId,
        displayName: userDisplayName,
        photoUrl: userPhotoUrl,
      };

      // Build members array with captain first, then other members
      const members: TeamMember[] = [
        captainMember,
        ...teamData.members.slice(1),
      ];

      const newTeam: TeamRegistration = {
        id: teamId,
        createdBy: userId,
        createdAt: new Date(),
        members,
      };

      // Add to registrations array
      const updatedRegistrations = [...registrations, newTeam];

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: serverTimestamp(),
      });

      // Determine if joined or waitlisted based on position
      const teamIndex = updatedRegistrations.length - 1;
      const status = teamIndex < maxTeams ? "joined" : "waitlisted";

      return { status, teamId };
    });
  },

  /**
   * Leave a team / remove registration
   * If the user is the captain, the entire team is removed
   * If the user is a team member (future: when users can be added), their slot becomes 'open'
   */
  async leaveTeam(eventId: string, userId: string): Promise<void> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const registrations = (eventData.registrations ||
        []) as TeamRegistration[];

      // Find the team the user belongs to
      const teamIndex = registrations.findIndex((team) =>
        team.members.some(
          (member) => member.type === "user" && member.userId === userId,
        ),
      );

      if (teamIndex === -1) {
        throw new Error("You are not registered for this event");
      }

      const team = registrations[teamIndex];

      // Check if user is the captain
      if (team.createdBy === userId) {
        // Captain leaving - remove the entire team
        const updatedRegistrations = registrations.filter(
          (_, index) => index !== teamIndex,
        );

        transaction.update(eventRef, {
          registrations: updatedRegistrations,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Team member leaving (future use case) - convert their slot to 'open'
        const memberIndex = team.members.findIndex(
          (member) => member.type === "user" && member.userId === userId,
        );

        if (memberIndex === -1) {
          throw new Error("Member not found in team");
        }

        const updatedMembers = [...team.members];
        updatedMembers[memberIndex] = { type: "open" };

        const updatedTeam = { ...team, members: updatedMembers };
        const updatedRegistrations = [...registrations];
        updatedRegistrations[teamIndex] = updatedTeam;

        transaction.update(eventRef, {
          registrations: updatedRegistrations,
          updatedAt: serverTimestamp(),
        });
      }
    });
  },

  /**
   * Claim an open or guest slot in an existing team
   */
  async claimSlot(
    eventId: string,
    teamId: string,
    memberIndex: number,
    userId: string,
    userDisplayName: string,
    userPhotoUrl: string | null,
  ): Promise<{ status: "joined" | "waitlisted" }> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const registrations = (eventData.registrations ||
        []) as TeamRegistration[];
      const maxTeams = eventData.maxTeams as number;

      // Check if user is already in a team
      const isAlreadyRegistered = registrations.some((team) =>
        team.members.some(
          (member) => member.type === "user" && member.userId === userId,
        ),
      );

      if (isAlreadyRegistered) {
        throw new Error("You are already registered for this event");
      }

      // Find the team
      const teamIndex = registrations.findIndex((team) => team.id === teamId);
      if (teamIndex === -1) {
        throw new Error("Team not found");
      }

      const team = registrations[teamIndex];

      // Validate member index
      if (memberIndex < 0 || memberIndex >= team.members.length) {
        throw new Error("Invalid slot position");
      }

      const slot = team.members[memberIndex];

      // Check if slot is claimable
      if (slot.type !== "open" && slot.type !== "guest") {
        throw new Error("This slot cannot be claimed");
      }

      // Update the slot with the new user
      const updatedMembers = [...team.members];
      updatedMembers[memberIndex] = {
        type: "user",
        userId,
        displayName: userDisplayName,
        photoUrl: userPhotoUrl,
      };

      const updatedTeam = { ...team, members: updatedMembers };
      const updatedRegistrations = [...registrations];
      updatedRegistrations[teamIndex] = updatedTeam;

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: serverTimestamp(),
      });

      // Return status based on team position
      const status = teamIndex < maxTeams ? "joined" : "waitlisted";
      return { status };
    });
  },

  /**
   * Update a team member (captain only)
   * Can change guest name or convert slot to open
   */
  async updateTeamMember(
    eventId: string,
    teamId: string,
    memberIndex: number,
    userId: string, // For authorization check
    newMember: TeamMember,
  ): Promise<void> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const registrations = (eventData.registrations ||
        []) as TeamRegistration[];

      // Find the team
      const teamIndex = registrations.findIndex((team) => team.id === teamId);
      if (teamIndex === -1) {
        throw new Error("Team not found");
      }

      const team = registrations[teamIndex];

      // Check if user is the captain
      if (team.createdBy !== userId) {
        throw new Error("Only the team captain can edit team members");
      }

      // Validate member index (can't edit position 0 which is the captain)
      if (memberIndex <= 0 || memberIndex >= team.members.length) {
        throw new Error("Invalid slot position");
      }

      // Update the member
      const updatedMembers = [...team.members];
      updatedMembers[memberIndex] = newMember;

      const updatedTeam = { ...team, members: updatedMembers };
      const updatedRegistrations = [...registrations];
      updatedRegistrations[teamIndex] = updatedTeam;

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: serverTimestamp(),
      });
    });
  },

  /**
   * Remove a team (admin/owner action)
   */
  async removeTeam(eventId: string, teamId: string): Promise<void> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const registrations = (eventData.registrations ||
        []) as TeamRegistration[];

      const updatedRegistrations = registrations.filter(
        (team) => team.id !== teamId,
      );

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: serverTimestamp(),
      });
    });
  },

  /**
   * Add a guest team (owner/admin action)
   * Creates a team where all members are guests (no registered users)
   */
  async addGuestTeam(
    eventId: string,
    adminUserId: string,
    guestNames: string[],
  ): Promise<{ status: "joined" | "waitlisted"; teamId: string }> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const registrations = (eventData.registrations ||
        []) as TeamRegistration[];
      const teamSize = eventData.teamSize as number;
      const maxTeams = eventData.maxTeams as number;

      // Validate team size matches
      if (guestNames.length !== teamSize) {
        throw new Error(`Team must have exactly ${teamSize} member(s)`);
      }

      // Create the guest team
      const teamId = generateTeamId();
      const members: TeamMember[] = guestNames.map((name) => ({
        type: "guest" as const,
        displayName: name.trim() || "Guest",
      }));

      const newTeam: TeamRegistration = {
        id: teamId,
        createdBy: adminUserId, // Admin who created the guest team
        createdAt: new Date(),
        members,
      };

      // Add to registrations array
      const updatedRegistrations = [...registrations, newTeam];

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: serverTimestamp(),
      });

      // Determine if joined or waitlisted based on position
      const teamIndex = updatedRegistrations.length - 1;
      const status = teamIndex < maxTeams ? "joined" : "waitlisted";

      return { status, teamId };
    });
  },

  // ============================================
  // Invitation Operations
  // ============================================

  /**
   * Invite a user to an event
   */
  async inviteUser(eventId: string, userId: string): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      invitedUserIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Remove invitation
   */
  async removeInvitation(eventId: string, userId: string): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      invitedUserIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Decline invitation (user action)
   * Moves user from invitedUserIds to declinedUserIds
   */
  async declineInvitation(eventId: string, userId: string): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      invitedUserIds: arrayRemove(userId),
      declinedUserIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Decline event (registered user action)
   * Removes user's registration and adds them to declinedUserIds
   */
  async declineEvent(eventId: string, userId: string): Promise<void> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const registrations = (eventData.registrations ||
        []) as TeamRegistration[];
      const declinedUserIds = (eventData.declinedUserIds || []) as string[];

      // Find the team the user belongs to
      const teamIndex = registrations.findIndex((team) =>
        team.members.some(
          (member) => member.type === "user" && member.userId === userId,
        ),
      );

      if (teamIndex === -1) {
        throw new Error("You are not registered for this event");
      }

      const team = registrations[teamIndex];

      // Check if user is the captain - if so, remove the entire team
      // If not, convert their slot to 'open'
      let updatedRegistrations: TeamRegistration[];

      if (team.createdBy === userId) {
        // Captain declining - remove the entire team
        updatedRegistrations = registrations.filter(
          (_, index) => index !== teamIndex,
        );
      } else {
        // Team member declining - convert their slot to 'open'
        const memberIndex = team.members.findIndex(
          (member) => member.type === "user" && member.userId === userId,
        );

        if (memberIndex === -1) {
          throw new Error("Member not found in team");
        }

        const updatedMembers = [...team.members];
        updatedMembers[memberIndex] = { type: "open" };

        const updatedTeam = { ...team, members: updatedMembers };
        updatedRegistrations = [...registrations];
        updatedRegistrations[teamIndex] = updatedTeam;
      }

      // Add user to declined list
      const updatedDeclinedUserIds = declinedUserIds.includes(userId)
        ? declinedUserIds
        : [...declinedUserIds, userId];

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        declinedUserIds: updatedDeclinedUserIds,
        updatedAt: serverTimestamp(),
      });
    });
  },

  // ============================================
  // Admin Operations
  // ============================================

  /**
   * Add admin to event
   */
  async addAdmin(eventId: string, userId: string): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      adminIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Remove admin from event
   */
  async removeAdmin(eventId: string, userId: string): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      adminIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
  },
};
