import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { User, UserPlus } from 'lucide-react';
import type { TeamMember } from '@/types/event.types';

interface ClaimSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  slotIndex: number;
  slot: TeamMember;
  captainName: string;
  isLoading?: boolean;
}

export function ClaimSlotModal({
  isOpen,
  onClose,
  onConfirm,
  slotIndex,
  slot,
  captainName,
  isLoading = false,
}: ClaimSlotModalProps) {
  const isOpenSlot = slot.type === 'open';
  const isGuestSlot = slot.type === 'guest';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Group?">
      <div className="space-y-4">
        {/* Description */}
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {isOpenSlot && (
            <p>
              Join <span className="font-medium text-slate-900 dark:text-slate-100">{captainName}'s</span> group 
              by claiming their open spot.
            </p>
          )}
          {isGuestSlot && (
            <p>
              Join <span className="font-medium text-slate-900 dark:text-slate-100">{captainName}'s</span> group, 
              replacing <span className="font-medium text-slate-900 dark:text-slate-100">{slot.displayName}</span>.
            </p>
          )}
        </div>

        {/* Slot being claimed */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              {isOpenSlot ? (
                <UserPlus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {isOpenSlot ? 'Open Spot' : slot.displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isOpenSlot ? 'Looking for +1' : 'Guest (no account)'}
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Slot {slotIndex + 1}
            </span>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You'll be added to this group for the event. The group captain ({captainName}) 
          will be able to see you joined.
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            className="flex-1"
            loading={isLoading}
          >
            Join Group
          </Button>
        </div>
      </div>
    </Modal>
  );
}