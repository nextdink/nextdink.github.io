import { useState, useEffect, useCallback } from 'react';
import { eventService } from '@/services/eventService';
import { userService } from '@/services/userService';
import type { Event, EventParticipant } from '@/types/event.types';

interface UseEventResult {
  event: Event | null;
  participants: EventParticipant[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useEvent(eventId: string | undefined): UseEventResult {
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      setEvent(null);
      setParticipants([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch event details
      const eventData = await eventService.getById(eventId);
      setEvent(eventData);

      // Fetch participants if event exists
      if (eventData) {
        const participantData = await eventService.getParticipants(eventId);
        
        // Fetch user profiles for all participants
        if (participantData.length > 0) {
          const userIds = participantData.map(p => p.id);
          const userProfiles = await userService.getByIds(userIds);
          
          // Create a map of user profiles for quick lookup
          const profileMap = new Map(userProfiles.map(u => [u.id, u]));
          
          // Merge user profile data into participants
          const enrichedParticipants = participantData.map(participant => ({
            ...participant,
            displayName: profileMap.get(participant.id)?.displayName,
            photoUrl: profileMap.get(participant.id)?.photoUrl,
          }));
          
          setParticipants(enrichedParticipants);
        } else {
          setParticipants([]);
        }
      } else {
        setParticipants([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch event'));
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  return {
    event,
    participants,
    isLoading,
    error,
    refetch: fetchEvent,
  };
}