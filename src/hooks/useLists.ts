import { useState, useEffect, useCallback } from 'react';
import { listService } from '@/services/listService';
import type { List } from '@/types/list.types';

interface ListWithMemberCount extends List {
  memberCount: number;
}

interface UseListsResult {
  lists: ListWithMemberCount[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLists(userId: string | undefined): UseListsResult {
  const [lists, setLists] = useState<ListWithMemberCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLists = useCallback(async () => {
    if (!userId) {
      setLists([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get all lists user can access
      const accessibleLists = await listService.getAccessibleLists(userId);
      
      // Fetch member counts for each list
      const listsWithCounts: ListWithMemberCount[] = await Promise.all(
        accessibleLists.map(async (list) => {
          const memberCount = await listService.getMemberCount(list.id);
          return { ...list, memberCount };
        })
      );
      
      setLists(listsWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch lists'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  return {
    lists,
    isLoading,
    error,
    refetch: fetchLists,
  };
}