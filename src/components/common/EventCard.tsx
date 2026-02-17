import { useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Crown,
  Shield,
  Check,
  Clock3,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { getEventRoute } from "@/config/routes";
import type { Event } from "@/types/event.types";
import {
  getTotalCapacity,
  getJoinedMembers,
  getJoinedPlayersCount,
  getOpenSlotsCount,
} from "@/types/event.types";
import type {
  UserEventStatus,
  UserRegistrationStatus,
} from "@/hooks/useEvents";

interface EventCardProps {
  event: Event;
  userStatus?: UserEventStatus;
  registrationStatus?: UserRegistrationStatus; // For owner/admin who also joined
  waitlistPosition?: number;
  isDeclined?: boolean;
  className?: string;
  actions?: React.ReactNode; // Custom action buttons (e.g., Accept/Decline for invites)
}

// Status badge component
function UserStatusBadge({
  status,
  waitlistPosition,
}: {
  status: UserEventStatus;
  waitlistPosition?: number;
}) {
  const badges: Record<
    UserEventStatus,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    owner: {
      icon: <Crown className="w-3 h-3" />,
      label: "Owner",
      className:
        "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
    },
    admin: {
      icon: <Shield className="w-3 h-3" />,
      label: "Admin",
      className:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
    },
    going: {
      icon: <Check className="w-3 h-3" />,
      label: "Going",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    },
    waitlisted: {
      icon: <Clock3 className="w-3 h-3" />,
      label: waitlistPosition
        ? `Waitlisted #${waitlistPosition}`
        : "Waitlisted",
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    },
    invited: {
      icon: null,
      label: "Invited",
      className:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    },
    declined: {
      icon: <X className="w-3 h-3" />,
      label: "Declined",
      className:
        "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    },
  };

  const badge = badges[status];
  if (!badge) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${badge.className}`}
    >
      {badge.icon}
      {badge.label}
    </span>
  );
}

export function EventCard({
  event,
  userStatus,
  registrationStatus,
  waitlistPosition,
  isDeclined = false,
  className = "",
  actions,
}: EventCardProps) {
  const navigate = useNavigate();

  // Calculate capacity from registrations
  const totalCapacity = getTotalCapacity(event);
  const joinedMembers = getJoinedMembers(event);
  const playerCount = getJoinedPlayersCount(event);
  const openSlots = getOpenSlotsCount(event);

  // Declined events get muted styling
  const cardClassName = isDeclined
    ? `cursor-pointer opacity-60 hover:opacity-80 transition-opacity ${className}`
    : `cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${className}`;

  // Determine if we need to show secondary badge (for owner/admin who also joined)
  const showRegistrationBadge =
    registrationStatus &&
    registrationStatus !== "not_registered" &&
    (userStatus === "owner" || userStatus === "admin");

  return (
    <Card
      className={cardClassName}
      onClick={() => navigate(getEventRoute(event.eventCode))}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-medium text-primary-600 dark:text-primary-400 flex-1 mr-2">
          {event.name}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {userStatus && (
            <UserStatusBadge
              status={userStatus}
              waitlistPosition={
                userStatus === "waitlisted" ? waitlistPosition : undefined
              }
            />
          )}
          {showRegistrationBadge && (
            <UserStatusBadge
              status={registrationStatus as UserEventStatus}
              waitlistPosition={
                registrationStatus === "waitlisted"
                  ? waitlistPosition
                  : undefined
              }
            />
          )}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4" />
          <span>
            {format(event.date, "EEE, MMM d")} · {format(event.date, "h:mm a")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{event.venueName}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <AvatarStack members={joinedMembers} max={4} size="small" />
        <div className="text-sm text-slate-600 dark:text-slate-400 text-right">
          <span>
            {playerCount} / {totalCapacity}
          </span>
          {openSlots > 0 && (
            <span className="text-primary-600 dark:text-primary-400">
              {" "}
              • {openSlots} open
            </span>
          )}
        </div>
      </div>

      {actions && (
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
          {actions}
        </div>
      )}
    </Card>
  );
}

// Compact version for lists
interface EventCardCompactProps {
  event: Event;
  onClick?: () => void;
  className?: string;
}

export function EventCardCompact({
  event,
  onClick,
  className = "",
}: EventCardCompactProps) {
  const totalCapacity = getTotalCapacity(event);
  const playerCount = getJoinedPlayersCount(event);

  return (
    <div
      onClick={onClick}
      className={`
        py-3 border-b border-slate-100 dark:border-slate-800 last:border-0
        ${onClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-base font-medium text-slate-900 dark:text-slate-100">
          {event.name}
        </h4>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {playerCount}/{totalCapacity}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{format(event.date, "MMM d")}</span>
        <span>{format(event.date, "h:mm a")}</span>
        <span className="truncate">{event.venueName}</span>
      </div>
    </div>
  );
}
