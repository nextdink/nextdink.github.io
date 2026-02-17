import { useState, useEffect, useCallback } from "react";

/**
 * BeforeInstallPromptEvent interface
 * This event is fired by Chrome/Edge when the PWA install criteria are met
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Storage key for dismissal state
 */
const INSTALL_DISMISSED_KEY = "nextdink_install_dismissed";
const INSTALL_DISMISSED_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

interface InstallPromptState {
  /** Whether the native install prompt can be triggered (Android/Chrome) */
  canPromptInstall: boolean;
  /** Whether the app is already installed */
  isInstalled: boolean;
  /** Whether the device is iOS */
  isIOS: boolean;
  /** Whether the device is Android */
  isAndroid: boolean;
  /** Whether the app is running in standalone mode (installed PWA) */
  isStandalone: boolean;
  /** Whether the user has dismissed the install banner recently */
  isDismissed: boolean;
  /** Trigger the native install prompt (Android/Chrome) */
  promptInstall: () => Promise<boolean>;
  /** Dismiss the install banner */
  dismissInstallBanner: () => void;
  /** Reset the dismissal state */
  resetDismissal: () => void;
}

/**
 * Hook for managing PWA installation prompts
 *
 * Handles both:
 * - Android/Chrome: Native install prompt via beforeinstallprompt event
 * - iOS: Detection for showing custom "Add to Home Screen" instructions
 *
 * @example
 * ```tsx
 * const { isIOS, isStandalone, canPromptInstall, promptInstall } = useInstallPrompt();
 *
 * if (isStandalone) {
 *   // App is already installed
 *   return null;
 * }
 *
 * if (isIOS) {
 *   // Show iOS-specific instructions
 *   return <IOSInstallGuide />;
 * }
 *
 * if (canPromptInstall) {
 *   // Show install button
 *   return <button onClick={promptInstall}>Install App</button>;
 * }
 * ```
 */
/**
 * Detect platform information (computed once, no state needed)
 */
function detectPlatform() {
  if (typeof window === "undefined") {
    return { isIOS: false, isAndroid: false, isStandalone: false };
  }

  // Check if running in standalone mode (installed PWA)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone check
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true ||
    // Android TWA check
    document.referrer.includes("android-app://");

  // Detect iOS
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Detect Android
  const isAndroid = /Android/.test(navigator.userAgent);

  return { isIOS, isAndroid, isStandalone };
}

/**
 * Check dismissal state from localStorage
 */
function checkDismissalState(): boolean {
  if (typeof window === "undefined") return false;

  const dismissedData = localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (dismissedData) {
    try {
      const { timestamp } = JSON.parse(dismissedData);
      const isExpired = Date.now() - timestamp > INSTALL_DISMISSED_EXPIRY;
      if (isExpired) {
        localStorage.removeItem(INSTALL_DISMISSED_KEY);
        return false;
      }
      return true;
    } catch {
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
      return false;
    }
  }
  return false;
}

export function useInstallPrompt(): InstallPromptState {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(checkDismissalState);

  // Compute platform detection once (stable values)
  const platform = detectPlatform();

  useEffect(() => {
    // Listen for the beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome from showing the mini-infobar
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if already installed via display-mode change
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  /**
   * Trigger the native install prompt
   * Returns true if the user accepted the install
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      await installPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await installPrompt.userChoice;

      // Clear the stored prompt (can only be used once)
      setInstallPrompt(null);

      if (outcome === "accepted") {
        setIsInstalled(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error prompting install:", error);
      return false;
    }
  }, [installPrompt]);

  /**
   * Dismiss the install banner for a period of time
   */
  const dismissInstallBanner = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(
      INSTALL_DISMISSED_KEY,
      JSON.stringify({ timestamp: Date.now() }),
    );
  }, []);

  /**
   * Reset the dismissal state (for testing or settings)
   */
  const resetDismissal = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem(INSTALL_DISMISSED_KEY);
  }, []);

  return {
    canPromptInstall: !!installPrompt,
    isInstalled: isInstalled || platform.isStandalone,
    isIOS: platform.isIOS,
    isAndroid: platform.isAndroid,
    isStandalone: platform.isStandalone,
    isDismissed,
    promptInstall,
    dismissInstallBanner,
    resetDismissal,
  };
}

/**
 * Utility function to check if push notifications are supported
 * Note: On iOS, this requires the app to be installed as a PWA first
 */
export function isPushSupported(): boolean {
  return "PushManager" in window && "serviceWorker" in navigator;
}

/**
 * Utility function to check if the app is running on iOS in a browser
 * (not as an installed PWA)
 */
export function isIOSBrowser(): boolean {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  return isIOS && !isStandalone;
}
