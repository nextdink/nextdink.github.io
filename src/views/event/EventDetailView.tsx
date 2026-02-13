import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Share, 
  Edit, 
  XCircle,
  UserPlus,
  Mail,
} from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CapacityBar } from '@/components/ui/CapacityBar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { RegistrationCard } from '@/components/common/RegistrationCard';
import { TeamRegistrationModal } from '@/components/common/TeamRegistrationModal';
import { ClaimSlotModal } from '@/components/common/ClaimSlotModal';
import { InvitePlayersModal } from '@/components/common/InvitePlayersModal';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvent';
import { 
  getTotalCapacity, 
  getClaimableSpotsCount,
  isTeamCaptain,
} from '@/types/event.types';
import type { TeamMember } from '@/types/event.types';
import { ROUTES } from '@/config/routes';

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
    invitedUsers,
    isLoadingInvitedUsers,
    registerTeam,
    leaveEvent,
    claimSlot,
    isRegistering,
    isClaiming,
  } = useEvent(eventCode, user?.uid, user?.displayName || undefined, user?.photoURL);

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
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
            label: 'Go Home',
            onClick: () => navigate(ROUTES.HOME),
          }}
        />
      </PageLayout>
    );
  }

  // Permissions
  const isOwner = user?.uid === event.ownerId;
  const isAdmin = event.adminIds.includes(user?.uid || '');
  const canManage = isOwner || isAdmin;

  // Capacity calculations
  const totalCapacity = getTotalCapacity(event);
  const joinedCount = event.teamSize === 1 
    ? joinedRegistrations.length
    : joinedRegistrations.reduce((sum, reg) => 
        sum + reg.members.filter(m => m.type === 'user').length, 0
      );
  const maxCount = event.teamSize === 1 ? event.maxTeams : totalCapacity;
  const claimableSpots = getClaimableSpotsCount(event);
  const hasCapacity = joinedRegistrations.length < event.maxTeams;

  // Join handler
  const handleJoin = async () => {
    if (!user) {
      // TODO: Show auth modal
      navigate(ROUTES.LOGIN);
      return;
    }

    if (event.teamSize === 1) {
      // Individual signup - instant join
      try {
        const members: TeamMember[] = [{ type: 'user' }];
        await registerTeam(members);
      } catch (err) {
        console.error('Failed to join:', err);
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
      console.error('Failed to register:', err);
      throw err;
    }
  };

  // Leave handler
  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave this event?')) {
      try {
        await leaveEvent();
      } catch (err) {
        console.error('Failed to leave:', err);
      }
    }
  };

  // Claim slot handler
  const handleClaimSlot = (teamId: string, memberIndex: number, slot: TeamMember, captainName: string) => {
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
      console.error('Failed to claim slot:', err);
      throw err;
    }
  };

  // Share handler
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Join ${event.name} on ${format(event.date, 'MMM d')}`,
          url,
        });
      } catch {
        // User canceled or share failed
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  // Open maps
  const openMaps = () => {
    const query = encodeURIComponent(`${event.venueName}, ${event.formattedAddress}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  return (
    <PageLayout showBack showBottomNav={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {event.name}
            </h1>
            <Badge variant={event.status === 'active' ? 'success' : 'error'}>
              {event.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organized by {isOwner ? 'you' : 'someone'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {!isUserRegistered && (
            <Button onClick={handleJoin} className="flex-1" loading={isRegistering}>
              <UserPlus className="w-4 h-4" />
              {hasCapacity ? 'Join Event' : 'Join Waitlist'}
            </Button>
          )}
          {canManage && (
            <Button variant="secondary" onClick={() => setShowInviteModal(true)}>
              <Mail className="w-4 h-4" />
            </Button>
          )}
          <Button variant="secondary" onClick={handleShare}>
            <Share className="w-4 h-4" />
          </Button>
          {canManage && (
            <Button variant="secondary" onClick={() => navigate(`/event/${eventCode}/edit`)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
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
                {format(event.date, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {format(event.date, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <CapacityBar current={joinedCount} max={maxCount} showText={false} />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {joinedCount} / {maxCount} spots filled
                  {claimableSpots > 0 && (
                    <span className="text-primary-600 dark:text-primary-400">
                      {' '}• {claimableSpots} open slot{claimableSpots !== 1 ? 's' : ''}
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
            {event.teamSize === 1 ? 'Roster' : 'Teams'}
            {' '}
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
                  isCurrentUserCaptain={user ? isTeamCaptain(registration, user.uid) : false}
                  isCurrentUserInTeam={registration.members.some(
                    m => m.type === 'user' && m.userId === user?.uid
                  )}
                  canClaimSlot={!!user && !isUserRegistered}
                  onClaimSlot={(memberIndex, slot) => {
                    const captain = registration.members[0];
                    handleClaimSlot(
                      registration.id, 
                      memberIndex, 
                      slot, 
                      captain?.displayName || 'Unknown'
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

        {/* Waitlist */}
        {waitlistedRegistrations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Waitlist
              {' '}
              <span className="text-sm font-normal text-slate-500">
                ({waitlistedRegistrations.length})
              </span>
            </h2>
            <div className="space-y-3">
              {waitlistedRegistrations.map((registration, index) => (
                <RegistrationCard
                  key={registration.id}
                  registration={registration}
                  teamSize={event.teamSize}
                  isCurrentUserCaptain={user ? isTeamCaptain(registration, user.uid) : false}
                  isCurrentUserInTeam={registration.members.some(
                    m => m.type === 'user' && m.userId === user?.uid
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
          </section>
        )}

        {/* Invited Players (visible to owner/admins) */}
        {canManage && (invitedUsers.length > 0 || isLoadingInvitedUsers) && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Invited
              {' '}
              <span className="text-sm font-normal text-slate-500">
                ({invitedUsers.length} pending)
              </span>
            </h2>
            {isLoadingInvitedUsers ? (
              <Card>
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              </Card>
            ) : (
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
            )}
          </section>
        )}
      </div>

      {/* Team Registration Modal */}
      <TeamRegistrationModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSubmit={handleRegisterTeam}
        teamSize={event.teamSize}
        currentUserName={user?.displayName || 'You'}
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
    </PageLayout>
  );
}