import { useState } from "react";
import { Bell, BellOff, Smartphone, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useNotifications,
  useShouldPromptForNotifications,
} from "@/hooks/useNotifications";
import { IOSInstallGuide } from "./IOSInstallGuide";

interface NotificationPermissionCardProps {
  /** Custom class name */
  className?: string;
  /** Show as compact inline prompt */
  compact?: boolean;
  /** Called when notifications are enabled successfully */
  onEnabled?: () => void;
}

/**
 * Card component for prompting users to enable notifications
 *
 * Handles:
 * - Permission request flow
 * - iOS PWA installation guidance
 * - Denied permission instructions
 * - Already enabled state
 */
export function NotificationPermissionCard({
  className = "",
  compact = false,
  onEnabled,
}: NotificationPermissionCardProps) {
  const { permissionStatus, isEnabled, enableNotifications, needsIOSInstall } =
    useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleEnable = async () => {
    if (needsIOSInstall) {
      setShowIOSGuide(true);
      return;
    }

    setIsEnabling(true);
    try {
      const success = await enableNotifications();
      if (success && onEnabled) {
        onEnabled();
      }
    } finally {
      setIsEnabling(false);
    }
  };

  // If already enabled, show success state
  if (isEnabled) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Notifications enabled
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              You'll receive updates about your events
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If permission denied, show instructions
  if (permissionStatus === "denied") {
    return (
      <div className={`${className}`}>
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
            <BellOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Notifications blocked
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              To receive event updates, enable notifications in your browser
              settings:
            </p>
            <ol className="text-sm text-amber-600 dark:text-amber-400 mt-2 space-y-1 list-decimal list-inside">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Notifications" and change to "Allow"</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant
  if (compact) {
    return (
      <>
        <div
          className={`
            flex items-center justify-between gap-3 p-3
            bg-primary-50 dark:bg-primary-950/30
            border border-primary-200 dark:border-primary-800
            rounded-lg
            ${className}
          `}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {needsIOSInstall
                ? "Install app for notifications"
                : "Get notified about event updates"}
            </span>
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={handleEnable}
            loading={isEnabling}
          >
            {needsIOSInstall ? "Install" : "Enable"}
          </Button>
        </div>
        <IOSInstallGuide
          isOpen={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
        />
      </>
    );
  }

  // Full card variant
  return (
    <>
      <div
        className={`
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-800
          rounded-lg p-6
          ${className}
        `}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            {needsIOSInstall ? (
              <Smartphone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            ) : (
              <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {needsIOSInstall ? "Install Next Dink" : "Stay Updated"}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {needsIOSInstall
                ? "Add Next Dink to your home screen to enable push notifications."
                : "Get notified when:"}
            </p>

            {!needsIOSInstall && (
              <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  You're invited to an event
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  Someone joins your team
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  You're promoted from waitlist
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  Event details change
                </li>
              </ul>
            )}

            {/* Action */}
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={handleEnable}
                loading={isEnabling}
              >
                {needsIOSInstall
                  ? "Show Install Guide"
                  : "Enable Notifications"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <IOSInstallGuide
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
      />
    </>
  );
}

/**
 * Floating notification prompt that appears after certain actions
 * (e.g., after creating first event, after joining first event)
 */
export function NotificationPromptBanner({
  className = "",
}: {
  className?: string;
}) {
  const shouldPrompt = useShouldPromptForNotifications();
  const { enableNotifications, needsIOSInstall } = useNotifications();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!shouldPrompt || isDismissed) {
    return null;
  }

  const handleEnable = async () => {
    if (needsIOSInstall) {
      setShowIOSGuide(true);
      return;
    }

    setIsEnabling(true);
    try {
      await enableNotifications();
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <>
      <div
        className={`
          fixed bottom-20 left-4 right-4 z-40
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-800
          rounded-lg shadow-lg
          p-4
          animate-slide-up
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Want to stay updated?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get notified about event changes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="small"
              onClick={() => setIsDismissed(true)}
            >
              Later
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleEnable}
              loading={isEnabling}
            >
              Enable
            </Button>
          </div>
        </div>
      </div>

      <IOSInstallGuide
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
      />
    </>
  );
}

/**
 * Settings-style notification preferences toggle
 */
export function NotificationSettingsSection({
  className = "",
}: {
  className?: string;
}) {
  const {
    isEnabled,
    preferences,
    updatePreferences,
    isLoading,
    permissionStatus,
    enableNotifications,
    needsIOSInstall,
  } = useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleToggle = async (key: keyof typeof preferences) => {
    await updatePreferences({ [key]: !preferences[key] });
  };

  const handleEnableClick = async () => {
    if (needsIOSInstall) {
      setShowIOSGuide(true);
      return;
    }

    setIsEnabling(true);
    try {
      await enableNotifications();
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <>
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </h3>
          </div>

          {!isEnabled && (
            <Button
              variant="primary"
              size="small"
              onClick={handleEnableClick}
              loading={isEnabling}
            >
              {needsIOSInstall ? "Install App" : "Enable"}
            </Button>
          )}
        </div>

        {/* Permission status banner */}
        {permissionStatus === "denied" && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <Settings className="w-4 h-4" />
              <span>Notifications blocked. Enable in browser settings.</span>
            </div>
          </div>
        )}

        {needsIOSInstall && (
          <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300">
              <Smartphone className="w-4 h-4" />
              <span>
                Install the app to your home screen to enable notifications.
              </span>
            </div>
          </div>
        )}

        {/* Preference toggles (only shown if notifications are enabled) */}
        {isEnabled && !isLoading && (
          <div className="space-y-3">
            <ToggleItem
              label="Event invitations"
              description="When you're invited to join an event"
              checked={preferences.eventInvites}
              onChange={() => handleToggle("eventInvites")}
            />
            <ToggleItem
              label="Team updates"
              description="When someone joins or leaves your team"
              checked={preferences.slotClaimed}
              onChange={() => handleToggle("slotClaimed")}
            />
            <ToggleItem
              label="Waitlist promotion"
              description="When you're promoted from the waitlist"
              checked={preferences.waitlistPromotion}
              onChange={() => handleToggle("waitlistPromotion")}
            />
            <ToggleItem
              label="Event cancellations"
              description="When an event you joined is canceled"
              checked={preferences.eventCanceled}
              onChange={() => handleToggle("eventCanceled")}
            />
            <ToggleItem
              label="Event changes"
              description="When event details are updated"
              checked={preferences.eventUpdated}
              onChange={() => handleToggle("eventUpdated")}
            />
          </div>
        )}
      </div>

      <IOSInstallGuide
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
      />
    </>
  );
}

/**
 * Toggle item for preferences
 */
function ToggleItem({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {label}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div
          className={`
            w-11 h-6 rounded-full
            bg-slate-200 dark:bg-slate-700
            peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500
            peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2
            transition-colors
          `}
        />
        <div
          className={`
            absolute top-0.5 left-0.5
            w-5 h-5 rounded-full
            bg-white
            shadow-sm
            transition-transform
            peer-checked:translate-x-5
          `}
        />
      </div>
    </label>
  );
}
