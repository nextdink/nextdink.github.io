import { Sun, Moon, Monitor, Download } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card } from "@/components/ui/Card";
import { NotificationSettingsSection } from "@/components/common/NotificationPermissionCard";
import { InstallBanner } from "@/components/common/InstallBanner";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useTheme } from "@/hooks/useTheme";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { isInstalled, isStandalone } = useInstallPrompt();

  return (
    <PageLayout title="Settings" showBack showNotifications={false}>
      <div className="space-y-6">
        {/* Install App Banner (only if not installed) */}
        {!isInstalled && !isStandalone && <InstallBanner />}

        {/* Notifications */}
        <Card>
          <NotificationSettingsSection />
        </Card>

        {/* Appearance */}
        <Card>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Appearance
          </h3>
          <div className="space-y-2">
            <ThemeOption
              icon={Sun}
              label="Light"
              description="Always use light theme"
              selected={theme === "light"}
              onClick={() => setTheme("light")}
            />
            <ThemeOption
              icon={Moon}
              label="Dark"
              description="Always use dark theme"
              selected={theme === "dark"}
              onClick={() => setTheme("dark")}
            />
            <ThemeOption
              icon={Monitor}
              label="System"
              description="Match your device settings"
              selected={theme === "system"}
              onClick={() => setTheme("system")}
            />
          </div>
        </Card>

        {/* App Info (only if installed) */}
        {(isInstalled || isStandalone) && (
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <Download className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Next Dink
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Installed as app • Version 1.0.0
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* About */}
        <Card>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            About
          </h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p>
              Next Dink helps you organize serious pickleball games with
              controlled capacity and clear participation. No more group text
              chaos.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 pt-2">
              © {new Date().getFullYear()} Next Dink
            </p>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}

/**
 * Theme option radio button
 */
function ThemeOption({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors
        ${
          selected
            ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800"
            : "bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
        }
      `}
    >
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${
            selected
              ? "bg-primary-100 dark:bg-primary-900"
              : "bg-slate-200 dark:bg-slate-700"
          }
        `}
      >
        <Icon
          className={`
            w-5 h-5
            ${
              selected
                ? "text-primary-600 dark:text-primary-400"
                : "text-slate-500 dark:text-slate-400"
            }
          `}
        />
      </div>
      <div className="flex-1">
        <span
          className={`
            text-sm font-medium
            ${
              selected
                ? "text-primary-700 dark:text-primary-300"
                : "text-slate-900 dark:text-slate-100"
            }
          `}
        >
          {label}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      {/* Radio indicator */}
      <div
        className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center
          ${
            selected
              ? "border-primary-600 dark:border-primary-400"
              : "border-slate-300 dark:border-slate-600"
          }
        `}
      >
        {selected && (
          <div className="w-2.5 h-2.5 rounded-full bg-primary-600 dark:bg-primary-400" />
        )}
      </div>
    </button>
  );
}
