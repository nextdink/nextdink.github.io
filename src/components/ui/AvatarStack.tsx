import { Avatar } from "@/components/ui/Avatar";
import type { TeamMember } from "@/types/event.types";

type AvatarStackSize = "xsmall" | "small" | "default";

interface AvatarStackProps {
  /** Array of team members to display (open slots are filtered out) */
  members: TeamMember[];
  /** Maximum number of avatars to display before showing overflow */
  max?: number;
  /** Size of the avatars */
  size?: AvatarStackSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<
  AvatarStackSize,
  { avatar: string; overlap: string; badge: string }
> = {
  xsmall: {
    avatar: "w-6 h-6",
    overlap: "-ml-2",
    badge: "w-6 h-6 text-[10px]",
  },
  small: {
    avatar: "w-8 h-8",
    overlap: "-ml-2.5",
    badge: "w-8 h-8 text-xs",
  },
  default: {
    avatar: "w-10 h-10",
    overlap: "-ml-3",
    badge: "w-10 h-10 text-sm",
  },
};

/**
 * AvatarStack displays overlapping avatars for team members.
 * Only shows users and guests (filters out open slots).
 * Shows a "+N" badge when there are more members than the max display limit.
 */
export function AvatarStack({
  members,
  max = 4,
  size = "small",
  className = "",
}: AvatarStackProps) {
  // Filter to only show users and guests (not open slots)
  const displayableMembers = members.filter(
    (m) => m.type === "user" || m.type === "guest",
  );

  const visibleMembers = displayableMembers.slice(0, max);
  const overflowCount = displayableMembers.length - max;
  const styles = sizeStyles[size];

  if (displayableMembers.length === 0) {
    return (
      <div className={`flex items-center ${className}`}>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          No players yet
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {visibleMembers.map((member, index) => (
        <div
          key={member.userId || `guest-${index}`}
          className={`relative ${index > 0 ? styles.overlap : ""}`}
          style={{ zIndex: visibleMembers.length - index }}
        >
          <Avatar
            userId={member.userId || `guest-${member.displayName}-${index}`}
            displayName={member.displayName}
            photoUrl={member.photoUrl}
            size={size}
            alt={
              member.displayName ||
              (member.type === "guest" ? "Guest" : "Player")
            }
            className="ring-2 ring-white dark:ring-slate-900"
          />
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className={`
            ${styles.badge}
            ${styles.overlap}
            relative flex items-center justify-center
            rounded-full
            bg-slate-200 dark:bg-slate-700
            text-slate-600 dark:text-slate-300
            font-medium
            ring-2 ring-white dark:ring-slate-900
          `}
          style={{ zIndex: 0 }}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
