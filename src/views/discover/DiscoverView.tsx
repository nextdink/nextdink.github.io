import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, MapPin, Plus, ExternalLink } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { LocationInput } from "@/components/ui/LocationInput";
import { useTournaments } from "@/hooks/useTournaments";
import { TournamentCard } from "@/components/common/TournamentCard";
import { haversineDistance } from "@/utils/geoUtils";
import { ROUTES } from "@/config/routes";
import type { EventLocation } from "@/types/event.types";
import type { Tournament } from "@/types/tournament.types";

export function DiscoverView() {
  const {
    tournaments,
    searchLocation,
    isSearching,
    isLoading,
    error,
    limitReached,
    discoverByLocation,
    discoverByCurrentLocation,
  } = useTournaments();
  const navigate = useNavigate();

  const [locationInput, setLocationInput] = useState<EventLocation | null>(
    null,
  );
  const [externalTournament, setExternalTournament] =
    useState<Tournament | null>(null);

  const handleTournamentClick = useCallback(
    (tournament: Tournament) => {
      if (tournament.source === "ai" && tournament.sourceUrl) {
        setExternalTournament(tournament);
      } else {
        navigate(`/tournaments/${tournament.id}`);
      }
    },
    [navigate],
  );

  const handleLocationSearch = () => {
    if (locationInput) {
      discoverByLocation(locationInput.latitude, locationInput.longitude);
    }
  };

  const handleUseMyLocation = () => {
    discoverByCurrentLocation();
  };

  return (
    <PageLayout title="Discover">
      {/* Search section */}
      <div className="space-y-3 mb-6">
        <LocationInput
          value={locationInput}
          onChange={setLocationInput}
          label="Search Location"
        />
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleLocationSearch}
            disabled={!locationInput}
            className="flex-1"
          >
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={handleUseMyLocation}
            loading={isLoading}
          >
            <MapPin className="w-4 h-4" />
            Near Me
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Limit reached warning */}
      {limitReached && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          Tournament data may be slightly outdated. Try again later for fresh
          results.
        </div>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner className="w-8 h-8 text-primary-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Searching for tournaments...
          </p>
        </div>
      )}

      {/* Results */}
      {!isSearching && tournaments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {tournaments.length} Tournament
              {tournaments.length !== 1 ? "s" : ""} Found
            </h2>
          </div>
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              distance={
                searchLocation
                  ? haversineDistance(
                      searchLocation.latitude,
                      searchLocation.longitude,
                      tournament.latitude,
                      tournament.longitude,
                    )
                  : undefined
              }
              onClick={() => handleTournamentClick(tournament)}
            />
          ))}
        </div>
      )}

      {/* Empty state — after search with no results */}
      {!isSearching && searchLocation && tournaments.length === 0 && (
        <EmptyState
          icon={Compass}
          title="No tournaments found"
          description="No upcoming tournaments in this area. Try a different location or submit one you know about."
        />
      )}

      {/* Initial state — before any search */}
      {!isSearching &&
        !searchLocation &&
        tournaments.length === 0 &&
        !error && (
          <EmptyState
            icon={Compass}
            title="Find Tournaments"
            description="Search by location or use your current location to discover pickleball tournaments near you."
          />
        )}

      {/* Submit tournament button */}
      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={() => navigate(ROUTES.SUBMIT_TOURNAMENT)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Submit a Tournament
        </Button>
      </div>

      {/* External link confirmation modal */}
      {externalTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Leaving Next Dink
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You're about to visit an external website for{" "}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {externalTournament.name}
              </span>
              . We can't guarantee the accuracy of external content.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
              <ExternalLink className="w-3 h-3 inline mr-1" />
              {externalTournament.sourceUrl}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setExternalTournament(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.open(
                    externalTournament.sourceUrl!,
                    "_blank",
                    "noopener,noreferrer",
                  );
                  setExternalTournament(null);
                }}
                className="flex-1"
              >
                Continue
                <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
