import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { authService } from '@/services/authService';
import { AuthContext, type AuthContextType } from './authContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signInWithMicrosoft = async () => {
    await authService.signInWithMicrosoft();
  };

  const signInWithEmail = async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    await authService.signUpWithEmail(email, password, displayName);
  };

  const signOut = async () => {
    await authService.signOut();
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}