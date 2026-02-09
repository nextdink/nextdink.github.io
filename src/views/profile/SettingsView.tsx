import { useTheme } from '@/hooks/useTheme';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import type { Theme } from '@/context/themeContext';

export function SettingsView() {
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <PageLayout title="Settings" showBack showBottomNav={false}>
      <div className="space-y-6">
        <Card>
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3">
            Appearance
          </h3>
          <div className="space-y-2">
            {themeOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 py-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                  className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                />
                <span className="text-slate-900 dark:text-slate-100">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}