import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/config/routes';

export function ProfileView() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <PageLayout title="Profile">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-6">
          <Avatar 
            src={user?.photoURL} 
            userId={user?.uid}
            displayName={user?.displayName}
            alt={user?.displayName || 'User'} 
            size="large" 
          />
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {user?.displayName || 'User'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user?.email}
          </p>
        </div>

        {/* Actions */}
        <Card>
          <button
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="flex items-center gap-3 w-full py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-4 px-4 first:rounded-t-lg"
          >
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="text-slate-900 dark:text-slate-100">Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-4 px-4 last:rounded-b-lg border-t border-slate-100 dark:border-slate-800"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Sign Out</span>
          </button>
        </Card>
      </div>
    </PageLayout>
  );
}