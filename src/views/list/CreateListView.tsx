import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { listService } from '@/services/listService';
import { useAuth } from '@/hooks/useAuth';
import { getListRoute } from '@/config/routes';

export function CreateListView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create a list');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a list name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const listId = await listService.create({ name: name.trim() }, user.uid);
      navigate(getListRoute(listId));
    } catch (err) {
      console.error('Failed to create list:', err);
      setError(err instanceof Error ? err.message : 'Failed to create list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Create List" showBack showBottomNav={false}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <Card>
          <div className="space-y-4">
            <Input
              label="List Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Saturday Morning Crew"
              required
              autoFocus
            />

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Lists help you organize players for quick event invitations. 
              Only you and list admins can see the list.
            </p>

            <Button type="submit" loading={loading} className="w-full">
              Create List
            </Button>
          </div>
        </Card>
      </form>
    </PageLayout>
  );
}