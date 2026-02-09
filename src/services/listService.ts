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
  type Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { List, ListMember, CreateListData, UpdateListData } from '@/types';

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | null): Date => {
  return timestamp ? timestamp.toDate() : new Date();
};

export const listService = {
  // Create a new list
  async create(data: CreateListData, ownerId: string): Promise<string> {
    const listsRef = collection(db, 'lists');
    const docRef = await addDoc(listsRef, {
      ...data,
      ownerId,
      adminIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  },

  // Get list by ID
  async getById(listId: string): Promise<List | null> {
    const listRef = doc(db, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) return null;

    const data = listSnap.data();
    return {
      id: listSnap.id,
      name: data.name,
      ownerId: data.ownerId,
      adminIds: data.adminIds || [],
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    };
  },

  // Update list
  async update(listId: string, data: UpdateListData): Promise<void> {
    const listRef = doc(db, 'lists', listId);
    await updateDoc(listRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete list
  async delete(listId: string): Promise<void> {
    const listRef = doc(db, 'lists', listId);
    await deleteDoc(listRef);
  },

  // Get lists by owner
  async getByOwner(ownerId: string): Promise<List[]> {
    const listsRef = collection(db, 'lists');
    const q = query(listsRef, where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      ownerId: doc.data().ownerId,
      adminIds: doc.data().adminIds || [],
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt),
    }));
  },

  // Get lists where user is admin
  async getByAdmin(userId: string): Promise<List[]> {
    const listsRef = collection(db, 'lists');
    const q = query(listsRef, where('adminIds', 'array-contains', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      ownerId: doc.data().ownerId,
      adminIds: doc.data().adminIds || [],
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt),
    }));
  },

  // Get all lists user has access to (owner or admin)
  async getAccessibleLists(userId: string): Promise<List[]> {
    const ownedLists = await this.getByOwner(userId);
    const adminLists = await this.getByAdmin(userId);
    
    // Combine and deduplicate
    const allLists = [...ownedLists];
    for (const list of adminLists) {
      if (!allLists.find(l => l.id === list.id)) {
        allLists.push(list);
      }
    }
    
    return allLists.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

  // Member management
  async getMembers(listId: string): Promise<ListMember[]> {
    const membersRef = collection(db, 'lists', listId, 'members');
    const snapshot = await getDocs(membersRef);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      addedAt: convertTimestamp(doc.data().addedAt),
      addedBy: doc.data().addedBy,
    }));
  },

  async addMember(listId: string, userId: string, addedBy: string): Promise<void> {
    const memberRef = doc(db, 'lists', listId, 'members', userId);
    await setDoc(memberRef, {
      addedAt: serverTimestamp(),
      addedBy,
    });
  },

  async removeMember(listId: string, userId: string): Promise<void> {
    const memberRef = doc(db, 'lists', listId, 'members', userId);
    await deleteDoc(memberRef);
  },

  async isMember(listId: string, userId: string): Promise<boolean> {
    const memberRef = doc(db, 'lists', listId, 'members', userId);
    const memberSnap = await getDoc(memberRef);
    return memberSnap.exists();
  },

  // Get member count
  async getMemberCount(listId: string): Promise<number> {
    const membersRef = collection(db, 'lists', listId, 'members');
    const snapshot = await getDocs(membersRef);
    return snapshot.size;
  },
};