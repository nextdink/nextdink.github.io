import type { ReactNode } from 'react';

// Status badges for participant status
type StatusType = 'joined' | 'waitlisted' | 'invited_pending' | 'pending' | 'declined' | 'canceled';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  joined: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  waitlisted: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  invited_pending: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  pending: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  declined: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  canceled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
};

const statusLabels: Record<StatusType, string> = {
  joined: 'Joined',
  waitlisted: 'Waitlisted',
  invited_pending: 'Invited',
  pending: 'Pending',
  declined: 'Declined',
  canceled: 'Canceled',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as StatusType;
  const styles = statusStyles[normalizedStatus] || statusStyles.pending;
  const label = statusLabels[normalizedStatus] || status;
  
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md border ${styles} ${className}`}>
      {label}
    </span>
  );
}

// Role badges for event roles
type RoleType = 'owner' | 'admin' | 'player';

interface RoleBadgeProps {
  role: string;
  className?: string;
}

const roleStyles: Record<RoleType, string> = {
  owner: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950 dark:text-primary-400 dark:border-primary-800',
  admin: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
  player: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

const roleLabels: Record<RoleType, string> = {
  owner: 'Owner',
  admin: 'Admin',
  player: 'Player',
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const normalizedRole = role.toLowerCase() as RoleType;
  const styles = roleStyles[normalizedRole] || roleStyles.player;
  const label = roleLabels[normalizedRole] || role;
  
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md border ${styles} ${className}`}>
      {label}
    </span>
  );
}

// Generic badge component
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const variantStyles = {
  default: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Participant status badge (alias for StatusBadge for semantic clarity)
export const ParticipantStatusBadge = StatusBadge;
