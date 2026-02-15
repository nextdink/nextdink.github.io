import { User, UserPlus, X, LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import type { TeamRegistration, TeamMember } from "@/types/event.types";

interface RegistrationCardProps {
  registration: TeamRegistration;
  teamSize: number;
  isCurrentUserInTeam: boolean;
  canClaimSlot: boolean;
  canManage?: boolean; // Owner/admin flag
  currentUserId?: string;
  waitlistPosition?: number | null;
  onClaimSlot?: (memberIndex: number, slot: TeamMember) => void;
  onLeave?: () => void; // Leave team action
  onRemoveMember?: (memberIndex: number, member: TeamMember) => void;
  onFillOpenSlot?: (memberIndex: number) => void;
  className?: string;
}

export function RegistrationCard({
  registration,
  teamSize,
  isCurrentUserInTeam,
  canClaimSlot,
  canManage = false,
  currentUserId,
  waitlistPosition,
  onClaimSlot,
  onLeave,
  onRemoveMember,
  onFillOpenSlot,
  className = "",
}: RegistrationCardProps) {
  const isWaitlisted =
    waitlistPosition !== null && waitlistPosition !== undefined;

  // Get first member display info
  const firstMember = registration.members[0];
  const firstMemberName = firstMember?.displayName || "Unknown";

  // Check if first member is a guest (claimable)
  const isFirstMemberGuest = firstMember?.type === "guest";
  const isFirstMemberOpen = firstMember?.type === "open";

  const hasAdditionalMembers = teamSize > 1;

  // Check if current user is the first member
  const isCurrentUserFirstMember =
    firstMember?.type === "user" && firstMember?.userId === currentUserId;

  // Can current user manage this team's slots? (admin/owner OR any team member)
  const canManageTeamSlots = canManage || isCurrentUserInTeam;

  return (
    <Card className={`p-3 ${isWaitlisted ? "opacity-75" : ""} ${className}`}>
      {/* Header with first member info */}
      <div
        className={`flex items-center justify-between ${hasAdditionalMembers ? "mb-1" : ""}`}
      >
        <div className="flex items-center gap-2">
          {/* First member avatar */}
          {firstMember?.type === "user" ? (
            <Avatar
              src={firstMember.photoUrl}
              userId={firstMember.userId || undefined}
              displayName={firstMember.displayName}
              alt={firstMember.displayName || "User"}
              size="xsmall"
            />
          ) : firstMember?.type === "open" ? (
            <div className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center border border-dashed border-primary-300 dark:border-primary-700">
              <UserPlus className="w-3 h-3 text-primary-500" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <User className="w-3 h-3 text-slate-400" />
            </div>
          )}
          {/* First member name */}
          <span
            className={`text-sm ${
              isFirstMemberOpen
                ? "text-primary-600 dark:text-primary-400"
                : isFirstMemberGuest
                  ? "italic text-slate-500 dark:text-slate-400"
                  : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {isFirstMemberOpen ? "Open" : firstMemberName}
          </span>
          {/* Waitlist indicator */}
          {isWaitlisted && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              #{waitlistPosition}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Leave button for current user (first member) */}
          {isCurrentUserFirstMember && onLeave && (
            <button
              onClick={onLeave}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              title="Leave team"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Claim button for guest/open first member */}
          {(isFirstMemberGuest || isFirstMemberOpen) &&
            canClaimSlot &&
            !isCurrentUserInTeam &&
            onClaimSlot && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => onClaimSlot(0, firstMember)}
              >
                Claim
              </Button>
            )}

          {/* Remove icon for first member (admin/owner or team member can remove guests) */}
          {canManageTeamSlots &&
            onRemoveMember &&
            firstMember?.type === "guest" && (
              <button
                onClick={() => onRemoveMember(0, firstMember)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                title="Remove guest"
              >
                <X className="w-4 h-4" />
              </button>
            )}

          {/* Admin only: Remove icon for users (not yourself) */}
          {canManage &&
            onRemoveMember &&
            firstMember?.type === "user" &&
            firstMember?.userId !== currentUserId && (
              <button
                onClick={() => onRemoveMember(0, firstMember)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                title="Remove player"
              >
                <X className="w-4 h-4" />
              </button>
            )}

          {/* Add Guest button for open first slot */}
          {canManageTeamSlots && isFirstMemberOpen && onFillOpenSlot && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => onFillOpenSlot(0)}
            >
              Add Guest
            </Button>
          )}
        </div>
      </div>

      {/* Team members (only shown for team size > 1, skip first member at index 0) */}
      {teamSize > 1 && (
        <div className="space-y-0.5">
          {registration.members.slice(1).map((member, index) => {
            const memberIndex = index + 1;
            const isCurrentUser =
              member.type === "user" && member.userId === currentUserId;

            return (
              <div
                key={memberIndex}
                className="flex items-center justify-between min-h-9"
              >
                <div className="flex items-center gap-2">
                  {/* Member icon/avatar */}
                  {member.type === "user" ? (
                    <Avatar
                      src={member.photoUrl}
                      userId={member.userId || undefined}
                      displayName={member.displayName}
                      alt={member.displayName || "User"}
                      size="xsmall"
                    />
                  ) : member.type === "guest" ? (
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <User className="w-3 h-3 text-slate-400" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center border border-dashed border-primary-300 dark:border-primary-700">
                      <UserPlus className="w-3 h-3 text-primary-500" />
                    </div>
                  )}

                  {/* Member name */}
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

                <div className="flex items-center gap-1">
                  {/* Leave button for current user */}
                  {isCurrentUser && onLeave && (
                    <button
                      onClick={onLeave}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Leave team"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}

                  {/* Claim button for open/guest slots */}
                  {(member.type === "open" || member.type === "guest") &&
                    canClaimSlot &&
                    !isCurrentUserInTeam &&
                    onClaimSlot && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onClaimSlot(memberIndex, member)}
                      >
                        Claim
                      </Button>
                    )}

                  {/* Remove icon for guests (admin/owner or team member) */}
                  {canManageTeamSlots &&
                    onRemoveMember &&
                    member.type === "guest" && (
                      <button
                        onClick={() => onRemoveMember(memberIndex, member)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove guest"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                  {/* Admin only: Remove icon for users (not yourself) */}
                  {canManage &&
                    onRemoveMember &&
                    member.type === "user" &&
                    !isCurrentUser && (
                      <button
                        onClick={() => onRemoveMember(memberIndex, member)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove player"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                  {/* Add Guest button for open slots */}
                  {canManageTeamSlots &&
                    member.type === "open" &&
                    onFillOpenSlot && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onFillOpenSlot(memberIndex)}
                      >
                        Add Guest
                      </Button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
