import { useState, useEffect, useCallback } from 'react';
import { listService } from '@/services/listService';
import { userService } from '@/services/userService';
import type { List, ListMember } from '@/types/list.types';

interface ListMemberWithProfile extends ListMember {
  displayName: string;
  photoUrl: string | null;
}

interface UseListResult {
  list: List | null;
  members: ListMemberWithProfile[];
  isLoading: boolean;
  error: Error | null;
  isOwner: boolean;
  isAdmin: boolean;
  canManage: boolean;
  refetch: () => Promise<void>;
  addMember: (userId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  addAdmin: (userId: string) => Promise<void>;
  removeAdmin: (userId: string) => Promise<void>;
  updateList: (name: string) => Promise<void>;
  deleteList: () => Promise<void>;
}

export function useList(listId: string | undefined, currentUserId: string | undefined): UseListResult {
  const [list, setList] = useState<List | null>(null);
  const [members, setMembers] = useState<ListMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    if (!listId) {
      setList(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch list data
      const listData = await listService.getById(listId);
      if (!listData) {
        throw new Error('List not found');
      }
      setList(listData);

      // Fetch members
      const membersList = await listService.getMembers(listId);
      
      // Fetch user profiles for members
      if (membersList.length > 0) {
        const userIds = membersList.map(m => m.id);
        const userProfiles = await userService.getByIds(userIds);
        const profileMap = new Map(userProfiles.map(p => [p.id, p]));
        
        const membersWithProfiles: ListMemberWithProfile[] = membersList.map(member => {
          const profile = profileMap.get(member.id);
          return {
            ...member,
            displayName: profile?.displayName || 'Unknown User',
            photoUrl: profile?.photoUrl || null,
          };
        });
        
        // Sort by added date (newest first)
        membersWithProfiles.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch list'));
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const isOwner = !!(list && currentUserId && list.ownerId === currentUserId);
  const isAdmin = !!(list && currentUserId && list.adminIds.includes(currentUserId));
  const canManage = isOwner || isAdmin;

  const addMember = useCallback(async (userId: string) => {
    if (!listId || !currentUserId || !canManage) {
      throw new Error('Cannot add member');
    }
    await listService.addMember(listId, userId, currentUserId);
    await fetchList();
  }, [listId, currentUserId, canManage, fetchList]);

  const removeMember = useCallback(async (userId: string) => {
    if (!listId || !canManage) {
      throw new Error('Cannot remove member');
    }
    await listService.removeMember(listId, userId);
    await fetchList();
  }, [listId, canManage, fetchList]);

  const addAdmin = useCallback(async (userId: string) => {
    if (!listId || !isOwner) {
      throw new Error('Only owner can add admins');
    }
    await listService.addAdmin(listId, userId);
    await fetchList();
  }, [listId, isOwner, fetchList]);

  const removeAdmin = useCallback(async (userId: string) => {
    if (!listId || !isOwner) {
      throw new Error('Only owner can remove admins');
    }
    await listService.removeAdmin(listId, userId);
    await fetchList();
  }, [listId, isOwner, fetchList]);

  const updateList = useCallback(async (name: string) => {
    if (!listId || !canManage) {
      throw new Error('Cannot update list');
    }
    await listService.update(listId, { name });
    await fetchList();
  }, [listId, canManage, fetchList]);

  const deleteList = useCallback(async () => {
    if (!listId || !isOwner) {
      throw new Error('Only owner can delete list');
    }
    await listService.delete(listId);
  }, [listId, isOwner]);

  return {
    list,
    members,
    isLoading,
    error,
    isOwner,
    isAdmin,
    canManage,
    refetch: fetchList,
    addMember,
    removeMember,
    addAdmin,
    removeAdmin,
    updateList,
    deleteList,
  };
}