import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ExternalLink, UserPlus, Search, X, Share2, Trash2, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CapacityBar } from '@/components/ui/CapacityBar';
import { StatusBadge, RoleBadge, ParticipantStatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { AuthGateModal } from '@/components/ui/AuthGateModal';
import { AddToCalendarModal } from '@/components/ui/AddToCalendarModal';
import type { CalendarEvent } from '@/utils/calendarUtils';
import { useEvent } from '@/hooks/useEvent';
import { useAuth } from '@/hooks/useAuth';
import { useAuthGateWithMessage } from '@/hooks/useAuthGate';
import { eventService } from '@/services/eventService';
import { userService } from '@/services/userService';
import { ROUTES } from '@/config/routes';
import type { EventParticipant } from '@/types/event.types';
import type { UserProfile } from '@/types/user.types';

export function EventDetailView() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { event, participants, isLoading, error, refetch } = useEvent(eventId);
  
  // Auth gate for protected actions
  const {
    requireAuth,
    isAuthModalOpen,
    closeAuthModal,
    onAuthSuccess,
    modalTitle,
    modalMessage,
  } = useAuthGateWithMessage();
  
  // Modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  // Check user's participation status (handle unauthenticated users)
  const userParticipant = user ? participants.find(p => p.id === user.uid) : null;
  const isOwner = user ? event?.ownerId === user.uid : false;
  const isAdmin = user ? event?.adminIds?.includes(user.uid) : false;
  const canManage = isOwner || isAdmin;
  const isJoined = userParticipant?.status === 'joined';
  const isWaitlisted = userParticipant?.status === 'waitlisted';
  const isInvited = userParticipant?.status === 'invited_pending';

  // Group participants by status
  const joinedParticipants = participants.filter(p => p.status === 'joined');
  const invitedParticipants = participants.filter(p => p.status === 'invited_pending');
  const waitlistedParticipants = participants
    .filter(p => p.status === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));
  const declinedParticipants = participants.filter(p => p.status === 'declined');

  // Action to join - wrapped with auth gate
  const handleJoin = () => {
    requireAuth(
      async () => {
        if (!eventId || !user) return;
        try {
          await eventService.joinEvent(eventId, user.uid);
          refetch();
          // Show calendar prompt after successful join
          setShowCalendarModal(true);
        } catch (err) {
          console.error('Failed to join event:', err);
        }
      },
      'Sign in to join',
      'Create an account or sign in to join this event and get updates.'
    );
  };

  // Create calendar event data from event details
  const getCalendarEvent = (): CalendarEvent | null => {
    if (!event) return null;
    return {
      title: event.name,
      description: event.description,
      location: `${event.venueName}, ${event.formattedAddress}`,
      startDate: event.date,
      endDate: event.endTime,
    };
  };

  // Action to leave - wrapped with auth gate
  const handleLeave = () => {
    requireAuth(
      async () => {
        if (!eventId || !user) return;
        try {
          await eventService.leaveEvent(eventId, user.uid);
          refetch();
        } catch (err) {
          console.error('Failed to leave event:', err);
        }
      },
      'Sign in required',
      'You need to be signed in to leave this event.'
    );
  };

  const handleOpenMaps = () => {
    if (!event) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${event.venueName}, ${event.formattedAddress}`
    )}`;
    window.open(url, '_blank');
  };

  // Share event using native share API
  const handleShare = async () => {
    if (!event) return;
    
    const eventUrl = window.location.href;
    const shareData = {
      title: event.name,
      text: `Join me for ${event.name} on ${format(event.date, 'EEEE, MMMM d')} at ${event.venueName}!`,
      url: eventUrl,
    };

    // Check if native share is available (iOS, Android, some desktop browsers)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed - that's ok
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(eventUrl);
        // Could show a toast notification here
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Search for users to invite - requires auth
  const handleOpenInviteModal = () => {
    requireAuth(
      () => {
        setShowInviteModal(true);
      },
      'Sign in to invite',
      'You need to be signed in to invite players to this event.'
    );
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await userService.searchByName(query, 10);
      // Filter out users who are already participants
      const participantIds = new Set(participants.map(p => p.id));
      const filteredResults = results.filter(u => !participantIds.has(u.id));
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Invite a user
  const handleInvite = async (userId: string) => {
    if (!eventId || !user) return;
    setInviting(userId);
    try {
      await eventService.inviteUser(eventId, userId, user.uid);
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      refetch();
    } catch (err) {
      console.error('Failed to invite user:', err);
    } finally {
      setInviting(null);
    }
  };

  // Remove a participant (for owners/admins)
  const handleRemove = async (userId: string) => {
    if (!eventId) return;
    try {
      await eventService.removeParticipant(eventId, userId);
      refetch();
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  };

  // Delete event (for admins and owners)
  const handleDelete = async () => {
    if (!eventId) return;
    setIsDeleting(true);
    try {
      await eventService.delete(eventId);
      navigate(ROUTES.HOME);
    } catch (err) {
      console.error('Failed to delete event:', err);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout showBack showBottomNav={false}>
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      </PageLayout>
    );
  }

  if (error || !event) {
    return (
      <PageLayout showBack showBottomNav={false}>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            Event not found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            This event may have been deleted or you don't have access.
          </p>
          {error && (
            <p className="text-sm text-red-500 mb-4">{error.message}</p>
          )}
          <Button onClick={() => navigate(ROUTES.HOME)}>Go Home</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showBack showBottomNav={false}>
      <div className="space-y-6 pb-20">
        {/* Event Header */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex-1 pr-3">
              {event.name}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                title="Share event"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <StatusBadge status={event.status} />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organized by {isOwner ? 'you' : 'event owner'}
          </p>
        </div>

        {/* Event Info */}
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <Calendar className="w-5 h-5 flex-shrink-0" />
              <span>{format(event.date, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <Clock className="w-5 h-5 flex-shrink-0" />
              <span>
                {format(event.date, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
              </span>
            </div>
            <div
              className="flex items-start gap-3 text-slate-600 dark:text-slate-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
              onClick={handleOpenMaps}
            >
              <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{event.venueName}</p>
                <p className="text-sm">{event.formattedAddress}</p>
              </div>
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </div>
          </div>
        </Card>

        {/* Description */}
        {event.description && (
          <Card>
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-2">
              Description
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {event.description}
            </p>
          </Card>
        )}

        {/* Add to Calendar Button */}
        <Card>
          <button
            onClick={() => setShowCalendarModal(true)}
            className="w-full flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <CalendarPlus className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Add to Calendar</span>
          </button>
        </Card>

        {/* Capacity */}
        <Card>
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3">
            Capacity
          </h3>
          <CapacityBar current={event.joinedCount} max={event.maxPlayers} />
        </Card>

        {/* Admin Controls - only show if user is authenticated and has permissions */}
        {user && canManage && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">
                Manage Event
              </h3>
              <Button
                size="small"
                onClick={handleOpenInviteModal}
              >
                <UserPlus className="w-4 h-4" />
                Invite Players
              </Button>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Event
              </button>
            </div>
          </Card>
        )}

        {/* Participants */}
        <Card>
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3">
            Participants
          </h3>

          {/* Joined */}
          {joinedParticipants.length > 0 ? (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">
                Joined ({joinedParticipants.length})
              </p>
              {joinedParticipants.map(participant => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  isEventOwner={participant.id === event.ownerId}
                  isEventAdmin={event.adminIds?.includes(participant.id) || false}
                  canManage={canManage || false}
                  onRemove={() => handleRemove(participant.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No participants yet. Be the first to join!
            </p>
          )}

          {/* Invited - Pending */}
          {invitedParticipants.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                Invited - Pending ({invitedParticipants.length})
              </p>
              {invitedParticipants.map(participant => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  isEventOwner={false}
                  isEventAdmin={false}
                  canManage={canManage || false}
                  onRemove={() => handleRemove(participant.id)}
                  showStatus
                />
              ))}
            </div>
          )}

          {/* Waitlisted */}
          {waitlistedParticipants.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                Waitlist ({waitlistedParticipants.length})
              </p>
              {waitlistedParticipants.map(participant => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  isEventOwner={false}
                  isEventAdmin={false}
                  canManage={canManage || false}
                  onRemove={() => handleRemove(participant.id)}
                  waitlistPosition={participant.waitlistPosition}
                />
              ))}
            </div>
          )}

          {/* Declined */}
          {declinedParticipants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Declined ({declinedParticipants.length})
              </p>
              {declinedParticipants.map(participant => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  isEventOwner={false}
                  isEventAdmin={false}
                  canManage={canManage || false}
                  onRemove={() => handleRemove(participant.id)}
                  showStatus
                />
              ))}
            </div>
          )}
        </Card>

        {/* Event Code */}
        {event.eventCode && (
          <Card>
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-2">
              Event Code
            </h3>
            <p className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400">
              {event.eventCode}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Share this code with others to let them join
            </p>
          </Card>
        )}

        {/* Sticky Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-lg mx-auto">
            {event.status !== 'active' ? (
              <Button disabled className="w-full">
                Event {event.status}
              </Button>
            ) : isJoined ? (
              <Button variant="secondary" onClick={handleLeave} className="w-full">
                Leave Event
              </Button>
            ) : isWaitlisted ? (
              <Button variant="secondary" onClick={handleLeave} className="w-full">
                Leave Waitlist (Position #{userParticipant?.waitlistPosition})
              </Button>
            ) : isInvited ? (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleLeave} className="flex-1">
                  Decline
                </Button>
                <Button onClick={handleJoin} className="flex-1">
                  Accept Invitation
                </Button>
              </div>
            ) : (
              <Button onClick={handleJoin} className="w-full">
                {event.joinedCount >= event.maxPlayers ? 'Join Waitlist' : 'Join Event'}
              </Button>
            )}
          </div>
        </div>

        {/* Invite Players Modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
          title="Invite Players"
        >
          <div className="space-y-4">
            <Input
              label="Search by name"
              placeholder="Start typing to search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />

            {isSearching && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map(userProfile => (
                  <div
                    key={userProfile.id}
                    className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        userId={userProfile.id}
                        photoUrl={userProfile.photoUrl}
                        displayName={userProfile.displayName}
                        size="small"
                      />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {userProfile.displayName}
                      </span>
                    </div>
                    <Button
                      size="small"
                      onClick={() => handleInvite(userProfile.id)}
                      loading={inviting === userProfile.id}
                    >
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No users found matching "{searchQuery}"
              </p>
            )}

            {searchQuery.length < 2 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                Type at least 2 characters to search
              </p>
            )}
          </div>
        </Modal>

        {/* Auth Gate Modal */}
        <AuthGateModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          onSuccess={onAuthSuccess}
          title={modalTitle}
          message={modalMessage}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Event"
          message={`Are you sure you want to delete "${event.name}"? This action cannot be undone and all participant data will be permanently removed.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          loading={isDeleting}
        />

        {/* Add to Calendar Modal */}
        <AddToCalendarModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          event={getCalendarEvent()}
          title="Add to Calendar"
          message="Add this event to your calendar so you don't miss it!"
        />
      </div>
    </PageLayout>
  );
}

// Helper component for participant rows
function ParticipantRow({
  participant,
  isEventOwner,
  isEventAdmin,
  canManage,
  onRemove,
  waitlistPosition,
  showStatus,
}: {
  participant: EventParticipant;
  isEventOwner: boolean;
  isEventAdmin: boolean;
  canManage: boolean;
  onRemove: () => void;
  waitlistPosition?: number | null;
  showStatus?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar 
        userId={participant.id} 
        photoUrl={participant.photoUrl}
        displayName={participant.displayName}
        size="small" 
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {participant.displayName || 'Unknown User'}
          </p>
          {isEventOwner && <RoleBadge role="owner" />}
          {isEventAdmin && !isEventOwner && <RoleBadge role="admin" />}
        </div>
        {waitlistPosition && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Position #{waitlistPosition}
          </p>
        )}
        {showStatus && (
          <ParticipantStatusBadge status={participant.status} />
        )}
      </div>
      {canManage && !isEventOwner && (
        <button
          onClick={onRemove}
          className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          title="Remove participant"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}