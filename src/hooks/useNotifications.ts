import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  registerDeviceForNotifications,
  getNotificationStatus,
  getNotificationPreferences,
  updateNotificationPreferences,
  subscribeToForegroundNotifications,
  type NotificationPreferences,
  type ForegroundNotification,
  defaultNotificationPreferences,
} from "@/services/notificationService";
import { useInstallPrompt, isPushSupported } from "@/hooks/useInstallPrompt";

/**
 * Notification permission states
 */
export type NotificationPermissionStatus =
  | "granted" // User has granted permission
  | "denied" // User has denied permission
  | "default" // User hasn't been asked yet
  | "unsupported" // Browser doesn't support notifications
  | "needs-install"; // iOS: needs to install PWA first

/**
 * Hook return type
 */
interface UseNotificationsReturn {
  /** Current permission status */
  permissionStatus: NotificationPermissionStatus;
  /** Whether push notifications are available in this environment */
  isSupported: boolean;
  /** Whether user has enabled notifications */
  isEnabled: boolean;
  /** User's notification preferences */
  preferences: NotificationPreferences;
  /** Whether we're loading preferences */
  isLoading: boolean;
  /** Request permission and register for notifications */
  enableNotifications: () => Promise<boolean>;
  /** Update notification preferences */
  updatePreferences: (
    updates: Partial<NotificationPreferences>,
  ) => Promise<void>;
  /** Whether iOS user needs to install the app first */
  needsIOSInstall: boolean;
  /** Latest foreground notification (for showing in-app) */
  latestNotification: ForegroundNotification | null;
  /** Clear the latest notification */
  clearLatestNotification: () => void;
}

/**
 * Hook for managing push notifications
 *
 * Provides:
 * - Permission status detection
 * - iOS PWA install requirement detection
 * - Enable/disable notifications
 * - Notification preferences management
 * - Foreground notification handling
 *
 * @example
 * ```tsx
 * function NotificationSettings() {
 *   const {
 *     permissionStatus,
 *     isEnabled,
 *     enableNotifications,
 *     needsIOSInstall,
 *   } = useNotifications();
 *
 *   if (needsIOSInstall) {
 *     return <IOSInstallPrompt />;
 *   }
 *
 *   if (permissionStatus === 'denied') {
 *     return <p>Notifications blocked. Enable in browser settings.</p>;
 *   }
 *
 *   return (
 *     <button onClick={enableNotifications}>
 *       {isEnabled ? 'Notifications On' : 'Enable Notifications'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const { isIOS, isStandalone } = useInstallPrompt();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [latestNotification, setLatestNotification] =
    useState<ForegroundNotification | null>(null);

  // Determine permission status
  const permissionStatus = useMemo((): NotificationPermissionStatus => {
    // Check if iOS and not installed as PWA
    if (isIOS && !isStandalone) {
      return "needs-install";
    }

    const status = getNotificationStatus();

    if (!status.supported) {
      return "unsupported";
    }

    return status.permission as NotificationPermissionStatus;
  }, [isIOS, isStandalone]);

  // Check if push is supported
  const isSupported = useMemo(() => {
    // iOS needs PWA installation
    if (isIOS && !isStandalone) {
      return false;
    }
    return isPushSupported();
  }, [isIOS, isStandalone]);

  // Whether notifications are currently enabled
  const isEnabled = permissionStatus === "granted";

  // Whether iOS user needs to install first
  const needsIOSInstall = isIOS && !isStandalone;

  // Load user preferences
  useEffect(() => {
    if (!user?.uid) {
      setPreferences(defaultNotificationPreferences);
      return;
    }

    let mounted = true;

    async function loadPreferences() {
      setIsLoading(true);
      try {
        const prefs = await getNotificationPreferences(user!.uid);
        if (mounted) {
          setPreferences(prefs);
        }
      } catch (error) {
        console.error("Error loading notification preferences:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Set up foreground notification listener
  useEffect(() => {
    if (!isEnabled || !user?.uid) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    async function setupListener() {
      unsubscribe = await subscribeToForegroundNotifications((notification) => {
        setLatestNotification(notification);

        // Auto-clear after 10 seconds
        setTimeout(() => {
          setLatestNotification((current) =>
            current === notification ? null : current,
          );
        }, 10000);
      });
    }

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isEnabled, user?.uid]);

  /**
   * Request permission and register for notifications
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) {
      console.warn("Cannot enable notifications: user not logged in");
      return false;
    }

    if (needsIOSInstall) {
      console.warn(
        "Cannot enable notifications: iOS requires PWA installation",
      );
      return false;
    }

    if (!isSupported) {
      console.warn("Cannot enable notifications: not supported");
      return false;
    }

    try {
      const success = await registerDeviceForNotifications(user.uid);
      return success;
    } catch (error) {
      console.error("Error enabling notifications:", error);
      return false;
    }
  }, [user?.uid, needsIOSInstall, isSupported]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>): Promise<void> => {
      if (!user?.uid) {
        console.warn("Cannot update preferences: user not logged in");
        return;
      }

      try {
        await updateNotificationPreferences(user.uid, updates);
        setPreferences((prev) => ({ ...prev, ...updates }));
      } catch (error) {
        console.error("Error updating notification preferences:", error);
        throw error;
      }
    },
    [user?.uid],
  );

  /**
   * Clear the latest notification
   */
  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  return {
    permissionStatus,
    isSupported,
    isEnabled,
    preferences,
    isLoading,
    enableNotifications,
    updatePreferences,
    needsIOSInstall,
    latestNotification,
    clearLatestNotification,
  };
}

/**
 * Hook to check if we should prompt for notifications
 * Returns true if:
 * - User is logged in
 * - Notifications are supported
 * - Permission hasn't been denied
 * - User hasn't enabled yet
 */
export function useShouldPromptForNotifications(): boolean {
  const { user } = useAuth();
  const { permissionStatus, isSupported, isEnabled, needsIOSInstall } =
    useNotifications();

  // Don't prompt if not logged in
  if (!user) {
    return false;
  }

  // Don't prompt if already enabled
  if (isEnabled) {
    return false;
  }

  // Don't prompt if denied (they need to change browser settings)
  if (permissionStatus === "denied") {
    return false;
  }

  // For iOS, we might want to prompt to install the PWA
  if (needsIOSInstall) {
    return true;
  }

  // Don't prompt if not supported
  if (!isSupported) {
    return false;
  }

  // Prompt if default (not asked yet)
  return permissionStatus === "default";
}
