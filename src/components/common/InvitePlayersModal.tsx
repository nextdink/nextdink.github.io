import { useState } from 'react';
import { Search, Mail, UserPlus, X, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { eventService } from '@/services/eventService';
import { userService } from '@/services/userService';

interface InvitePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  invitedUserIds: string[];
  onInviteSuccess: () => void;
}

interface SearchResult {
  id: string;
  displayName: string;
  photoUrl: string | null;
  email?: string;
}

export function InvitePlayersModal({
  isOpen,
  onClose,
  eventId,
  invitedUserIds,
  onInviteSuccess,
}: InvitePlayersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      // Search for users by email or display name
      const results = await userService.searchUsers(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setError('No users found. Try a different search term.');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to search users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (userId: string, displayName: string) => {
    setInvitingUserId(userId);
    setError(null);

    try {
      await eventService.inviteUser(eventId, userId);
      setSuccessMessage(`${displayName} has been invited!`);
      onInviteSuccess();
      
      // Clear success message after 2 seconds
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Failed to invite:', err);
      setError('Failed to invite user. Please try again.');
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleRemoveInvite = async (userId: string) => {
    setInvitingUserId(userId);
    setError(null);

    try {
      await eventService.removeInvitation(eventId, userId);
      onInviteSuccess();
    } catch (err) {
      console.error('Failed to remove invite:', err);
      setError('Failed to remove invitation. Please try again.');
    } finally {
      setInvitingUserId(null);
    }
  };

  const isAlreadyInvited = (userId: string) => invitedUserIds.includes(userId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Players">
      <div className="space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by email or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} loading={isSearching}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {successMessage}
            </p>
          </div>
        )}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {user.displayName}
                    </p>
                    {user.email && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>

                {isAlreadyInvited(user.id) ? (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleRemoveInvite(user.id)}
                    loading={invitingUserId === user.id}
                    className="text-slate-500"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleInvite(user.id, user.displayName)}
                    loading={invitingUserId === user.id}
                  >
                    <Mail className="w-4 h-4" />
                    Invite
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {searchResults.length === 0 && !isSearching && !error && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Search for players by email or name to invite them.</p>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}