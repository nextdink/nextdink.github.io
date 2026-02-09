import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import type { UserProfile } from '@/types';

interface UserRowProps {
  user: UserProfile;
  role?: string;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function UserRow({
  user,
  role,
  rightContent,
  onClick,
  className = '',
}: UserRowProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full py-3
        ${onClick ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer' : ''}
        ${className}
      `}
    >
      <Avatar 
        src={user.photoUrl} 
        userId={user.id} 
        displayName={user.displayName}
        alt={user.displayName} 
      />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-slate-900 dark:text-slate-100 truncate">
            {user.displayName}
          </span>
          {role && <RoleBadge role={role} />}
        </div>
      </div>
      {rightContent}
    </Component>
  );
}