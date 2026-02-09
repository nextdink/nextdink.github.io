import { useNavigate } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { EventCard } from '@/components/common/EventCard';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { ROUTES } from '@/config/routes';

export function HomeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ownedEvents, upcomingEvents, isLoading, error } = useEvents(user?.uid);

  // Get the next upcoming event (first in the sorted list)
  const nextEvent = upcomingEvents[0];
  // Other upcoming events (excluding the first one)
  const otherUpcomingEvents = upcomingEvents.slice(1);

  // Filter owned events to only show active ones
  const activeOwnedEvents = ownedEvents.filter(e => e.status === 'active');

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
        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button onClick={() => navigate(ROUTES.CREATE_EVENT)} className="flex-1">
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
                label: 'Create Event',
                onClick: () => navigate(ROUTES.CREATE_EVENT),
              }}
            />
          )}
        </section>

        {/* Other Upcoming Events */}
        {otherUpcomingEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Coming Up
            </h2>
            <div className="space-y-3">
              {otherUpcomingEvents.map(event => (
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
              {activeOwnedEvents.map(event => (
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