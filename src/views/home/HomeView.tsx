import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Search, Mail, X } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { TabBar } from "@/components/ui/TabBar";
import { EventCard } from "@/components/common/EventCard";
import { useAuth } from "@/hooks/useAuth";
import { useEvents, type EventWithStatus } from "@/hooks/useEvents";
import { eventService } from "@/services/eventService";
import { ROUTES } from "@/config/routes";

export function HomeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    scheduleEvents,
    invitedEvents,
    declinedEvents,
    inviteCount,
    isLoading,
    error,
    refetch,
  } = useEvents(user?.uid);

  // Tab state
  const [activeTab, setActiveTab] = useState<"schedule" | "invites">(
    "schedule",
  );

  // Event code search state
  const [eventCode, setEventCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Handle event code search
  const handleFindEvent = async () => {
    const trimmedCode = eventCode.trim().toUpperCase();
    if (!trimmedCode) {
      setSearchError("Please enter an event code");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const event = await eventService.getByCode(trimmedCode);
      if (event) {
        navigate(`/event/${event.eventCode}`);
      } else {
        setSearchError("Event not found. Please check the code and try again.");
      }
    } catch {
      setSearchError("Failed to find event. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle enter key press in search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFindEvent();
    }
  };

  // Handle accept invitation
  const handleAcceptInvite = async (eventWithStatus: EventWithStatus) => {
    // Navigate to event page to complete registration
    navigate(`/event/${eventWithStatus.event.eventCode}`);
  };

  // Handle decline invitation
  const handleDeclineInvite = async (eventWithStatus: EventWithStatus) => {
    if (!user) return;
    try {
      await eventService.declineInvitation(eventWithStatus.event.id, user.uid);
      refetch();
    } catch (err) {
      console.error("Failed to decline invitation:", err);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">
            Failed to load events. Please try again.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {error.message}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  const tabs = [
    {
      id: "schedule",
      label: "Schedule",
      icon: <Calendar className="w-4 h-4" />,
      count: scheduleEvents.length,
    },
    {
      id: "invites",
      label: "Invites",
      icon: <Mail className="w-4 h-4" />,
      count: inviteCount,
    },
  ];

  return (
    <PageLayout>
      <div className="space-y-4">
        {/* Find Event by Code - At the very top */}
        <section>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Enter event code..."
                value={eventCode}
                onChange={(e) => {
                  setEventCode(e.target.value.toUpperCase());
                  setSearchError(null);
                }}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleFindEvent} loading={isSearching}>
              Find
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {searchError}
            </p>
          )}
        </section>

        {/* Tab Bar - Under search */}
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as "schedule" | "invites")}
        />

        {/* Tab Content */}
        {activeTab === "schedule" ? (
          <ScheduleTab
            scheduleEvents={scheduleEvents}
            onCreateEvent={() => navigate(ROUTES.CREATE_EVENT)}
          />
        ) : (
          <InvitesTab
            invitedEvents={invitedEvents}
            declinedEvents={declinedEvents}
            onAccept={handleAcceptInvite}
            onDecline={handleDeclineInvite}
          />
        )}

        {/* Create Event Button */}
        <div className="pt-2">
          <Button
            onClick={() => navigate(ROUTES.CREATE_EVENT)}
            className="w-full"
            variant="secondary"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

// Schedule Tab Component
interface ScheduleTabProps {
  scheduleEvents: EventWithStatus[];
  onCreateEvent: () => void;
}

function ScheduleTab({ scheduleEvents, onCreateEvent }: ScheduleTabProps) {
  if (scheduleEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No upcoming events"
        description="Create or join an event to get started"
        action={{
          label: "Create Event",
          onClick: onCreateEvent,
        }}
      />
    );
  }

  // First event is the "next up" hero card
  const nextEvent = scheduleEvents[0];
  const otherEvents = scheduleEvents.slice(1);

  return (
    <div className="space-y-4">
      {/* Next Up - Hero Card */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Next Up
        </h2>
        <EventCard
          event={nextEvent.event}
          userStatus={nextEvent.status}
          registrationStatus={nextEvent.registrationStatus}
          waitlistPosition={nextEvent.waitlistPosition}
        />
      </section>

      {/* Other Upcoming Events */}
      {otherEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Coming Up
          </h2>
          <div className="space-y-3">
            {otherEvents.map((eventWithStatus) => (
              <EventCard
                key={eventWithStatus.event.id}
                event={eventWithStatus.event}
                userStatus={eventWithStatus.status}
                registrationStatus={eventWithStatus.registrationStatus}
                waitlistPosition={eventWithStatus.waitlistPosition}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Invites Tab Component
interface InvitesTabProps {
  invitedEvents: EventWithStatus[];
  declinedEvents: EventWithStatus[];
  onAccept: (event: EventWithStatus) => void;
  onDecline: (event: EventWithStatus) => void;
}

function InvitesTab({
  invitedEvents,
  declinedEvents,
  onAccept,
  onDecline,
}: InvitesTabProps) {
  const hasInvites = invitedEvents.length > 0;
  const hasDeclined = declinedEvents.length > 0;

  if (!hasInvites && !hasDeclined) {
    return (
      <EmptyState
        icon={Mail}
        title="No invitations"
        description="When someone invites you to an event, it will appear here"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      {hasInvites && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Pending ({invitedEvents.length})
          </h2>
          <div className="space-y-3">
            {invitedEvents.map((eventWithStatus) => (
              <InviteCard
                key={eventWithStatus.event.id}
                eventWithStatus={eventWithStatus}
                onAccept={() => onAccept(eventWithStatus)}
                onDecline={() => onDecline(eventWithStatus)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Declined Events */}
      {hasDeclined && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Declined ({declinedEvents.length})
          </h2>
          <div className="space-y-3">
            {declinedEvents.map((eventWithStatus) => (
              <EventCard
                key={eventWithStatus.event.id}
                event={eventWithStatus.event}
                userStatus="declined"
                isDeclined
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Invite Card with Accept/Decline buttons
interface InviteCardProps {
  eventWithStatus: EventWithStatus;
  onAccept: () => void;
  onDecline: () => void;
}

function InviteCard({ eventWithStatus, onAccept, onDecline }: InviteCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await onDecline();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAccept();
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <div className="space-y-3">
        {/* Event Info */}
        <EventCard
          event={eventWithStatus.event}
          userStatus="invited"
          className="border-0 p-0 shadow-none hover:border-0"
        />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            onClick={handleAccept}
            variant="primary"
            size="small"
            className="flex-1"
          >
            Accept
          </Button>
          <Button
            onClick={handleDecline}
            variant="secondary"
            size="small"
            className="flex-1"
            loading={isLoading}
          >
            <X className="w-4 h-4" />
            Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}
