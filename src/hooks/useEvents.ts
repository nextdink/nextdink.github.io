import { useState, useEffect, useCallback, useMemo } from "react";
import { eventService } from "@/services/eventService";
import type { Event } from "@/types/event.types";

// User's relationship/status with an event
export type UserEventStatus =
  | "owner"
  | "admin"
  | "going"
  | "waitlisted"
  | "invited"
  | "declined";

// Registration status (separate from role)
export type UserRegistrationStatus = "going" | "waitlisted" | "not_registered";

export interface EventWithStatus {
  event: Event;
  status: UserEventStatus; // Primary status (owner > admin > going > waitlisted)
  registrationStatus?: UserRegistrationStatus; // If owner/admin, also show if they joined
  waitlistPosition?: number; // Only for waitlisted events
}

interface UseEventsResult {
  // Schedule tab: Events user is committed to (owner, admin, going, waitlisted)
  scheduleEvents: EventWithStatus[];
  // Invites tab: Pending invitations
  invitedEvents: EventWithStatus[];
  // Invites tab (bottom): Declined events
  declinedEvents: EventWithStatus[];
  // Counts for badges
  inviteCount: number;
  // Loading state
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Get user's registration status for an event (whether they're in a team)
 */
function getRegistrationStatus(
  event: Event,
  userId: string,
): { status: UserRegistrationStatus; waitlistPosition?: number } {
  const registrationIndex = event.registrations.findIndex((team) =>
    team.members.some(
      (member) => member.type === "user" && member.userId === userId,
    ),
  );

  if (registrationIndex === -1) {
    return { status: "not_registered" };
  }

  if (registrationIndex < event.maxTeams) {
    return { status: "going" };
  }

  return {
    status: "waitlisted",
    waitlistPosition: registrationIndex - event.maxTeams + 1,
  };
}

/**
 * Get user's status for an event
 */
function getUserStatusForEvent(
  event: Event,
  userId: string,
): {
  status: UserEventStatus;
  registrationStatus?: UserRegistrationStatus;
  waitlistPosition?: number;
} | null {
  const regStatus = getRegistrationStatus(event, userId);

  // Check if owner
  if (event.ownerId === userId) {
    return {
      status: "owner",
      registrationStatus:
        regStatus.status !== "not_registered" ? regStatus.status : undefined,
      waitlistPosition: regStatus.waitlistPosition,
    };
  }

  // Check if admin
  if (event.adminIds.includes(userId)) {
    return {
      status: "admin",
      registrationStatus:
        regStatus.status !== "not_registered" ? regStatus.status : undefined,
      waitlistPosition: regStatus.waitlistPosition,
    };
  }

  // Check if in a registration (going or waitlisted)
  if (regStatus.status !== "not_registered") {
    return {
      status: regStatus.status,
      waitlistPosition: regStatus.waitlistPosition,
    };
  }

  // Check if invited
  if (event.invitedUserIds.includes(userId)) {
    return { status: "invited" };
  }

  // Check if declined
  if (event.declinedUserIds.includes(userId)) {
    return { status: "declined" };
  }

  return null;
}

export function useEvents(userId: string | undefined): UseEventsResult {
  const [ownedEvents, setOwnedEvents] = useState<Event[]>([]);
  const [adminEvents, setAdminEvents] = useState<Event[]>([]);
  const [participantEvents, setParticipantEvents] = useState<Event[]>([]);
  const [invitedEvents, setInvitedEvents] = useState<Event[]>([]);
  const [declinedEvents, setDeclinedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!userId) {
      setOwnedEvents([]);
      setAdminEvents([]);
      setParticipantEvents([]);
      setInvitedEvents([]);
      setDeclinedEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all event types in parallel
      const [owned, admin, participant, invited, declined] = await Promise.all([
        eventService.getByOwner(userId),
        eventService.getByAdmin(userId),
        eventService.getByParticipant(userId),
        eventService.getByInvitedUser(userId),
        eventService.getByDeclinedUser(userId),
      ]);

      setOwnedEvents(owned);
      setAdminEvents(admin);
      setParticipantEvents(participant);
      setInvitedEvents(invited);
      setDeclinedEvents(declined);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch events"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Compute schedule events (deduplicated, with status)
  const scheduleEvents = useMemo(() => {
    if (!userId) return [];

    const now = new Date();
    const eventMap = new Map<string, EventWithStatus>();

    // Helper to add event with status (only future active events)
    const addEvent = (event: Event) => {
      if (event.status !== "active" || event.date < now) return;
      if (eventMap.has(event.id)) return; // Already added

      const statusInfo = getUserStatusForEvent(event, userId);
      if (
        statusInfo &&
        ["owner", "admin", "going", "waitlisted"].includes(statusInfo.status)
      ) {
        eventMap.set(event.id, {
          event,
          status: statusInfo.status,
          registrationStatus: statusInfo.registrationStatus,
          waitlistPosition: statusInfo.waitlistPosition,
        });
      }
    };

    // Add all events (order matters for priority if somehow duplicated)
    ownedEvents.forEach(addEvent);
    adminEvents.forEach(addEvent);
    participantEvents.forEach(addEvent);

    // Convert to array and sort by date
    return Array.from(eventMap.values()).sort(
      (a, b) => a.event.date.getTime() - b.event.date.getTime(),
    );
  }, [userId, ownedEvents, adminEvents, participantEvents]);

  // Compute invited events (with status)
  const invitedEventsWithStatus = useMemo(() => {
    if (!userId) return [];

    const now = new Date();
    return invitedEvents
      .filter((event) => event.status === "active" && event.date >= now)
      .map((event) => ({
        event,
        status: "invited" as UserEventStatus,
      }))
      .sort((a, b) => a.event.date.getTime() - b.event.date.getTime());
  }, [userId, invitedEvents]);

  // Compute declined events (with status)
  const declinedEventsWithStatus = useMemo(() => {
    if (!userId) return [];

    const now = new Date();
    return declinedEvents
      .filter((event) => event.status === "active" && event.date >= now)
      .map((event) => ({
        event,
        status: "declined" as UserEventStatus,
      }))
      .sort((a, b) => a.event.date.getTime() - b.event.date.getTime());
  }, [userId, declinedEvents]);

  return {
    scheduleEvents,
    invitedEvents: invitedEventsWithStatus,
    declinedEvents: declinedEventsWithStatus,
    inviteCount: invitedEventsWithStatus.length,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}
