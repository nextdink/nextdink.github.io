import { useState } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { TeamMember } from '@/types/event.types';

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (members: TeamMember[]) => Promise<void>;
  teamSize: number;
  currentUserName: string;
  currentUserPhoto: string | null;
  isLoading?: boolean;
}

type SlotType = 'guest' | 'open';

interface SlotState {
  type: SlotType;
  guestName: string;
}

export function TeamRegistrationModal({
  isOpen,
  onClose,
  onSubmit,
  teamSize,
  currentUserName,
  currentUserPhoto,
  isLoading = false,
}: TeamRegistrationModalProps) {
  // Initialize slots for teammates (excluding captain at position 0)
  const [slots, setSlots] = useState<SlotState[]>(
    Array(teamSize - 1).fill(null).map(() => ({ type: 'open', guestName: '' }))
  );

  const handleSlotTypeChange = (index: number, type: SlotType) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], type, guestName: type === 'open' ? '' : newSlots[index].guestName };
    setSlots(newSlots);
  };

  const handleGuestNameChange = (index: number, name: string) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], guestName: name };
    setSlots(newSlots);
  };

  const handleSubmit = async () => {
    // Build team members array
    // First member is the captain (will be set by parent)
    const members: TeamMember[] = [
      { type: 'user' }, // Placeholder for captain - parent will fill this
      ...slots.map(slot => {
        if (slot.type === 'open') {
          return { type: 'open' as const };
        } else {
          return { 
            type: 'guest' as const, 
            displayName: slot.guestName.trim() || 'Guest' 
          };
        }
      }),
    ];

    await onSubmit(members);
  };

  // Validate form - guest slots need names
  const isValid = slots.every(slot => 
    slot.type === 'open' || (slot.type === 'guest' && slot.guestName.trim().length > 0)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Build Your Group">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Add {teamSize - 1} more {teamSize - 1 === 1 ? 'person' : 'people'} to complete your registration.
        </p>

        {/* Captain slot (you) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              {currentUserPhoto ? (
                <img src={currentUserPhoto} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {currentUserName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">You (Captain)</p>
            </div>
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
              Slot 1
            </span>
          </div>
        </div>

        {/* Additional slots */}
        {slots.map((slot, index) => (
          <div key={index} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Slot {index + 2}
              </span>
            </div>

            {/* Slot type selection */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSlotTypeChange(index, 'guest')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  slot.type === 'guest'
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <User className="w-4 h-4" />
                Add Guest
              </button>
              <button
                type="button"
                onClick={() => handleSlotTypeChange(index, 'open')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  slot.type === 'open'
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Looking for +1
              </button>
            </div>

            {/* Guest name input */}
            {slot.type === 'guest' && (
              <Input
                placeholder="Enter name"
                value={slot.guestName}
                onChange={(e) => handleGuestNameChange(index, e.target.value)}
                autoFocus
              />
            )}

            {/* Open slot info */}
            {slot.type === 'open' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anyone can claim this spot and join your group.
              </p>
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1" 
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            Register
          </Button>
        </div>
      </div>
    </Modal>
  );
}