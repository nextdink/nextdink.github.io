import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ListCard } from '@/components/common/ListCard';
import { useAuth } from '@/hooks/useAuth';
import { useLists } from '@/hooks/useLists';
import { ROUTES } from '@/config/routes';

export function ListsView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lists, isLoading, error } = useLists(user?.uid);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">
            Failed to load lists. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header with Create button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            My Lists
          </h2>
          <Button onClick={() => navigate(ROUTES.CREATE_LIST)} size="small">
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>

        {/* Lists */}
        {lists.length > 0 ? (
          <div className="space-y-3">
            {lists.map(list => (
              <ListCard key={list.id} list={list} currentUserId={user?.uid} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No lists yet"
            description="Create a list to organize your regular pickleball players for easy event invitations"
            action={{
              label: 'Create List',
              onClick: () => navigate(ROUTES.CREATE_LIST),
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}