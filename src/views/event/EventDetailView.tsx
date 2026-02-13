import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share,
  Edit,
  XCircle,
  UserPlus,
  UserRoundPlus,
  Trash2,
  Copy,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { RegistrationCard } from "@/components/common/RegistrationCard";
import { TeamRegistrationModal } from "@/components/common/TeamRegistrationModal";
import { ClaimSlotModal } from "@/components/common/ClaimSlotModal";
import { InvitePlayersModal } from "@/components/common/InvitePlayersModal";
import { AddGuestTeamModal } from "@/components/common/AddGuestTeamModal";
import { useAuth } from "@/hooks/useAuth";
import { useEvent } from "@/hooks/useEvent";
import {
  getTotalCapacity,
  getClaimableSpotsCount,
  isTeamCaptain,
} from "@/types/event.types";
import type { TeamMember } from "@/types/event.types";
import { ROUTES, getEditEventRoute } from "@/config/routes";

export function EventDetailView() {
  const { eventCode } = useParams<{ eventCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    event,
    isLoading,
    error,
    refetch,
    joinedRegistrations,
    waitlistedRegistrations,
    isUserRegistered,
    isUserInvited,
    invitedUsers,
    isLoadingInvitedUsers,
    declinedUsers,
    isLoadingDeclinedUsers,
    registerTeam,
    addGuestTeam,
    leaveEvent,
    declineEvent,
    claimSlot,
    declineInvitation,
    deleteEvent,
    isRegistering,
    isAddingGuestTeam,
    isClaiming,
    isDeclining,
    isDecliningEvent,
    isDeleting,
  } = useEvent(
    eventCode,
    user?.uid,
    user?.displayName || undefined,
    user?.photoURL,
  );

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);

  // Tab for secondary lists (Invited / Waitlist / Declined)
  type SecondaryTab = "invited" | "waitlist" | "declined";
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>("invited");
  const [selectedSlot, setSelectedSlot] = useState<{
    teamId: string;
    memberIndex: number;
    slot: TeamMember;
    captainName: string;
  } | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <PageLayout showBack>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <PageLayout showBack>
        <EmptyState
          icon={XCircle}
          title="Event not found"
          description="This event may have been canceled or doesn't exist."
          action={{
            label: "Go Home",
            onClick: () => navigate(ROUTES.HOME),
          }}
        />
      </PageLayout>
    );
  }

  // Permissions
  const isOwner = user?.uid === event.ownerId;
  const isAdmin = event.adminIds.includes(user?.uid || "");
  const canManage = isOwner || isAdmin;

  // Capacity calculations
  const totalCapacity = getTotalCapacity(event);
  const joinedCount =
    event.teamSize === 1
      ? joinedRegistrations.length
      : joinedRegistrations.reduce(
          (sum, reg) =>
            sum + reg.members.filter((m) => m.type === "user").length,
          0,
        );
  const maxCount = event.teamSize === 1 ? event.maxTeams : totalCapacity;
  const claimableSpots = getClaimableSpotsCount(event);
  const hasCapacity = joinedRegistrations.length < event.maxTeams;

  // Join handler
  const handleJoin = async () => {
    if (!user) {
      // Redirect to login with return URL (don't auto-join after auth)
      const returnUrl = encodeURIComponent(
        window.location.pathname + window.location.hash,
      );
      navigate(`${ROUTES.LOGIN}?redirect=${returnUrl}`);
      return;
    }

    if (event.teamSize === 1) {
      // Individual signup - instant join
      try {
        const members: TeamMember[] = [{ type: "user" }];
        await registerTeam(members);
      } catch (err) {
        console.error("Failed to join:", err);
      }
    } else {
      // Group signup - show modal
      setShowRegisterModal(true);
    }
  };

  // Register team handler
  const handleRegisterTeam = async (members: TeamMember[]) => {
    try {
      await registerTeam(members);
      setShowRegisterModal(false);
    } catch (err) {
      console.error("Failed to register:", err);
      throw err;
    }
  };

  // Decline handler (removes registration and adds to declined list)
  const handleDecline = async () => {
    if (
      confirm(
        "Are you sure you want to decline this event? You will be removed from the roster and added to the declined list.",
      )
    ) {
      try {
        await declineEvent();
      } catch (err) {
        console.error("Failed to decline:", err);
      }
    }
  };

  // Leave handler (for RegistrationCard - just removes without declining)
  const handleLeave = async () => {
    if (confirm("Are you sure you want to leave this event?")) {
      try {
        await leaveEvent();
      } catch (err) {
        console.error("Failed to leave:", err);
      }
    }
  };

  // Claim slot handler
  const handleClaimSlot = (
    teamId: string,
    memberIndex: number,
    slot: TeamMember,
    captainName: string,
  ) => {
    setSelectedSlot({ teamId, memberIndex, slot, captainName });
    setShowClaimModal(true);
  };

  // Confirm claim handler
  const handleConfirmClaim = async () => {
    if (!selectedSlot) return;
    try {
      await claimSlot(selectedSlot.teamId, selectedSlot.memberIndex);
      setShowClaimModal(false);
      setSelectedSlot(null);
    } catch (err) {
      console.error("Failed to claim slot:", err);
      throw err;
    }
  };

  // Share handler
  const handleShare = async () => {
    const url = window.location.href;
    const dateStr = format(event.date, "EEEE, MMM d");
    const timeStr = format(event.date, "h:mm a");
    const shareText = `Next Dink invite: ${event.name} on ${dateStr} at ${timeStr}. Event code: ${event.eventCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: shareText,
          url,
        });
      } catch {
        // User canceled or share failed
      }
    } else {
      // Fallback to clipboard - include URL in the text
      const clipboardText = `${shareText}\n${url}`;
      await navigator.clipboard.writeText(clipboardText);
      alert("Link copied to clipboard!");
    }
  };

  // Open maps
  const openMaps = () => {
    const query = encodeURIComponent(
      `${event.venueName}, ${event.formattedAddress}`,
    );
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, "_blank");
  };

  // Delete event handler (owner only)
  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this event? This action cannot be undone.",
      )
    ) {
      try {
        await deleteEvent();
        navigate(ROUTES.HOME);
      } catch (err) {
        console.error("Failed to delete event:", err);
      }
    }
  };

  // Check if user has declined this event
  const hasDeclined = user?.uid && event.declinedUserIds.includes(user.uid);

  // Build menu items for admin dropdown
  const menuItems = canManage
    ? [
        {
          label: "Edit Event",
          icon: <Edit className="w-4 h-4" />,
          onClick: () => eventCode && navigate(getEditEventRoute(eventCode)),
        },
        {
          label: "Invite Players",
          icon: <UserPlus className="w-4 h-4" />,
          onClick: () => setShowInviteModal(true),
        },
        {
          label: "Add Guest Team",
          icon: <UserRoundPlus className="w-4 h-4" />,
          onClick: () => setShowAddGuestModal(true),
        },
        ...(isOwner
          ? [
              {
                label: "Delete Event",
                icon: <Trash2 className="w-4 h-4" />,
                onClick: handleDelete,
                variant: "danger" as const,
              },
            ]
          : []),
      ]
    : [];

  return (
    <PageLayout showBack showBottomNav={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {event.name}
            </h1>
            <Badge variant={event.status === "active" ? "success" : "error"}>
              {event.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Organized by {isOwner ? "you" : "someone"}</span>
            <span>•</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(event.eventCode);
                alert("Event code copied!");
              }}
              className="inline-flex items-center gap-1 font-mono text-primary-600 dark:text-primary-400 hover:underline"
            >
              {event.eventCode}
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Show Join button if not registered */}
          {!isUserRegistered && (
            <Button
              onClick={handleJoin}
              className="flex-1"
              loading={isRegistering}
            >
              {hasCapacity ? "Join Event" : "Join Waitlist"}
            </Button>
          )}

          {/* Show Decline button if not registered and not already declined */}
          {!isUserRegistered && !hasDeclined && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (confirm("Are you sure you want to decline this event?")) {
                  try {
                    await declineInvitation();
                  } catch (err) {
                    console.error("Failed to decline:", err);
                  }
                }
              }}
              loading={isDeclining}
            >
              Decline
            </Button>
          )}

          {/* Show Decline button if already registered (to leave) */}
          {isUserRegistered && (
            <Button
              variant="secondary"
              onClick={handleDecline}
              className="flex-1"
              loading={isDecliningEvent}
            >
              Decline
            </Button>
          )}

          {/* Share button */}
          <Button
            variant="secondary"
            onClick={handleShare}
            aria-label="Share event"
          >
            <Share className="w-4 h-4" />
          </Button>

          {/* Menu button for admins/owners */}
          {canManage && <DropdownMenu items={menuItems} />}
        </div>

        {/* Event Details Card */}
        <Card>
          <div className="space-y-3">
            <div
              className="flex items-center gap-3 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
              onClick={openMaps}
            >
              <MapPin className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {event.venueName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {event.formattedAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {format(event.date, "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {format(event.date, "h:mm a")} -{" "}
                {format(event.endTime, "h:mm a")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <CapacityBar
                  current={joinedCount}
                  max={maxCount}
                  showText={false}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {joinedCount} / {maxCount} spots filled
                  {claimableSpots > 0 && (
                    <span className="text-primary-600 dark:text-primary-400">
                      {" "}
                      • {claimableSpots} open slot
                      {claimableSpots !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Description */}
        {event.description && (
          <Card>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Description
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {event.description}
            </p>
          </Card>
        )}

        {/* Teams / Roster */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            {event.teamSize === 1 ? "Roster" : "Teams"}{" "}
            <span className="text-sm font-normal text-slate-500">
              ({joinedRegistrations.length}/{event.maxTeams})
            </span>
          </h2>

          {joinedRegistrations.length > 0 ? (
            <div className="space-y-3">
              {joinedRegistrations.map((registration) => (
                <RegistrationCard
                  key={registration.id}
                  registration={registration}
                  teamSize={event.teamSize}
                  isCurrentUserCaptain={
                    user ? isTeamCaptain(registration, user.uid) : false
                  }
                  isCurrentUserInTeam={registration.members.some(
                    (m) => m.type === "user" && m.userId === user?.uid,
                  )}
                  canClaimSlot={!!user && !isUserRegistered}
                  onClaimSlot={(memberIndex, slot) => {
                    const captain = registration.members[0];
                    handleClaimSlot(
                      registration.id,
                      memberIndex,
                      slot,
                      captain?.displayName || "Unknown",
                    );
                  }}
                  onLeaveTeam={
                    user && isTeamCaptain(registration, user.uid)
                      ? handleLeave
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No one has joined yet. Be the first!
              </p>
            </Card>
          )}
        </section>

        {/* Invitation Response - shown when user is invited but not registered */}
        {isUserInvited && (
          <section>
            <Card className="bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    You're invited!
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Would you like to join this event?
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={async () => {
                      if (
                        confirm(
                          "Are you sure you want to decline this invitation?",
                        )
                      ) {
                        await declineInvitation();
                      }
                    }}
                    loading={isDeclining}
                  >
                    Decline
                  </Button>
                  <Button
                    size="small"
                    onClick={handleJoin}
                    loading={isRegistering}
                  >
                    Accept & Join
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* Secondary Tab Section (Invited / Waitlist / Declined) */}
        <section>
          {/* Tab Buttons */}
          <div className="flex gap-1 mb-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setSecondaryTab("invited")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                secondaryTab === "invited"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Invited ({invitedUsers.length})
            </button>
            <button
              onClick={() => setSecondaryTab("waitlist")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                secondaryTab === "waitlist"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Waitlist ({waitlistedRegistrations.length})
            </button>
            <button
              onClick={() => setSecondaryTab("declined")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                secondaryTab === "declined"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Declined ({declinedUsers.length})
            </button>
          </div>

          {/* Tab Content */}
          {secondaryTab === "invited" &&
            (isLoadingInvitedUsers ? (
              <Card>
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              </Card>
            ) : invitedUsers.length > 0 ? (
              <Card>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invitedUsers.map((invitedUser) => (
                    <div
                      key={invitedUser.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      {invitedUser.photoUrl ? (
                        <img
                          src={invitedUser.photoUrl}
                          alt={invitedUser.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {invitedUser.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {invitedUser.displayName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Invitation pending
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No pending invitations
                </p>
              </Card>
            ))}

          {secondaryTab === "waitlist" &&
            (waitlistedRegistrations.length > 0 ? (
              <div className="space-y-3">
                {waitlistedRegistrations.map((registration, index) => (
                  <RegistrationCard
                    key={registration.id}
                    registration={registration}
                    teamSize={event.teamSize}
                    isCurrentUserCaptain={
                      user ? isTeamCaptain(registration, user.uid) : false
                    }
                    isCurrentUserInTeam={registration.members.some(
                      (m) => m.type === "user" && m.userId === user?.uid,
                    )}
                    canClaimSlot={false}
                    waitlistPosition={index + 1}
                    onLeaveTeam={
                      user && isTeamCaptain(registration, user.uid)
                        ? handleLeave
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <Card>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No one on the waitlist
                </p>
              </Card>
            ))}

          {secondaryTab === "declined" &&
            (isLoadingDeclinedUsers ? (
              <Card>
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              </Card>
            ) : declinedUsers.length > 0 ? (
              <Card>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {declinedUsers.map((declinedUser) => (
                    <div
                      key={declinedUser.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      {declinedUser.photoUrl ? (
                        <img
                          src={declinedUser.photoUrl}
                          alt={declinedUser.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {declinedUser.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {declinedUser.displayName}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400">
                          Declined invitation
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No declined invitations
                </p>
              </Card>
            ))}
        </section>

        {/* Danger Zone - Delete Event (owner only) */}
        {isOwner && (
          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
              Danger Zone
            </h2>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Delete Event
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Permanently delete this event and all registrations
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  loading={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </Card>
          </section>
        )}
      </div>

      {/* Team Registration Modal */}
      <TeamRegistrationModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSubmit={handleRegisterTeam}
        teamSize={event.teamSize}
        currentUserName={user?.displayName || "You"}
        currentUserPhoto={user?.photoURL || null}
        isLoading={isRegistering}
      />

      {/* Claim Slot Modal */}
      {selectedSlot && (
        <ClaimSlotModal
          isOpen={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            setSelectedSlot(null);
          }}
          onConfirm={handleConfirmClaim}
          slotIndex={selectedSlot.memberIndex}
          slot={selectedSlot.slot}
          captainName={selectedSlot.captainName}
          isLoading={isClaiming}
        />
      )}

      {/* Invite Players Modal */}
      <InvitePlayersModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        eventId={event.id}
        invitedUserIds={event.invitedUserIds}
        onInviteSuccess={refetch}
      />

      {/* Add Guest Team Modal */}
      <AddGuestTeamModal
        isOpen={showAddGuestModal}
        onClose={() => setShowAddGuestModal(false)}
        onSubmit={async (guestNames) => {
          await addGuestTeam(guestNames);
          setShowAddGuestModal(false);
        }}
        teamSize={event.teamSize}
        isLoading={isAddingGuestTeam}
      />
    </PageLayout>
  );
}
