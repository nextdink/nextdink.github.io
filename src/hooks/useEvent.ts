import { useState, useEffect, useCallback } from "react";
import { eventService } from "@/services/eventService";
import { userService } from "@/services/userService";
import type { Event, TeamMember, RegisterTeamData } from "@/types/event.types";
import type { UserProfile } from "@/types";
import {
  getJoinedTeams,
  getWaitlistedTeams,
  isUserInEvent,
  getUserTeam,
  isTeamCaptain,
} from "@/types/event.types";

interface UseEventResult {
  event: Event | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  // Computed properties
  joinedRegistrations: Event["registrations"];
  waitlistedRegistrations: Event["registrations"];
  isUserRegistered: boolean;
  userRegistration: Event["registrations"][0] | undefined;
  isUserCaptain: boolean;
  isUserInvited: boolean;
  // Invited users (not yet joined)
  invitedUsers: UserProfile[];
  isLoadingInvitedUsers: boolean;
  // Declined users
  declinedUsers: UserProfile[];
  isLoadingDeclinedUsers: boolean;
  // Actions
  registerTeam: (
    members: TeamMember[],
  ) => Promise<{ status: "joined" | "waitlisted" }>;
  addGuestTeam: (
    guestNames: string[],
  ) => Promise<{ status: "joined" | "waitlisted" }>;
  leaveEvent: () => Promise<void>;
  claimSlot: (
    teamId: string,
    memberIndex: number,
  ) => Promise<{ status: "joined" | "waitlisted" }>;
  declineInvitation: () => Promise<void>;
  deleteEvent: () => Promise<void>;
  isRegistering: boolean;
  isAddingGuestTeam: boolean;
  isLeaving: boolean;
  isClaiming: boolean;
  isDeclining: boolean;
  isDeleting: boolean;
}

