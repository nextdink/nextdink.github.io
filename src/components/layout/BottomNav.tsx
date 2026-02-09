import { NavLink } from 'react-router-dom';
import { Home, Compass, User } from 'lucide-react';
import { ROUTES } from '@/config/routes';

const navItems = [
  { to: ROUTES.HOME, icon: Home, label: 'Home' },
  { to: ROUTES.DISCOVER, icon: Compass, label: 'Discover' },
  { to: ROUTES.PROFILE, icon: User, label: 'Profile' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-lg mx-auto h-16 flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center
              w-16 h-full
              text-xs font-medium
              transition-colors
              ${isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }
            `}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}