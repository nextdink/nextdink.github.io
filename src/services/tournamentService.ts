import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  addDoc,
  deleteDoc,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/config/firebase";
import type {
  Tournament,
  CreateTournamentData,
} from "@/types/tournament.types";

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | Date | null): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
};

// Convert Firestore document to Tournament
const docToTournament = (
  id: string,
  data: Record<string, unknown>,
): Tournament => ({
  id,
  name: data.name as string,
  description: data.description as string | undefined,
  startDate: convertTimestamp(data.startDate as Timestamp),
  endDate: convertTimestamp(data.endDate as Timestamp),
  venueName: data.venueName as string,
  formattedAddress: data.formattedAddress as string,
  latitude: data.latitude as number,
  longitude: data.longitude as number,
  placeId: data.placeId as string | undefined,
  format: data.format as Tournament["format"],
  skillLevels: (data.skillLevels as string[]) || [],
  entryFee: data.entryFee as string | undefined,
  organizerName: data.organizerName as string | undefined,
  sourceUrl: data.sourceUrl as string | undefined,
  registrationUrl: data.registrationUrl as string | undefined,
  source: data.source as Tournament["source"],
  submittedBy: data.submittedBy as string | undefined,
  cachedAt: data.cachedAt
    ? convertTimestamp(data.cachedAt as Timestamp)
    : undefined,
  status: data.status as Tournament["status"],
  createdAt: convertTimestamp(data.createdAt as Timestamp),
  updatedAt: convertTimestamp(data.updatedAt as Timestamp),
});

// Helper to remove undefined values from an object (Firestore doesn't accept undefined)
const removeUndefined = <T extends object>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== undefined
    ) {
      result[key] = obj[key];
    }
  }
  return result;
};

interface DiscoverResult {
  tournaments: Tournament[];
  fromCache: boolean;
  limitReached?: boolean;
}

export const tournamentService = {
  /**
   * Call the Cloud Function for AI-powered tournament discovery
   */
  async discover(
    latitude: number,
    longitude: number,
    radiusMiles?: number,
  ): Promise<DiscoverResult> {
    const discoverFn = httpsCallable(functions, "discoverTournaments");
    const result = await discoverFn({ latitude, longitude, radiusMiles });

    const data = result.data as {
      tournaments: Record<string, unknown>[];
      fromCache: boolean;
      limitReached?: boolean;
    };

    const tournaments = data.tournaments.map(
      (t: Record<string, unknown>, index: number) => ({
        id: (t.id as string) || `discovered-${index}`,
        name: t.name as string,
        description: t.description as string | undefined,
        startDate: new Date(t.startDate as string),
        endDate: new Date(t.endDate as string),
        venueName: t.venueName as string,
        formattedAddress: t.formattedAddress as string,
        latitude: t.latitude as number,
        longitude: t.longitude as number,
        placeId: t.placeId as string | undefined,
        format: t.format as Tournament["format"],
        skillLevels: (t.skillLevels as string[]) || [],
        entryFee: t.entryFee as string | undefined,
        organizerName: t.organizerName as string | undefined,
        sourceUrl: t.sourceUrl as string | undefined,
        registrationUrl: t.registrationUrl as string | undefined,
        source: (t.source as Tournament["source"]) || "ai",
        submittedBy: t.submittedBy as string | undefined,
        cachedAt: t.cachedAt ? new Date(t.cachedAt as string) : undefined,
        status: (t.status as Tournament["status"]) || "upcoming",
        createdAt: t.createdAt ? new Date(t.createdAt as string) : new Date(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt as string) : new Date(),
      }),
    );

    return {
      tournaments,
      fromCache: data.fromCache,
      limitReached: data.limitReached,
    };
  },

  /**
   * Submit a user-sourced tournament
   */
  async create(data: CreateTournamentData, userId: string): Promise<string> {
    const tournamentsRef = collection(db, "tournaments");

    const tournamentData = removeUndefined({
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      venueName: data.venueName,
      formattedAddress: data.formattedAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      placeId: data.placeId,
      format: data.format,
      skillLevels: data.skillLevels,
      entryFee: data.entryFee,
      organizerName: data.organizerName,
      sourceUrl: data.sourceUrl,
      registrationUrl: data.registrationUrl,
      source: "user" as const,
      submittedBy: userId,
      status: "upcoming" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(tournamentsRef, tournamentData);
    return docRef.id;
  },

  /**
   * Get a single tournament by ID
   */
  async getById(id: string): Promise<Tournament | null> {
    const tournamentRef = doc(db, "tournaments", id);
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) return null;
    return docToTournament(tournamentSnap.id, tournamentSnap.data());
  },

  /**
   * Get upcoming tournaments (user-submitted only, sorted by startDate)
   */
  async getUpcoming(limitCount = 20): Promise<Tournament[]> {
    const tournamentsRef = collection(db, "tournaments");
    const q = query(
      tournamentsRef,
      where("source", "==", "user"),
      where("startDate", ">=", new Date()),
      orderBy("startDate", "asc"),
      limit(limitCount),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docToTournament(d.id, d.data()));
  },

  /**
   * Get tournaments submitted by a specific user
   */
  async getBySubmitter(userId: string): Promise<Tournament[]> {
    const tournamentsRef = collection(db, "tournaments");
    const q = query(
      tournamentsRef,
      where("submittedBy", "==", userId),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docToTournament(d.id, d.data()));
  },

  /**
   * Update a tournament (only submitter can do this, enforced by Firestore rules)
   */
  async update(id: string, data: Partial<CreateTournamentData>): Promise<void> {
    const tournamentRef = doc(db, "tournaments", id);
    const cleanedData = removeUndefined(data);

    await updateDoc(tournamentRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Delete a tournament
   */
  async delete(id: string): Promise<void> {
    const tournamentRef = doc(db, "tournaments", id);
    await deleteDoc(tournamentRef);
  },
};
