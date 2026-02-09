import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { CapacityBar } from '@/components/ui/CapacityBar';
import { StatusBadge } from '@/components/ui/Badge';
import { getEventRoute } from '@/config/routes';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  userStatus?: string;
  className?: string;
}

export function EventCard({ event, userStatus, className = '' }: EventCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className={`cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${className}`}
      onClick={() => navigate(getEventRoute(event.id))}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">
          {event.name}
        </h3>
        {userStatus && <StatusBadge status={userStatus} />}
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4" />
          <span>{format(event.date, 'EEE, MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Clock className="w-4 h-4" />
          <span>
            {format(event.date, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{event.venueName}</span>
        </div>
      </div>

      <CapacityBar current={event.joinedCount} max={event.maxPlayers} />
    </Card>
  );
}

// Compact version for lists
interface EventCardCompactProps {
  event: Event;
  onClick?: () => void;
  className?: string;
}

export function EventCardCompact({ event, onClick, className = '' }: EventCardCompactProps) {
  return (
    <div
      onClick={onClick}
      className={`
        py-3 border-b border-slate-100 dark:border-slate-800 last:border-0
        ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-base font-medium text-slate-900 dark:text-slate-100">
          {event.name}
        </h4>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {event.joinedCount}/{event.maxPlayers}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{format(event.date, 'MMM d')}</span>
        <span>{format(event.date, 'h:mm a')}</span>
        <span className="truncate">{event.venueName}</span>
      </div>
    </div>
  );
}