import { User, UserPlus, LogOut, Edit, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { TeamRegistration, TeamMember } from "@/types/event.types";

interface RegistrationCardProps {
  registration: TeamRegistration;
  teamSize: number;
  isCurrentUserCaptain: boolean;
  isCurrentUserInTeam: boolean;
  canClaimSlot: boolean;
  waitlistPosition?: number | null;
  onClaimSlot?: (memberIndex: number, slot: TeamMember) => void;
  onEditTeam?: () => void;
  onLeaveTeam?: () => void;
  className?: string;
}

export function RegistrationCard({
  registration,
  teamSize,
  isCurrentUserCaptain,
  isCurrentUserInTeam,
  canClaimSlot,
  waitlistPosition,
  onClaimSlot,
  onEditTeam,
  onLeaveTeam,
  className = "",
}: RegistrationCardProps) {
  const isWaitlisted =
    waitlistPosition !== null && waitlistPosition !== undefined;

  // Get captain display info
  const captain = registration.members[0];
  const captainName = captain?.displayName || "Unknown";

  // Check if captain is a guest (claimable)
  const isCaptainGuest = captain?.type === "guest";

  const hasAdditionalMembers = teamSize > 1;

  return (
    <Card className={`p-3 ${isWaitlisted ? "opacity-75" : ""} ${className}`}>
      {/* Header with captain info */}
      <div
        className={`flex items-center justify-between ${hasAdditionalMembers ? "mb-1" : ""}`}
      >
        <div className="flex items-center gap-2">
          {/* Captain avatar */}
          {captain?.type === "user" && captain?.photoUrl ? (
            <img
              src={captain.photoUrl}
              alt=""
              className="w-6 h-6 rounded-full"
            />
          ) : isCaptainGuest ? (
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <User className="w-3 h-3 text-slate-400" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          {/* Captain name */}
          <span
            className={`text-sm ${isCaptainGuest ? "italic text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}
          >
            {captainName}
          </span>
          {/* Waitlist indicator */}
          {isWaitlisted && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              #{waitlistPosition}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Claim button for guest captain */}
          {isCaptainGuest &&
            canClaimSlot &&
            !isCurrentUserInTeam &&
            onClaimSlot && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => onClaimSlot(0, captain)}
              >
                Claim
              </Button>
            )}

          {/* Actions for captain */}
          {isCurrentUserCaptain && (
            <>
              {teamSize > 1 && onEditTeam && (
                <button
                  onClick={onEditTeam}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title="Edit team"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onLeaveTeam && (
                <button
                  onClick={onLeaveTeam}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  title="Leave event"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Team members (only shown for team size > 1, skip captain at index 0) */}
      {teamSize > 1 && (
        <div className="space-y-0.5">
          {registration.members.slice(1).map((member, index) => (
            <div key={index + 1} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Member icon/avatar */}
                {member.type === "user" ? (
                  member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )
                ) : member.type === "guest" ? (
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center border border-dashed border-primary-300 dark:border-primary-700">
                    <UserPlus className="w-3 h-3 text-primary-500" />
                  </div>
                )}

                {/* Member name only - no secondary text */}
                <span
                  className={`text-sm ${
                    member.type === "open"
                      ? "text-primary-600 dark:text-primary-400"
                      : member.type === "guest"
                        ? "italic text-slate-500 dark:text-slate-400"
                        : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {member.type === "user" && member.displayName}
                  {member.type === "guest" && (member.displayName || "Guest")}
                  {member.type === "open" && "Open"}
                </span>
              </div>

              {/* Claim button for open/guest slots */}
              {(member.type === "open" || member.type === "guest") &&
                canClaimSlot &&
                !isCurrentUserInTeam &&
                onClaimSlot && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onClaimSlot(index + 1, member)}
                  >
                    Claim
                  </Button>
                )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
