import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { User, UserProfile } from '@/types';

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | null): Date => {
  return timestamp ? timestamp.toDate() : new Date();
};

export const userService = {
  // Create a new user
  async createUser(userId: string, displayName: string, photoUrl: string | null): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      displayName,
      displayNameLower: displayName.toLowerCase(),
      photoUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  // Create or update user (for OAuth sign-in)
  async createOrUpdateUser(userId: string, displayName: string, photoUrl: string | null): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        displayName,
        displayNameLower: displayName.toLowerCase(),
        photoUrl,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new user
      await this.createUser(userId, displayName, photoUrl);
    }
  },

  // Get user by ID
  async getById(userId: string): Promise<User | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    return {
      id: userSnap.id,
      displayName: data.displayName,
      photoUrl: data.photoUrl,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    };
  },

  // Get user profile (minimal data for display)
  async getProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    return {
      id: userSnap.id,
      displayName: data.displayName,
      photoUrl: data.photoUrl,
    };
  },

  // Update user profile
  async updateProfile(userId: string, data: Partial<Pick<User, 'displayName' | 'photoUrl'>>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    // Keep displayNameLower in sync if displayName is updated
    if (data.displayName) {
      updateData.displayNameLower = data.displayName.toLowerCase();
    }
    await updateDoc(userRef, updateData);
  },

  // Search users by display name (case-insensitive)
  async searchByName(searchTerm: string, limit = 10): Promise<UserProfile[]> {
    const usersRef = collection(db, 'users');
    const searchTermLower = searchTerm.toLowerCase();
    
    // Note: Firestore doesn't support full-text search natively
    // This is a simple prefix search on the lowercase field
    // For production, consider Algolia or similar for better search
    const q = query(
      usersRef,
      where('displayNameLower', '>=', searchTermLower),
      where('displayNameLower', '<=', searchTermLower + '\uf8ff')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      displayName: doc.data().displayName,
      photoUrl: doc.data().photoUrl,
    }));
  },

  // Get multiple users by IDs
  async getByIds(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return [];

    const users: UserProfile[] = [];
    // Firestore 'in' query supports max 30 items
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 30) {
      chunks.push(userIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('__name__', 'in', chunk));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach(doc => {
        users.push({
          id: doc.id,
          displayName: doc.data().displayName,
          photoUrl: doc.data().photoUrl,
        });
      });
    }

    return users;
  },
};