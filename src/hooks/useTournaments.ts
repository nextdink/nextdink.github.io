import { useState, useCallback } from "react";
import { tournamentService } from "@/services/tournamentService";
import { getCurrentPosition, haversineDistance } from "@/utils/geoUtils";
import type {
  Tournament,
  CreateTournamentData,
} from "@/types/tournament.types";

export interface UseTournamentsResult {
  tournaments: Tournament[];
  searchLocation: { latitude: number; longitude: number } | null;
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;
  fromCache: boolean;
  limitReached: boolean;
  discoverByLocation: (
    latitude: number,
    longitude: number,
    radiusMiles?: number,
  ) => Promise<void>;
  discoverByCurrentLocation: () => Promise<void>;
  submitTournament: (
    data: CreateTournamentData,
    userId: string,
  ) => Promise<string>;
}

export function useTournaments(): UseTournamentsResult {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchLocation, setSearchLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const discoverByLocation = useCallback(
    async (latitude: number, longitude: number, radiusMiles = 25) => {
      setIsSearching(true);
      setError(null);
      try {
        const [aiResult, userTournaments] = await Promise.all([
          tournamentService.discover(latitude, longitude, radiusMiles),
          tournamentService.getUpcoming(50),
        ]);

        // Filter user-submitted tournaments within the search radius
        const nearbyUserTournaments = userTournaments.filter((t) => {
          const dist = haversineDistance(
            latitude,
            longitude,
            t.latitude,
            t.longitude,
          );
          return dist <= radiusMiles;
        });

        // Merge and deduplicate by name (case-insensitive)
        const merged = [...aiResult.tournaments, ...nearbyUserTournaments];
        const seen = new Set<string>();
        const deduped = merged.filter((t) => {
          const key = t.name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        deduped.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        setTournaments(deduped);
        setSearchLocation({ latitude, longitude });
        setFromCache(aiResult.fromCache);
        setLimitReached(aiResult.limitReached || false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to discover tournaments",
        );
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  const discoverByCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const position = await getCurrentPosition();
      await discoverByLocation(position.latitude, position.longitude);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get location");
    } finally {
      setIsLoading(false);
    }
  }, [discoverByLocation]);

  const submitTournament = useCallback(
    async (data: CreateTournamentData, userId: string) => {
      return await tournamentService.create(data, userId);
    },
    [],
  );

  return {
    tournaments,
    searchLocation,
    isSearching,
    isLoading,
    error,
    fromCache,
    limitReached,
    discoverByLocation,
    discoverByCurrentLocation,
    submitTournament,
  };
}