export function useEvent(
  eventCode: string | undefined,
  userId: string | undefined,
  userDisplayName?: string,
  userPhotoUrl?: string | null,
): UseEventResult {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAddingGuestTeam, setIsAddingGuestTeam] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<UserProfile[]>([]);
  const [isLoadingInvitedUsers, setIsLoadingInvitedUsers] = useState(false);
  const [declinedUsers, setDeclinedUsers] = useState<UserProfile[]>([]);
  const [isLoadingDeclinedUsers, setIsLoadingDeclinedUsers] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventCode) {
      setEvent(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedEvent = await eventService.getByCode(eventCode);
      setEvent(fetchedEvent);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch event"));
    } finally {
      setIsLoading(false);
    }
  }, [eventCode]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Fetch invited users when event changes
  useEffect(() => {
    const fetchInvitedUsers = async () => {
      if (!event || event.invitedUserIds.length === 0) {
        setInvitedUsers([]);
        return;
      }

      // Get all user IDs who are already registered in the event
      const registeredUserIds = new Set<string>();
      event.registrations.forEach((reg) => {
        reg.members.forEach((member) => {
          if (member.type === "user" && member.userId) {
            registeredUserIds.add(member.userId);
          }
        });
      });

      // Filter out users who have already joined
      const pendingInvitedIds = event.invitedUserIds.filter(
        (id) => !registeredUserIds.has(id),
      );

      if (pendingInvitedIds.length === 0) {
        setInvitedUsers([]);
        return;
      }

      setIsLoadingInvitedUsers(true);
      try {
        const users = await userService.getByIds(pendingInvitedIds);
        setInvitedUsers(users);
      } catch (err) {
        console.error("Failed to fetch invited users:", err);
        setInvitedUsers([]);
      } finally {
        setIsLoadingInvitedUsers(false);
      }
    };

    fetchInvitedUsers();
  }, [event]);

  // Fetch declined users when event changes
  useEffect(() => {
    const fetchDeclinedUsers = async () => {
      if (!event || event.declinedUserIds.length === 0) {
        setDeclinedUsers([]);
        return;
      }

      setIsLoadingDeclinedUsers(true);
      try {
        const users = await userService.getByIds(event.declinedUserIds);
        setDeclinedUsers(users);
      } catch (err) {
        console.error("Failed to fetch declined users:", err);
        setDeclinedUsers([]);
      } finally {
        setIsLoadingDeclinedUsers(false);
      }
    };

    fetchDeclinedUsers();
  }, [event]);

  // Computed values
  const joinedRegistrations = event ? getJoinedTeams(event) : [];
  const waitlistedRegistrations = event ? getWaitlistedTeams(event) : [];
  const isUserRegistered =
    event && userId ? isUserInEvent(event, userId) : false;
  const userRegistration =
    event && userId ? getUserTeam(event, userId) : undefined;
  const isUserCaptain =
    userRegistration && userId
      ? isTeamCaptain(userRegistration, userId)
      : false;
  const isUserInvited =
    event && userId
      ? event.invitedUserIds.includes(userId) && !isUserRegistered
      : false;

  // Register a new team
  const registerTeam = useCallback(
    async (members: TeamMember[]) => {
      if (!event || !userId || !userDisplayName) {
        throw new Error("Not authenticated");
      }

      setIsRegistering(true);
      try {
        const teamData: RegisterTeamData = { members };
        const result = await eventService.registerTeam(
          event.id,
          userId,
          userDisplayName,
          userPhotoUrl ?? null,
          teamData,
        );
        await fetchEvent(); // Refresh event data
        return result;
      } finally {
        setIsRegistering(false);
      }
    },
    [event, userId, userDisplayName, userPhotoUrl, fetchEvent],
  );

  // Leave the event
  const leaveEvent = useCallback(async () => {
    if (!event || !userId) {
      throw new Error("Not authenticated");
    }

    setIsLeaving(true);
    try {
      await eventService.leaveTeam(event.id, userId);
      await fetchEvent(); // Refresh event data
    } finally {
      setIsLeaving(false);
    }
  }, [event, userId, fetchEvent]);

  // Claim a slot in an existing team
  const claimSlot = useCallback(
    async (teamId: string, memberIndex: number) => {
      if (!event || !userId || !userDisplayName) {
        throw new Error("Not authenticated");
      }

      setIsClaiming(true);
      try {
        const result = await eventService.claimSlot(
          event.id,
          teamId,
          memberIndex,
          userId,
          userDisplayName,
          userPhotoUrl ?? null,
        );
        await fetchEvent(); // Refresh event data
        return result;
      } finally {
        setIsClaiming(false);
      }
    },
    [event, userId, userDisplayName, userPhotoUrl, fetchEvent],
  );

  // Add a guest team (owner/admin only)
  const addGuestTeam = useCallback(
    async (guestNames: string[]) => {
      if (!event || !userId) {
        throw new Error("Not authenticated");
      }

      setIsAddingGuestTeam(true);
      try {
        const result = await eventService.addGuestTeam(
          event.id,
          userId,
          guestNames,
        );
        await fetchEvent(); // Refresh event data
        return result;
      } finally {
        setIsAddingGuestTeam(false);
      }
    },
    [event, userId, fetchEvent],
  );

  // Delete the event (owner only)
  const deleteEvent = useCallback(async () => {
    if (!event || !userId) {
      throw new Error("Not authenticated");
    }

    setIsDeleting(true);
    try {
      await eventService.delete(event.id);
      // Don't refetch - event is deleted
    } finally {
      setIsDeleting(false);
    }
  }, [event, userId]);

  // Decline invitation (user action)
  const declineInvitation = useCallback(async () => {
    if (!event || !userId) {
      throw new Error("Not authenticated");
    }

    setIsDeclining(true);
    try {
      await eventService.declineInvitation(event.id, userId);
      await fetchEvent(); // Refresh event data
    } finally {
      setIsDeclining(false);
    }
  }, [event, userId, fetchEvent]);

  return {
    event,
    isLoading,
    error,
    refetch: fetchEvent,
    joinedRegistrations,
    waitlistedRegistrations,
    isUserRegistered,
    userRegistration,
    isUserCaptain,
    isUserInvited,
    invitedUsers,
    isLoadingInvitedUsers,
    declinedUsers,
    isLoadingDeclinedUsers,
    registerTeam,
    addGuestTeam,
    leaveEvent,
    claimSlot,
    declineInvitation,
    deleteEvent,
    isRegistering,
    isAddingGuestTeam,
    isLeaving,
    isClaiming,
    isDeclining,
    isDeleting,
  };
}
