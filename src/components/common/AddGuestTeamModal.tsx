import { useState } from "react";
import { User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AddGuestTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (guestNames: string[]) => Promise<void>;
  teamSize: number;
  isLoading?: boolean;
}

export function AddGuestTeamModal({
  isOpen,
  onClose,
  onSubmit,
  teamSize,
  isLoading = false,
}: AddGuestTeamModalProps) {
  // Initialize guest names array based on team size
  const [guestNames, setGuestNames] = useState<string[]>(
    Array(teamSize).fill(""),
  );

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...guestNames];
    newNames[index] = name;
    setGuestNames(newNames);
  };

  const handleSubmit = async () => {
    await onSubmit(guestNames);
    // Reset form on success
    setGuestNames(Array(teamSize).fill(""));
  };

  const handleClose = () => {
    setGuestNames(Array(teamSize).fill(""));
    onClose();
  };

  // Validate form - all slots need names
  const isValid = guestNames.every((name) => name.trim().length > 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Guest Registration">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Add a registration for{" "}
          {teamSize === 1 ? "a guest" : `${teamSize} guests`} who{" "}
          {teamSize === 1 ? "doesn't have" : "don't have"} an account.
          {teamSize > 1 && " All members will be part of the same group."}
        </p>

        {/* Guest name inputs */}
        {guestNames.map((name, index) => (
          <div
            key={index}
            className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {teamSize === 1 ? "Guest" : `Guest ${index + 1}`}
              </span>
            </div>
            <Input
              placeholder="Enter guest name"
              value={name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              autoFocus={index === 0}
            />
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            Add {teamSize === 1 ? "Guest" : "Group"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
