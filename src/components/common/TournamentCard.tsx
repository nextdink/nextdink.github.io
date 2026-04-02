import { Calendar, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Tournament, TournamentFormat } from "@/types/tournament.types";
import { formatDateRange } from "@/types/tournament.types";

interface TournamentCardProps {
  tournament: Tournament;
  distance?: number;
  onClick?: () => void;
  className?: string;
}

const formatLabels: Record<TournamentFormat, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed: "Mixed",
  multi: "Multi-Format",
};

function getSkillLevelRange(skillLevels: string[]): string {
  if (skillLevels.length === 0) return "";
  if (skillLevels.length === 1) return skillLevels[0];
  const sorted = [...skillLevels].sort((a, b) => parseFloat(a) - parseFloat(b));
  return `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

export function TournamentCard({
  tournament,
  distance,
  onClick,
  className = "",
}: TournamentCardProps) {
  const formatLabel = formatLabels[tournament.format];
  const skillLevelRange = getSkillLevelRange(tournament.skillLevels);

  return (
    <Card
      className={`cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${className}`}
      onClick={onClick}
    >
      <h3 className="text-base font-medium text-primary-600 dark:text-primary-400 mb-2">
        {tournament.name}
      </h3>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDateRange(tournament.startDate, tournament.endDate)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{tournament.venueName}</span>
          {distance !== undefined && (
            <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">
              · {Math.round(distance)} mi
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="info">{formatLabel}</Badge>
          {tournament.skillLevels.length > 0 && (
            <Badge>{skillLevelRange}</Badge>
          )}
        </div>

        {tournament.entryFee && (
          <span className="text-sm text-slate-600 dark:text-slate-400 flex-shrink-0">
            {tournament.entryFee}
          </span>
        )}
      </div>
    </Card>
  );
}
