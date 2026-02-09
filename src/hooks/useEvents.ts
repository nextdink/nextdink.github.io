import { useState, useEffect, useCallback } from 'react';
import { eventService } from '@/services/eventService';
import type { Event } from '@/types/event.types';

interface UseEventsResult {
  ownedEvents: Event[];
  joinedEvents: Event[];
  upcomingEvents: Event[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useEvents(userId: string | undefined): UseEventsResult {
  const [ownedEvents, setOwnedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!userId) {
      setOwnedEvents([]);
      setJoinedEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch events owned by user
      const owned = await eventService.getByOwner(userId);
      setOwnedEvents(owned);

      // Fetch events user has joined (as participant)
      const joined = await eventService.getByParticipant(userId);
      // Filter out events the user also owns to avoid duplicates
      const joinedOnly = joined.filter(e => e.ownerId !== userId);
      setJoinedEvents(joinedOnly);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch events'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Combine and sort all upcoming events (future events only)
  const now = new Date();
  const upcomingEvents = [...ownedEvents, ...joinedEvents]
    .filter(e => e.date > now && e.status === 'active')
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    ownedEvents,
    joinedEvents,
    upcomingEvents,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}