import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useState } from "react";
import { IOSInstallGuide } from "./IOSInstallGuide";

interface InstallBannerProps {
  /** Custom class name for positioning */
  className?: string;
}

/**
 * A banner that prompts users to install the PWA.
 * - On Android/Chrome: Shows a button to trigger native install prompt
 * - On iOS: Shows instructions to add to home screen
 * - Dismissible for 7 days
 * - Hidden when app is already installed
 */
export function InstallBanner({ className = "" }: InstallBannerProps) {
  const {
    canPromptInstall,
    isInstalled,
    isIOS,
    isStandalone,
    isDismissed,
    promptInstall,
    dismissInstallBanner,
  } = useInstallPrompt();

  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't show if:
  // - Already installed / running in standalone mode
  // - User has dismissed recently
  // - Not on a supported platform (no install prompt and not iOS)
  if (isInstalled || isStandalone || isDismissed) {
    return null;
  }

  // Only show if we can prompt install (Android/Chrome) or on iOS
  if (!canPromptInstall && !isIOS) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <div
        className={`
          bg-primary-50 dark:bg-primary-950/50
          border border-primary-200 dark:border-primary-800
          rounded-lg p-4
          ${className}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <Download className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Install Next Dink
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {isIOS
                ? "Add to your home screen for the best experience and push notifications."
                : "Install the app for quick access and push notifications."}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="primary"
                size="small"
                onClick={handleInstall}
                loading={isInstalling}
              >
                {isIOS ? "Show Me How" : "Install"}
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={dismissInstallBanner}
              >
                Not Now
              </Button>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissInstallBanner}
            className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      <IOSInstallGuide
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
      />
    </>
  );
}

/**
 * A minimal banner variant for use in headers or other compact spaces
 */
export function InstallBannerCompact({ className = "" }: InstallBannerProps) {
  const {
    canPromptInstall,
    isInstalled,
    isIOS,
    isStandalone,
    isDismissed,
    promptInstall,
    dismissInstallBanner,
  } = useInstallPrompt();

  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (
    isInstalled ||
    isStandalone ||
    isDismissed ||
    (!canPromptInstall && !isIOS)
  ) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await promptInstall();
    }
  };

  return (
    <>
      <div
        className={`
          flex items-center justify-between gap-2
          bg-primary-600 dark:bg-primary-500
          text-white dark:text-slate-950
          px-4 py-2
          text-sm
          ${className}
        `}
      >
        <span className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>Install Next Dink for the best experience</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="font-medium underline hover:no-underline"
          >
            {isIOS ? "How?" : "Install"}
          </button>
          <button
            onClick={dismissInstallBanner}
            className="p-1 hover:bg-primary-700 dark:hover:bg-primary-400 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <IOSInstallGuide
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
      />
    </>
  );
}
