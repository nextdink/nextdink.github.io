import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction,
  type Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Event, CreateEventData, UpdateEventData, EventParticipant, ParticipantStatus } from '@/types/event.types';
import { generateEventCode } from '@/utils/eventCodeUtils';

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | null): Date => {
  return timestamp ? timestamp.toDate() : new Date();
};

// Convert Firestore document to Event
const docToEvent = (id: string, data: Record<string, unknown>): Event => ({
  id,
  name: data.name as string,
  description: data.description as string | undefined,
  date: convertTimestamp(data.date as Timestamp),
  endTime: convertTimestamp(data.endTime as Timestamp),
  maxPlayers: data.maxPlayers as number,
  venueName: data.venueName as string,
  formattedAddress: data.formattedAddress as string,
  latitude: data.latitude as number,
  longitude: data.longitude as number,
  placeId: data.placeId as string | undefined,
  visibility: data.visibility as Event['visibility'],
  joinType: data.joinType as Event['joinType'],
  eventCode: data.eventCode as string | undefined,
  status: data.status as Event['status'],
  ownerId: data.ownerId as string,
  adminIds: data.adminIds as string[],
  joinedCount: data.joinedCount as number,
  waitlistCount: data.waitlistCount as number,
  createdAt: convertTimestamp(data.createdAt as Timestamp),
  updatedAt: convertTimestamp(data.updatedAt as Timestamp),
});

