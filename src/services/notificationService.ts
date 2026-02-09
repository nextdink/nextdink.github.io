import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  type Timestamp,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Notification, NotificationType } from '@/types';

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | null): Date => {
  return timestamp ? timestamp.toDate() : new Date();
};

export const notificationService = {
  // Create a notification for a user
  async create(
    userId: string,
    type: NotificationType,
    relatedEntityId: string
  ): Promise<string> {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      type,
      relatedEntityId,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  },

  // Create notifications for multiple users
  async createForMultipleUsers(
    userIds: string[],
    type: NotificationType,
    relatedEntityId: string
  ): Promise<void> {
    const batch = writeBatch(db);

    for (const userId of userIds) {
      const notificationRef = doc(collection(db, 'users', userId, 'notifications'));
      batch.set(notificationRef, {
        type,
        relatedEntityId,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },

  // Get notifications for a user
  async getByUser(userId: string, limitCount = 50): Promise<Notification[]> {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      type: doc.data().type,
      relatedEntityId: doc.data().relatedEntityId,
      isRead: doc.data().isRead,
      createdAt: convertTimestamp(doc.data().createdAt),
    }));
  },

  // Get unread notifications count
  async getUnreadCount(userId: string): Promise<number> {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, where('isRead', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // Mark notification as read
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
    });
  },

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, where('isRead', '==', false));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();
  },

  // Helper methods for specific notification types
  async notifyEventInvite(userId: string, eventId: string): Promise<void> {
    await this.create(userId, 'invite', eventId);
  },

  async notifyEventApproved(userId: string, eventId: string): Promise<void> {
    await this.create(userId, 'approved', eventId);
  },

  async notifyWaitlistPromoted(userId: string, eventId: string): Promise<void> {
    await this.create(userId, 'waitlist_promoted', eventId);
  },

  async notifyWaitlistPositionChanged(userId: string, eventId: string): Promise<void> {
    await this.create(userId, 'waitlist_position_changed', eventId);
  },

  async notifyEventCanceled(userIds: string[], eventId: string): Promise<void> {
    await this.createForMultipleUsers(userIds, 'event_canceled', eventId);
  },

  async notifyEventUpdated(userIds: string[], eventId: string): Promise<void> {
    await this.createForMultipleUsers(userIds, 'event_updated', eventId);
  },
};