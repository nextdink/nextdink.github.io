import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { userService } from './userService';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const microsoftProvider = new OAuthProvider('microsoft.com');

export const authService = {
  // Sign up with email and password
  async signUpWithEmail(email: string, password: string, displayName: string): Promise<FirebaseUser> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    await userService.createUser(user.uid, displayName, user.photoURL);
    return user;
  },

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<FirebaseUser> {
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      // Create or update user in Firestore
      await userService.createOrUpdateUser(user.uid, user.displayName || 'User', user.photoURL);
      return user;
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Google sign-in failed: ${error.message}`);
      }
      throw error;
    }
  },

  // Sign in with Google using redirect (fallback)
  async signInWithGoogleRedirect(): Promise<void> {
    await signInWithRedirect(auth, googleProvider);
  },

  // Handle redirect result (call this on app init)
  async handleRedirectResult(): Promise<FirebaseUser | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        await userService.createOrUpdateUser(
          result.user.uid,
          result.user.displayName || 'User',
          result.user.photoURL
        );
        return result.user;
      }
      return null;
    } catch (error) {
      console.error('Redirect result error:', error);
      return null;
    }
  },

  // Sign in with Microsoft
  async signInWithMicrosoft(): Promise<FirebaseUser> {
    try {
      const { user } = await signInWithPopup(auth, microsoftProvider);
      // Create or update user in Firestore
      await userService.createOrUpdateUser(user.uid, user.displayName || 'User', user.photoURL);
      return user;
    } catch (error: unknown) {
      console.error('Microsoft sign-in error:', error);
      if (error instanceof Error) {
        throw new Error(`Microsoft sign-in failed: ${error.message}`);
      }
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  },

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },
};