import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Share, Plus, Square, Bell } from "lucide-react";

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Step-by-step guide for iOS users to install the PWA.
 * iOS requires manual "Add to Home Screen" action - no programmatic install.
 *
 * This is critical for iOS push notifications which ONLY work in installed PWAs.
 */
export function IOSInstallGuide({ isOpen, onClose }: IOSInstallGuideProps) {
  const steps = [
    {
      icon: ShareIcon,
      title: "Tap the Share button",
      description:
        "Find the Share button at the bottom of Safari (square with arrow pointing up)",
    },
    {
      icon: PlusSquareIcon,
      title: 'Tap "Add to Home Screen"',
      description: 'Scroll down in the share menu and tap "Add to Home Screen"',
    },
    {
      icon: Plus,
      title: 'Tap "Add"',
      description: 'Confirm by tapping "Add" in the top right corner',
    },
    {
      icon: AppIcon,
      title: "Open from Home Screen",
      description:
        "Find the Next Dink icon on your home screen and tap to open",
    },
    {
      icon: Bell,
      title: "Enable notifications",
      description:
        "Once opened from home screen, you can enable push notifications",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install Next Dink"
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Intro text */}
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Follow these steps to add Next Dink to your home screen. This enables
          push notifications and a better app-like experience.
        </p>

        {/* Steps */}
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              {/* Step number with icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <step.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>

              {/* Step content */}
              <div className="flex-1 pt-1">
                <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {index + 1}. {step.title}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Visual Guide */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-3">
            Look for this icon in Safari:
          </p>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2">
              <Share className="w-6 h-6 text-primary-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Share
              </span>
            </div>
          </div>
        </div>

        {/* Why Install? */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            Why install?
          </h4>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>• Get push notifications for event updates</li>
            <li>• Quick access from your home screen</li>
            <li>• Works offline for better reliability</li>
            <li>• Full screen experience without browser UI</li>
          </ul>
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Custom Share icon that matches iOS Safari
 */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Box */}
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      {/* Arrow */}
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

/**
 * Custom Plus Square icon for "Add to Home Screen"
 */
function PlusSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

/**
 * App icon representation
 */
function AppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        ND
      </text>
    </svg>
  );
}

// Suppress unused warnings for imported icons used for typing
void Square;
