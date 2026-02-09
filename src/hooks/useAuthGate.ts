import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

interface UseAuthGateOptions {
  title?: string;
  message?: string;
}

interface UseAuthGateResult {
  /**
   * Call this to require authentication before performing an action.
   * If user is authenticated, the action executes immediately.
   * If not, shows the auth modal and executes the action after successful auth.
   */
  requireAuth: (action: () => void | Promise<void>) => void;
  
  /**
   * Whether the auth modal is currently open
   */
  isAuthModalOpen: boolean;
  
  /**
   * Close the auth modal (cancels the pending action)
   */
  closeAuthModal: () => void;
  
  /**
   * Called when auth succeeds - executes the pending action
   */
  onAuthSuccess: () => void;
  
  /**
   * Custom title for the auth modal
   */
  modalTitle: string;
  
  /**
   * Custom message for the auth modal
   */
  modalMessage: string;
}

export function useAuthGate(options: UseAuthGateOptions = {}): UseAuthGateResult {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const modalTitle = options.title || 'Sign in to continue';
  const modalMessage = options.message || 'You need to sign in to perform this action.';
  
  // Store the pending action as a ref to avoid re-renders
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  const requireAuth = useCallback((action: () => void | Promise<void>) => {
    if (user) {
      // User is already authenticated, execute immediately
      action();
    } else {
      // Store the action and show the auth modal
      pendingActionRef.current = action;
      setIsAuthModalOpen(true);
    }
  }, [user]);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    pendingActionRef.current = null;
  }, []);

  const onAuthSuccess = useCallback(() => {
    setIsAuthModalOpen(false);
    
    // Execute the pending action if there is one
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      // Execute after a small delay to ensure auth state has propagated
      setTimeout(() => {
        action();
      }, 100);
    }
  }, []);

  return {
    requireAuth,
    isAuthModalOpen,
    closeAuthModal,
    onAuthSuccess,
    modalTitle,
    modalMessage,
  };
}

/**
 * A more specific version of useAuthGate with customizable messages per action
 */
export function useAuthGateWithMessage(): {
  requireAuth: (action: () => void | Promise<void>, title?: string, message?: string) => void;
  isAuthModalOpen: boolean;
  closeAuthModal: () => void;
  onAuthSuccess: () => void;
  modalTitle: string;
  modalMessage: string;
} {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Sign in to continue');
  const [modalMessage, setModalMessage] = useState('You need to sign in to perform this action.');
  
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  const requireAuth = useCallback((
    action: () => void | Promise<void>,
    title = 'Sign in to continue',
    message = 'You need to sign in to perform this action.'
  ) => {
    if (user) {
      action();
    } else {
      pendingActionRef.current = action;
      setModalTitle(title);
      setModalMessage(message);
      setIsAuthModalOpen(true);
    }
  }, [user]);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    pendingActionRef.current = null;
  }, []);

  const onAuthSuccess = useCallback(() => {
    setIsAuthModalOpen(false);
    
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setTimeout(() => {
        action();
      }, 100);
    }
  }, []);

  return {
    requireAuth,
    isAuthModalOpen,
    closeAuthModal,
    onAuthSuccess,
    modalTitle,
    modalMessage,
  };
}