import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Search } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { EventCard } from "@/components/common/EventCard";
import { useAuth } from "@/hooks/useAuth";
import { useEvents } from "@/hooks/useEvents";
import { eventService } from "@/services/eventService";
import { ROUTES } from "@/config/routes";

export function HomeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ownedEvents, invitedEvents, upcomingEvents, isLoading, error } =
    useEvents(user?.uid);

  // Event code search state
  const [eventCode, setEventCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Get the next upcoming event (first in the sorted list)
  const nextEvent = upcomingEvents[0];
  // Other upcoming events (excluding the first one)
  const otherUpcomingEvents = upcomingEvents.slice(1);

  // Filter owned events to only show active ones
  const activeOwnedEvents = ownedEvents.filter((e) => e.status === "active");

  // Filter invited events to only show active ones
  const activeInvitedEvents = invitedEvents.filter(
    (e) => e.status === "active",
  );

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

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Find Event by Code */}
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
              Find Event
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {searchError}
            </p>
          )}
        </section>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(ROUTES.CREATE_EVENT)}
            className="flex-1"
            variant="secondary"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Button>
        </div>

        {/* Next Upcoming Event */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Next Up
          </h2>
          {nextEvent ? (
            <EventCard event={nextEvent} />
          ) : (
            <EmptyState
              icon={Calendar}
              title="No upcoming events"
              description="Create or join an event to get started"
              action={{
                label: "Create Event",
                onClick: () => navigate(ROUTES.CREATE_EVENT),
              }}
            />
          )}
        </section>

        {/* Invitations */}
        {activeInvitedEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Invitations
            </h2>
            <div className="space-y-3">
              {activeInvitedEvents.map((event) => (
                <EventCard key={event.id} event={event} showInviteBadge />
              ))}
            </div>
          </section>
        )}

        {/* Other Upcoming Events */}
        {otherUpcomingEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Coming Up
            </h2>
            <div className="space-y-3">
              {otherUpcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Events You Own */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Your Events
          </h2>
          {activeOwnedEvents.length > 0 ? (
            <div className="space-y-3">
              {activeOwnedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No events created yet
              </p>
            </Card>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
