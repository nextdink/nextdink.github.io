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

export function useEvent(eventCode: string | undefined): UseEventResult {
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!eventCode) {
      setEvent(null);
      setParticipants([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch event details by code
      const eventData = await eventService.getByCode(eventCode);
      setEvent(eventData);

      // Fetch participants if event exists (using the event's internal ID)
      if (eventData) {
        const participantData = await eventService.getParticipants(eventData.id);
        
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
  }, [eventCode]);

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