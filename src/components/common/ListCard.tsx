import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { RoleBadge } from '@/components/ui/Badge';
import { getListRoute } from '@/config/routes';
import type { List } from '@/types/list.types';

interface ListCardProps {
  list: List & { memberCount: number };
  currentUserId?: string;
}

export function ListCard({ list, currentUserId }: ListCardProps) {
  const navigate = useNavigate();
  const isOwner = currentUserId === list.ownerId;
  const isAdmin = currentUserId ? list.adminIds.includes(currentUserId) : false;

  return (
    <Card
      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      onClick={() => navigate(getListRoute(list.id))}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 truncate">
              {list.name}
            </h3>
            {isOwner && <RoleBadge role="owner" />}
            {!isOwner && isAdmin && <RoleBadge role="admin" />}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Users className="w-4 h-4" />
            <span>
              {list.memberCount} {list.memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
      </div>
    </Card>
  );
}