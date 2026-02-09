import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/config/routes';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  rightContent?: React.ReactNode;
}

export function Header({
  title,
  showBack = false,
  showNotifications = true,
  rightContent,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {title && (
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h1>
          )}
          {!title && !showBack && (
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
              Next Dink
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {rightContent}
          {showNotifications && (
            <button
              onClick={() => navigate(ROUTES.NOTIFICATIONS)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge - will be controlled by state later */}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Notification badge component to use with Header
interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
}