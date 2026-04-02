// Tournament format options
export type TournamentFormat = "singles" | "doubles" | "mixed" | "multi";

// How the tournament data was sourced
export type TournamentSource = "ai" | "user";

// Current status of a tournament
export type TournamentStatus =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "canceled";

/**
 * Tournament represents a pickleball tournament listing
 * discovered via AI search or submitted by a user.
 */
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;

  // Location
  venueName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;

  // Tournament details
  format: TournamentFormat;
  skillLevels: string[]; // e.g. ["3.0", "3.5", "4.0"]
  entryFee?: string; // freeform, e.g. "$40/event"
  organizerName?: string;

  // External links
  sourceUrl?: string; // link to original listing
  registrationUrl?: string; // external registration link

  // Data source
  source: TournamentSource;
  submittedBy?: string; // userId, only for source='user'
  cachedAt?: Date; // for AI results TTL tracking

  // Status
  status: TournamentStatus;

  // System
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data required to create a new tournament via user submission.
 */
export interface CreateTournamentData {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;

  // Location
  venueName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;

  // Tournament details
  format: TournamentFormat;
  skillLevels: string[];
  entryFee?: string;
  organizerName?: string;

  // External links
  sourceUrl?: string;
  registrationUrl?: string;
}

/**
 * Filters for searching nearby tournaments.
 */
export interface TournamentSearchFilters {
  latitude: number;
  longitude: number;
  radiusMiles?: number; // default 25 in the service
  format?: TournamentFormat;
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// Utility functions
// ============================================

/**
 * Check if a tournament's start date is in the future.
 */
export function isUpcoming(tournament: Tournament): boolean {
  return tournament.startDate > new Date();
}

/**
 * Check if two dates fall on the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Format a date range for display.
 * Returns "Mar 15, 2026" for single-day or "Mar 15-17, 2026" for multi-day.
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  if (isSameDay(startDate, endDate)) {
    return startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    const month = startDate.toLocaleDateString("en-US", { month: "short" });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const year = startDate.getFullYear();
    return `${month} ${startDay}-${endDay}, ${year}`;
  }

  const start = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} - ${end}`;
}
