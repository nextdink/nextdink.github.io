import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  addDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { List, ListMember, CreateListData, UpdateListData } from '@/types/list.types';

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | null): Date => {
  return timestamp ? timestamp.toDate() : new Date();
};

// Convert Firestore document to List
const docToList = (id: string, data: Record<string, unknown>): List => ({
  id,
  name: data.name as string,
  ownerId: data.ownerId as string,
  adminIds: (data.adminIds as string[]) || [],
  createdAt: convertTimestamp(data.createdAt as Timestamp),
  updatedAt: convertTimestamp(data.updatedAt as Timestamp),
});

export const listService = {
  // Create a new list
  async create(data: CreateListData, ownerId: string): Promise<string> {
    const listsRef = collection(db, 'lists');
    
    const listData = {
      name: data.name,
      ownerId,
      adminIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(listsRef, listData);
    return docRef.id;
  },

  // Get list by ID
  async getById(listId: string): Promise<List | null> {
    const listRef = doc(db, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) return null;

    return docToList(listSnap.id, listSnap.data());
  },

  // Check if user can access list (is owner or admin)
  async canAccess(listId: string, userId: string): Promise<boolean> {
    const list = await this.getById(listId);
    if (!list) return false;
    return list.ownerId === userId || list.adminIds.includes(userId);
  },

  // Get lists owned by user
  async getByOwner(ownerId: string): Promise<List[]> {
    const listsRef = collection(db, 'lists');
    const q = query(listsRef, where('ownerId', '==', ownerId));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(listDoc => docToList(listDoc.id, listDoc.data()));
  },

  // Get lists where user is admin (but not owner)
  async getByAdmin(userId: string): Promise<List[]> {
    const listsRef = collection(db, 'lists');
    const q = query(listsRef, where('adminIds', 'array-contains', userId));

    const snapshot = await getDocs(q);
    // Filter out lists where user is also owner (they'll appear in getByOwner)
    return snapshot.docs
      .map(listDoc => docToList(listDoc.id, listDoc.data()))
      .filter(list => list.ownerId !== userId);
  },

  // Get all lists user can access (owned + admin)
  async getAccessibleLists(userId: string): Promise<List[]> {
    const [ownedLists, adminLists] = await Promise.all([
      this.getByOwner(userId),
      this.getByAdmin(userId),
    ]);

    // Combine and sort by creation date (newest first)
    return [...ownedLists, ...adminLists].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  // Update list
  async update(listId: string, data: UpdateListData): Promise<void> {
    const listRef = doc(db, 'lists', listId);
    await updateDoc(listRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete list (and all members)
  async delete(listId: string): Promise<void> {
    // First, delete all members subcollection
    const membersRef = collection(db, 'lists', listId, 'members');
    const membersSnap = await getDocs(membersRef);
    
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    
    membersSnap.docs.forEach((memberDoc) => {
      batch.delete(memberDoc.ref);
    });
    
    // Delete the list document itself
    const listRef = doc(db, 'lists', listId);
    batch.delete(listRef);
    
    await batch.commit();
  },

  // Add member to list
  async addMember(listId: string, userId: string, addedBy: string): Promise<void> {
    const memberRef = doc(db, 'lists', listId, 'members', userId);
    await setDoc(memberRef, {
      addedAt: serverTimestamp(),
      addedBy,
    });
  },

  // Remove member from list
  async removeMember(listId: string, userId: string): Promise<void> {
    const memberRef = doc(db, 'lists', listId, 'members', userId);
    await deleteDoc(memberRef);
  },

  // Get all members of a list
  async getMembers(listId: string): Promise<ListMember[]> {
    const membersRef = collection(db, 'lists', listId, 'members');
    const snapshot = await getDocs(membersRef);

    return snapshot.docs.map(memberDoc => ({
      id: memberDoc.id,
      addedAt: convertTimestamp(memberDoc.data().addedAt),
      addedBy: memberDoc.data().addedBy,
    }));
  },

  // Get member count for a list
  async getMemberCount(listId: string): Promise<number> {
    const membersRef = collection(db, 'lists', listId, 'members');
    const snapshot = await getDocs(membersRef);
    return snapshot.size;
  },

  // Check if user is a member of a list
  async isMember(listId: string, userId: string): Promise<boolean> {
    const memberRef = doc(db, 'lists', listId, 'members', userId);
    const memberSnap = await getDoc(memberRef);
    return memberSnap.exists();
  },

  // Add admin to list
  async addAdmin(listId: string, userId: string): Promise<void> {
    const listRef = doc(db, 'lists', listId);
    const listSnap = await getDoc(listRef);
    
    if (!listSnap.exists()) throw new Error('List not found');
    
    const adminIds = listSnap.data().adminIds || [];
    if (!adminIds.includes(userId)) {
      await updateDoc(listRef, {
        adminIds: [...adminIds, userId],
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Remove admin from list
  async removeAdmin(listId: string, userId: string): Promise<void> {
    const listRef = doc(db, 'lists', listId);
    const listSnap = await getDoc(listRef);
    
    if (!listSnap.exists()) throw new Error('List not found');
    
    const adminIds = listSnap.data().adminIds || [];
    await updateDoc(listRef, {
      adminIds: adminIds.filter((id: string) => id !== userId),
      updatedAt: serverTimestamp(),
    });
  },
};