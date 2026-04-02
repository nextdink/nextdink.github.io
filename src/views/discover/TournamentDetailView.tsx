import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ExternalLink,
  DollarSign,
  Building2,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { tournamentService } from "@/services/tournamentService";
import type { Tournament, TournamentFormat } from "@/types/tournament.types";
import { formatDateRange } from "@/types/tournament.types";

const formatLabels: Record<TournamentFormat, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed: "Mixed",
  multi: "Multi-Format",
};

function formatSkillRange(levels: string[]): string {
  if (levels.length === 0) return "";
  const sorted = [...levels].sort((a, b) => parseFloat(a) - parseFloat(b));
  if (sorted.length === 1) return sorted[0];
  return `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

export function TournamentDetailView() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await tournamentService.getById(tournamentId);
      if (!result) {
        setError("Tournament not found.");
      } else {
        setTournament(result);
      }
    } catch {
      setError("Failed to load tournament.");
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!tournament) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${tournament.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await tournamentService.delete(tournament.id);
      navigate("/discover", { replace: true });
    } catch {
      setIsDeleting(false);
      alert("Failed to delete tournament. Please try again.");
    }
  };

  const handleRegister = () => {
    if (tournament?.registrationUrl) {
      window.open(tournament.registrationUrl, "_blank", "noopener,noreferrer");
    }
  };

  const mapsUrl = tournament
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournament.formattedAddress)}`
    : "";

  const isOwner = user?.uid === tournament?.submittedBy;

  if (isLoading) {
    return (
      <PageLayout title="Tournament">
        <PageSpinner />
      </PageLayout>
    );
  }

  if (error || !tournament) {
    return (
      <PageLayout title="Tournament">
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
          <p className="text-slate-600 dark:text-slate-400">
            {error || "Tournament not found."}
          </p>
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Tournament">
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tournament.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="info">{formatLabels[tournament.format]}</Badge>
            {tournament.skillLevels.length > 0 && (
              <Badge>{formatSkillRange(tournament.skillLevels)}</Badge>
            )}
          </div>
        </div>

        {/* Details card */}
        <Card className="space-y-4">
          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
            <span className="text-slate-900 dark:text-slate-100">
              {formatDateRange(tournament.startDate, tournament.endDate)}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {tournament.venueName}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {tournament.formattedAddress}
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-1"
              >
                Open in Maps
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Entry fee */}
          {tournament.entryFee && (
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
              <span className="text-slate-900 dark:text-slate-100">
                Entry Fee: {tournament.entryFee}
              </span>
            </div>
          )}

          {/* Organizer */}
          {tournament.organizerName && (
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
              <span className="text-slate-900 dark:text-slate-100">
                Organizer: {tournament.organizerName}
              </span>
            </div>
          )}
        </Card>

        {/* Description */}
        {tournament.description && (
          <Card>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {tournament.description}
            </p>
          </Card>
        )}

        {/* Register button */}
        {tournament.registrationUrl && (
          <Button className="w-full" onClick={handleRegister}>
            Register
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        )}

        {/* Source link */}
        {tournament.sourceUrl && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Source:{" "}
            <a
              href={tournament.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1"
            >
              {new URL(tournament.sourceUrl).hostname}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        )}

        {/* Delete button (owner only) */}
        {isOwner && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="danger"
              size="small"
              loading={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Tournament
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