// Helper to remove undefined values from an object (Firestore doesn't accept undefined)
const removeUndefined = <T extends object>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const eventService = {
  // Create a new event
  async create(data: CreateEventData, ownerId: string): Promise<string> {
    const eventsRef = collection(db, 'events');
    
    // Generate a unique event code for ALL events
    let eventCode = generateEventCode();
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!(await this.isEventCodeUnique(eventCode)) && attempts < maxAttempts) {
      eventCode = generateEventCode();
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique event code. Please try again.');
    }

    // Build the event data, filtering out undefined values
    const eventData = removeUndefined({
      name: data.name,
      description: data.description,
      date: data.date,
      endTime: data.endTime,
      maxPlayers: data.maxPlayers,
      venueName: data.venueName,
      formattedAddress: data.formattedAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      placeId: data.placeId,
      visibility: data.visibility,
      joinType: data.joinType,
      eventCode, // Always set the auto-generated code
      status: 'active' as const,
      ownerId,
      adminIds: [],
      joinedCount: 0,
      waitlistCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(eventsRef, eventData);

    return docRef.id;
  },

  // Get event by ID
  async getById(eventId: string): Promise<Event | null> {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) return null;

    return docToEvent(eventSnap.id, eventSnap.data());
  },

  // Update event
  async update(eventId: string, data: UpdateEventData): Promise<void> {
    const eventRef = doc(db, 'events', eventId);
    
    // If eventCode is being updated, check uniqueness
    if (data.eventCode) {
      const isUnique = await this.isEventCodeUnique(data.eventCode, eventId);
      if (!isUnique) {
        throw new Error('Event code is already in use');
      }
    }

    // Filter out undefined values (Firestore doesn't accept undefined)
    const cleanedData = removeUndefined(data);

    await updateDoc(eventRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });
  },

  // Cancel event
  async cancel(eventId: string): Promise<void> {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      status: 'canceled',
      updatedAt: serverTimestamp(),
    });
  },

  // Delete event (permanently removes from database)
  async delete(eventId: string): Promise<void> {
    // First, delete all participants subcollection
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const participantsSnap = await getDocs(participantsRef);
    
    // Use a batch to delete all participants
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    
    participantsSnap.docs.forEach((participantDoc) => {
      batch.delete(participantDoc.ref);
    });
    
    // Delete the event document itself
    const eventRef = doc(db, 'events', eventId);
    batch.delete(eventRef);
    
    // Commit the batch
    await batch.commit();
  },

  // Check if event code is unique
  async isEventCodeUnique(eventCode: string, excludeEventId?: string): Promise<boolean> {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('eventCode', '==', eventCode),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return true;
    if (excludeEventId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeEventId) {
      return true;
    }
    return false;
  },

  // Get event by code
  async getByCode(eventCode: string): Promise<Event | null> {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('eventCode', '==', eventCode),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const eventDoc = snapshot.docs[0];
    return docToEvent(eventDoc.id, eventDoc.data());
  },

  // Get public events
  async getPublicEvents(limitCount = 20): Promise<Event[]> {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('visibility', '==', 'public'),
      where('status', '==', 'active'),
      orderBy('date', 'asc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(eventDoc => docToEvent(eventDoc.id, eventDoc.data()));
  },

  // Get events by owner
  async getByOwner(ownerId: string): Promise<Event[]> {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('ownerId', '==', ownerId)
    );

    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(eventDoc => docToEvent(eventDoc.id, eventDoc.data()));
    // Sort client-side by date descending (newest first)
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // Get events where user is participant
  async getByParticipant(userId: string): Promise<Event[]> {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(eventDoc => docToEvent(eventDoc.id, eventDoc.data()));

    // Filter to only events where user is a participant
    const participantEvents: Event[] = [];
    for (const event of events) {
      const participant = await this.getParticipant(event.id, userId);
      if (participant && participant.status === 'joined') {
        participantEvents.push(event);
      }
    }

    // Sort client-side by date ascending
    return participantEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  // Add admin to event
  async addAdmin(eventId: string, userId: string): Promise<void> {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) throw new Error('Event not found');
    
    const adminIds = eventSnap.data().adminIds || [];
    if (!adminIds.includes(userId)) {
      await updateDoc(eventRef, {
        adminIds: [...adminIds, userId],
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Remove admin from event
  async removeAdmin(eventId: string, userId: string): Promise<void> {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) throw new Error('Event not found');
    
    const adminIds = eventSnap.data().adminIds || [];
    await updateDoc(eventRef, {
      adminIds: adminIds.filter((id: string) => id !== userId),
      updatedAt: serverTimestamp(),
    });
  },

  // Participant management
  async getParticipant(eventId: string, userId: string): Promise<EventParticipant | null> {
    const participantRef = doc(db, 'events', eventId, 'participants', userId);
    const participantSnap = await getDoc(participantRef);

    if (!participantSnap.exists()) return null;

    const data = participantSnap.data();
    return {
      id: participantSnap.id,
      status: data.status,
      role: data.role,
      joinedAt: convertTimestamp(data.joinedAt),
      invitedBy: data.invitedBy,
      waitlistPosition: data.waitlistPosition,
    };
  },

  async getParticipants(eventId: string): Promise<EventParticipant[]> {
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const snapshot = await getDocs(participantsRef);

    return snapshot.docs.map(participantDoc => ({
      id: participantDoc.id,
      status: participantDoc.data().status,
      role: participantDoc.data().role,
      joinedAt: convertTimestamp(participantDoc.data().joinedAt),
      invitedBy: participantDoc.data().invitedBy,
      waitlistPosition: participantDoc.data().waitlistPosition,
    }));
  },

  async getParticipantsByStatus(eventId: string, status: ParticipantStatus): Promise<EventParticipant[]> {
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const q = query(participantsRef, where('status', '==', status));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(participantDoc => ({
      id: participantDoc.id,
      status: participantDoc.data().status,
      role: participantDoc.data().role,
      joinedAt: convertTimestamp(participantDoc.data().joinedAt),
      invitedBy: participantDoc.data().invitedBy,
      waitlistPosition: participantDoc.data().waitlistPosition,
    }));
  },

  // Join event
  async joinEvent(eventId: string, userId: string): Promise<'joined' | 'waitlisted'> {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'events', eventId);
      const participantRef = doc(db, 'events', eventId, 'participants', userId);
      
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) throw new Error('Event not found');
      
      const eventData = eventSnap.data();
      const joinedCount = eventData.joinedCount || 0;
      const waitlistCount = eventData.waitlistCount || 0;
      const maxPlayers = eventData.maxPlayers;

      if (joinedCount < maxPlayers) {
        // Can join directly
        transaction.set(participantRef, {
          status: 'joined',
          role: 'player',
          joinedAt: serverTimestamp(),
        });
        transaction.update(eventRef, {
          joinedCount: joinedCount + 1,
          updatedAt: serverTimestamp(),
        });
        return 'joined';
      } else {
        // Add to waitlist
        transaction.set(participantRef, {
          status: 'waitlisted',
          role: 'player',
          joinedAt: serverTimestamp(),
          waitlistPosition: waitlistCount + 1,
        });
        transaction.update(eventRef, {
          waitlistCount: waitlistCount + 1,
          updatedAt: serverTimestamp(),
        });
        return 'waitlisted';
      }
    });
  },

  // Leave event
  async leaveEvent(eventId: string, userId: string): Promise<void> {
    // First, check if there's someone on the waitlist to promote
    const waitlistRef = collection(db, 'events', eventId, 'participants');
    const waitlistQuery = query(
      waitlistRef,
      where('status', '==', 'waitlisted'),
      orderBy('waitlistPosition', 'asc'),
      limit(1)
    );
    const waitlistSnap = await getDocs(waitlistQuery);
    const firstWaitlistedId = waitlistSnap.empty ? null : waitlistSnap.docs[0].id;

    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'events', eventId);
      const participantRef = doc(db, 'events', eventId, 'participants', userId);
      
      const eventSnap = await transaction.get(eventRef);
      const participantSnap = await transaction.get(participantRef);
      
      if (!eventSnap.exists()) throw new Error('Event not found');
      if (!participantSnap.exists()) throw new Error('Not a participant');
      
      const eventData = eventSnap.data();
      const participantData = participantSnap.data();
      const wasJoined = participantData.status === 'joined';
      const wasWaitlisted = participantData.status === 'waitlisted';

      // Remove participant
      transaction.delete(participantRef);

      if (wasJoined) {
        // Check if we need to promote someone from waitlist
        if (firstWaitlistedId) {
          const firstWaitlistedRef = doc(db, 'events', eventId, 'participants', firstWaitlistedId);
          
          // Promote the first waitlisted person - joinedCount stays the same, waitlistCount decreases
          transaction.update(firstWaitlistedRef, {
            status: 'joined',
            waitlistPosition: null,
          });
          transaction.update(eventRef, {
            // joinedCount stays the same (one left, one promoted)
            waitlistCount: Math.max(0, (eventData.waitlistCount || 1) - 1),
            updatedAt: serverTimestamp(),
          });
        } else {
          // No one to promote, just decrement joined count
          transaction.update(eventRef, {
            joinedCount: Math.max(0, (eventData.joinedCount || 1) - 1),
            updatedAt: serverTimestamp(),
          });
        }
      } else if (wasWaitlisted) {
        // Decrement waitlist count
        transaction.update(eventRef, {
          waitlistCount: Math.max(0, (eventData.waitlistCount || 1) - 1),
          updatedAt: serverTimestamp(),
        });
      }
    });
  },

  // Invite user to event
  async inviteUser(eventId: string, userId: string, invitedBy: string): Promise<void> {
    const participantRef = doc(db, 'events', eventId, 'participants', userId);
    await setDoc(participantRef, {
      status: 'invited_pending',
      role: 'player',
      joinedAt: serverTimestamp(),
      invitedBy,
    });
  },

  // Accept invitation
  async acceptInvitation(eventId: string, userId: string): Promise<'joined' | 'waitlisted'> {
    return await this.joinEvent(eventId, userId);
  },

  // Decline invitation
  async declineInvitation(eventId: string, userId: string): Promise<void> {
    const participantRef = doc(db, 'events', eventId, 'participants', userId);
    await updateDoc(participantRef, {
      status: 'declined',
    });
  },

  // Remove participant
  async removeParticipant(eventId: string, userId: string): Promise<void> {
    await this.leaveEvent(eventId, userId);
  },
};