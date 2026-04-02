/**
 * Callable Cloud Functions for event registration, invitation, and admin operations.
 *
 * These bypass Firestore security rules (admin SDK) because the event document's
 * embedded registrations array cannot be safely validated per-element in rules.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import type { TeamMember, TeamRegistration, EventDoc } from "./types";
import { db, isOwnerOrAdmin, generateTeamId } from "./helpers";

// ============================================
// REGISTRATION OPERATIONS
// ============================================

/**
 * Register a new team for an event.
 * Any authenticated user can call this.
 */
export const registerTeam = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId, members } = data as {
    eventId: string;
    members: TeamMember[];
  };

  if (!eventId || !Array.isArray(members)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId and members are required",
    );
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();
  const userDisplayName = userData?.displayName || "Unknown";
  const userPhotoUrl = userData?.photoUrl || null;

  return await db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const event = eventSnap.data() as EventDoc;

    if (event.status !== "active") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Event is not active",
      );
    }

    if (members.length !== event.teamSize) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Team must have exactly ${event.teamSize} member(s)`,
      );
    }

    const isAlreadyRegistered = event.registrations.some((team) =>
      team.members.some(
        (member) => member.type === "user" && member.userId === userId,
      ),
    );

    if (isAlreadyRegistered) {
      throw new functions.https.HttpsError(
        "already-exists",
        "You are already registered for this event",
      );
    }

    const teamId = generateTeamId();
    const captainMember: TeamMember = {
      type: "user",
      userId,
      displayName: userDisplayName,
      photoUrl: userPhotoUrl,
    };

    const teamMembers: TeamMember[] = [captainMember, ...members.slice(1)];

    const newTeam: TeamRegistration = {
      id: teamId,
      createdBy: userId,
      createdAt: admin.firestore.Timestamp.now(),
      members: teamMembers,
    };

    const updatedRegistrations = [...event.registrations, newTeam];
    const updatedDeclinedUserIds = (event.declinedUserIds || []).filter(
      (id) => id !== userId,
    );

    transaction.update(eventRef, {
      registrations: updatedRegistrations,
      declinedUserIds: updatedDeclinedUserIds,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const teamIndex = updatedRegistrations.length - 1;
    const status = teamIndex < event.maxTeams ? "joined" : "waitlisted";

    return { status, teamId };
  });
});

/**
 * Leave a team / remove own registration.
 * The participant's slot becomes 'open'; team is removed if no users/guests remain.
 */
export const leaveTeam = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId } = data as { eventId: string };
  if (!eventId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId is required",
    );
  }

  const userId = context.auth.uid;

  return await db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const event = eventSnap.data() as EventDoc;
    const registrations = event.registrations || [];

    const teamIndex = registrations.findIndex((team) =>
      team.members.some(
        (member) => member.type === "user" && member.userId === userId,
      ),
    );

    if (teamIndex === -1) {
      throw new functions.https.HttpsError(
        "not-found",
        "You are not registered for this event",
      );
    }

    const team = registrations[teamIndex];
    const memberIndex = team.members.findIndex(
      (member) => member.type === "user" && member.userId === userId,
    );

    const updatedMembers = [...team.members];
    updatedMembers[memberIndex] = { type: "open" };

    const hasUsersOrGuests = updatedMembers.some(
      (member) => member.type === "user" || member.type === "guest",
    );

    let updatedRegistrations: TeamRegistration[];
    let teamRemoved = false;

    if (!hasUsersOrGuests) {
      updatedRegistrations = registrations.filter(
        (_, index) => index !== teamIndex,
      );
      teamRemoved = true;
    } else {
      const updatedTeam = { ...team, members: updatedMembers };
      updatedRegistrations = [...registrations];
      updatedRegistrations[teamIndex] = updatedTeam;
    }

    transaction.update(eventRef, {
      registrations: updatedRegistrations,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { teamRemoved };
  });
});

/**
 * Claim an open or guest slot in an existing team.
 */
export const claimSlot = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId, teamId, memberIndex } = data as {
    eventId: string;
    teamId: string;
    memberIndex: number;
  };

  if (!eventId || !teamId || typeof memberIndex !== "number") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId, teamId, and memberIndex are required",
    );
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();
  const userDisplayName = userData?.displayName || "Unknown";
  const userPhotoUrl = userData?.photoUrl || null;

  return await db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const event = eventSnap.data() as EventDoc;
    const registrations = event.registrations || [];

    const isAlreadyRegistered = registrations.some((team) =>
      team.members.some(
        (member) => member.type === "user" && member.userId === userId,
      ),
    );

    if (isAlreadyRegistered) {
      throw new functions.https.HttpsError(
        "already-exists",
        "You are already registered for this event",
      );
    }

    const teamIdx = registrations.findIndex((team) => team.id === teamId);
    if (teamIdx === -1) {
      throw new functions.https.HttpsError("not-found", "Team not found");
    }

    const team = registrations[teamIdx];

    if (memberIndex < 0 || memberIndex >= team.members.length) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid slot position",
      );
    }

    const slot = team.members[memberIndex];
    if (slot.type !== "open" && slot.type !== "guest") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This slot cannot be claimed",
      );
    }

    const updatedMembers = [...team.members];
    updatedMembers[memberIndex] = {
      type: "user",
      userId,
      displayName: userDisplayName,
      photoUrl: userPhotoUrl,
    };

    const updatedTeam = {
      ...team,
      members: updatedMembers,
      ...(memberIndex === 0 && { createdBy: userId }),
    };

    const updatedRegistrations = [...registrations];
    updatedRegistrations[teamIdx] = updatedTeam;

    const updatedDeclinedUserIds = (event.declinedUserIds || []).filter(
      (id) => id !== userId,
    );

    transaction.update(eventRef, {
      registrations: updatedRegistrations,
      declinedUserIds: updatedDeclinedUserIds,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const status = teamIdx < event.maxTeams ? "joined" : "waitlisted";
    return { status };
  });
});

/**
 * Update a team member (captain only — can change guest name or convert slot to open).
 */
export const updateTeamMember = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { eventId, teamId, memberIndex, newMember } = data as {
      eventId: string;
      teamId: string;
      memberIndex: number;
      newMember: TeamMember;
    };

    if (!eventId || !teamId || typeof memberIndex !== "number" || !newMember) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "eventId, teamId, memberIndex, and newMember are required",
      );
    }

    const userId = context.auth.uid;

    return await db.runTransaction(async (transaction) => {
      const eventRef = db.collection("events").doc(eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Event not found");
      }

      const event = eventSnap.data() as EventDoc;
      const registrations = event.registrations || [];

      const teamIdx = registrations.findIndex((team) => team.id === teamId);
      if (teamIdx === -1) {
        throw new functions.https.HttpsError("not-found", "Team not found");
      }

      const team = registrations[teamIdx];

      if (team.createdBy !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only the team captain can edit team members",
        );
      }

      if (memberIndex <= 0 || memberIndex >= team.members.length) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid slot position",
        );
      }

      const updatedMembers = [...team.members];
      updatedMembers[memberIndex] = newMember;

      const updatedTeam = { ...team, members: updatedMembers };
      const updatedRegistrations = [...registrations];
      updatedRegistrations[teamIdx] = updatedTeam;

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  },
);

// ============================================
// INVITATION OPERATIONS
// ============================================

/**
 * Respond to an event invitation — accept (register) or decline.
 */
export const respondToInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId, action } = data as {
    eventId: string;
    action: "decline";
  };

  if (!eventId || action !== "decline") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId and action ('decline') are required",
    );
  }

  const userId = context.auth.uid;
  const eventRef = db.collection("events").doc(eventId);

  // Decline: move from invitedUserIds to declinedUserIds
  await eventRef.update({
    invitedUserIds: FieldValue.arrayRemove(userId),
    declinedUserIds: FieldValue.arrayUnion(userId),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

/**
 * Decline an event the user is registered for.
 * Removes their registration and adds them to declinedUserIds.
 */
export const declineEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId } = data as { eventId: string };
  if (!eventId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId is required",
    );
  }

  const userId = context.auth.uid;

  return await db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const event = eventSnap.data() as EventDoc;
    const registrations = event.registrations || [];
    const declinedUserIds = event.declinedUserIds || [];

    const teamIndex = registrations.findIndex((team) =>
      team.members.some(
        (member) => member.type === "user" && member.userId === userId,
      ),
    );

    if (teamIndex === -1) {
      throw new functions.https.HttpsError(
        "not-found",
        "You are not registered for this event",
      );
    }

    const team = registrations[teamIndex];
    const memberIndex = team.members.findIndex(
      (member) => member.type === "user" && member.userId === userId,
    );

    const updatedMembers = [...team.members];
    updatedMembers[memberIndex] = { type: "open" };

    const hasUsersOrGuests = updatedMembers.some(
      (member) => member.type === "user" || member.type === "guest",
    );

    let updatedRegistrations: TeamRegistration[];

    if (!hasUsersOrGuests) {
      updatedRegistrations = registrations.filter(
        (_, index) => index !== teamIndex,
      );
    } else {
      const updatedTeam = { ...team, members: updatedMembers };
      updatedRegistrations = [...registrations];
      updatedRegistrations[teamIndex] = updatedTeam;
    }

    const updatedDeclinedUserIds = declinedUserIds.includes(userId)
      ? declinedUserIds
      : [...declinedUserIds, userId];

    transaction.update(eventRef, {
      registrations: updatedRegistrations,
      declinedUserIds: updatedDeclinedUserIds,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
});

// ============================================
// OWNER/ADMIN OPERATIONS
// ============================================

/**
 * Manage invitations — invite a user or remove an invitation.
 * Owner or admin only.
 */
export const manageInvitations = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { eventId, targetUserId, action } = data as {
      eventId: string;
      targetUserId: string;
      action: "invite" | "remove";
    };

    if (!eventId || !targetUserId || !["invite", "remove"].includes(action)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "eventId, targetUserId, and action ('invite' | 'remove') are required",
      );
    }

    const userId = context.auth.uid;
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const event = eventSnap.data() as EventDoc;

    if (!isOwnerOrAdmin(event, userId)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the owner or admins can manage invitations",
      );
    }

    if (action === "invite") {
      await eventRef.update({
        invitedUserIds: FieldValue.arrayUnion(targetUserId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await eventRef.update({
        invitedUserIds: FieldValue.arrayRemove(targetUserId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  },
);

/**
 * Manage teams — remove team, remove member, fill with guest, or add guest team.
 * Owner or admin only.
 */
export const manageTeams = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId, action } = data as {
    eventId: string;
    action: string;
  };

  if (!eventId || !action) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId and action are required",
    );
  }

  const userId = context.auth.uid;

  return await db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const event = eventSnap.data() as EventDoc;

    if (!isOwnerOrAdmin(event, userId)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the owner or admins can manage teams",
      );
    }

    const registrations = event.registrations || [];

    if (action === "removeTeam") {
      const { teamId } = data as { teamId: string };
      if (!teamId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "teamId is required",
        );
      }

      const updatedRegistrations = registrations.filter(
        (team) => team.id !== teamId,
      );

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, teamRemoved: true };
    }

    if (action === "removeMember") {
      const { teamId, memberIndex } = data as {
        teamId: string;
        memberIndex: number;
      };

      if (!teamId || typeof memberIndex !== "number") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "teamId and memberIndex are required",
        );
      }

      const teamIdx = registrations.findIndex((team) => team.id === teamId);
      if (teamIdx === -1) {
        throw new functions.https.HttpsError("not-found", "Team not found");
      }

      const team = registrations[teamIdx];

      if (memberIndex < 0 || memberIndex >= team.members.length) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid member index",
        );
      }

      const updatedMembers = [...team.members];
      updatedMembers[memberIndex] = { type: "open" };

      const allOpen = updatedMembers.every((member) => member.type === "open");

      let updatedRegistrations: TeamRegistration[];
      let teamRemoved = false;

      if (allOpen) {
        updatedRegistrations = registrations.filter(
          (_, index) => index !== teamIdx,
        );
        teamRemoved = true;
      } else {
        const updatedTeam = { ...team, members: updatedMembers };
        updatedRegistrations = [...registrations];
        updatedRegistrations[teamIdx] = updatedTeam;
      }

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, teamRemoved };
    }

    if (action === "fillWithGuest") {
      const { teamId, memberIndex, guestName } = data as {
        teamId: string;
        memberIndex: number;
        guestName: string;
      };

      if (
        !teamId ||
        typeof memberIndex !== "number" ||
        typeof guestName !== "string"
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "teamId, memberIndex, and guestName are required",
        );
      }

      const teamIdx = registrations.findIndex((team) => team.id === teamId);
      if (teamIdx === -1) {
        throw new functions.https.HttpsError("not-found", "Team not found");
      }

      const team = registrations[teamIdx];

      if (memberIndex < 0 || memberIndex >= team.members.length) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid member index",
        );
      }

      if (team.members[memberIndex].type !== "open") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This slot is not open",
        );
      }

      const updatedMembers = [...team.members];
      updatedMembers[memberIndex] = {
        type: "guest",
        displayName: guestName.trim() || "Guest",
      };

      const updatedTeam = { ...team, members: updatedMembers };
      const updatedRegistrations = [...registrations];
      updatedRegistrations[teamIdx] = updatedTeam;

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    }

    if (action === "addGuestTeam") {
      const { guestNames } = data as { guestNames: string[] };

      if (!Array.isArray(guestNames)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "guestNames array is required",
        );
      }

      if (guestNames.length !== event.teamSize) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Team must have exactly ${event.teamSize} member(s)`,
        );
      }

      const teamId = generateTeamId();
      const members: TeamMember[] = guestNames.map((name) => ({
        type: "guest" as const,
        displayName: (typeof name === "string" ? name.trim() : "") || "Guest",
      }));

      const newTeam: TeamRegistration = {
        id: teamId,
        createdBy: userId,
        createdAt: admin.firestore.Timestamp.now(),
        members,
      };

      const updatedRegistrations = [...registrations, newTeam];

      transaction.update(eventRef, {
        registrations: updatedRegistrations,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const teamIndex = updatedRegistrations.length - 1;
      const status = teamIndex < event.maxTeams ? "joined" : "waitlisted";

      return { success: true, status, teamId };
    }

    throw new functions.https.HttpsError(
      "invalid-argument",
      `Unknown action: ${action}`,
    );
  });
});

/**
 * Manage admins — add or remove an admin.
 * Owner only.
 */
export const manageAdmins = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId, targetUserId, action } = data as {
    eventId: string;
    targetUserId: string;
    action: "add" | "remove";
  };

  if (!eventId || !targetUserId || !["add", "remove"].includes(action)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId, targetUserId, and action ('add' | 'remove') are required",
    );
  }

  const userId = context.auth.uid;
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Event not found");
  }

  const event = eventSnap.data() as EventDoc;

  // Only the owner can manage admins
  if (event.ownerId !== userId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the event owner can manage admins",
    );
  }

  if (action === "add") {
    await eventRef.update({
      adminIds: FieldValue.arrayUnion(targetUserId),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await eventRef.update({
      adminIds: FieldValue.arrayRemove(targetUserId),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { success: true };
});

/**
 * Cancel an event.
 * Owner only.
 */
export const cancelEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  const { eventId } = data as { eventId: string };
  if (!eventId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventId is required",
    );
  }

  const userId = context.auth.uid;
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Event not found");
  }

  const event = eventSnap.data() as EventDoc;

  if (event.ownerId !== userId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the event owner can cancel the event",
    );
  }

  await eventRef.update({
    status: "canceled",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
