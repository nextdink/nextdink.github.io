import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { Spinner } from './Spinner';
import { userService } from '@/services/userService';
import type { UserProfile } from '@/types/user.types';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: UserProfile) => void;
  title?: string;
  excludeUserIds?: string[];
}

export function UserSearchModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Search Users',
  excludeUserIds = [],
}: UserSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await userService.searchByName(searchTerm.trim(), 20);
        // Filter out excluded users
        const filteredUsers = users.filter(u => !excludeUserIds.includes(u.id));
        setResults(filteredUsers);
        setHasSearched(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, excludeUserIds]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSelect = useCallback((user: UserProfile) => {
    onSelect(user);
    onClose();
  }, [onSelect, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Avatar
                    src={user.photoUrl}
                    userId={user.id}
                    displayName={user.displayName}
                    alt={user.displayName}
                  />
                  <span className="text-slate-900 dark:text-slate-100 font-medium truncate">
                    {user.displayName}
                  </span>
                </button>
              ))}
            </div>
          ) : hasSearched ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              No users found
            </p>
          ) : searchTerm ? null : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              Start typing to search for users
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}