/**
 * Geolocation utility functions for pickleball tournament discovery.
 * Provides helpers for obtaining user position, calculating distances,
 * generating Firestore-friendly bounding boxes, and geo-bucket cache keys.
 */

/** Earth's mean radius in miles. */
const EARTH_RADIUS_MILES = 3958.8;

/** Geolocation request timeout in milliseconds. */
const POSITION_TIMEOUT_MS = 10_000;

/** Bucket size in degrees (~7 miles). */
const GEO_BUCKET_SIZE = 0.1;

/**
 * Promise wrapper around the browser Geolocation API.
 * Resolves with the user's current latitude and longitude.
 *
 * @returns A promise that resolves to `{ latitude, longitude }`.
 * @throws An `Error` with a descriptive message on failure.
 */
export function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied by user"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information is unavailable"));
            break;
          case error.TIMEOUT:
            reject(new Error("Location request timed out"));
            break;
          default:
            reject(new Error("An unknown geolocation error occurred"));
            break;
        }
      },
      { timeout: POSITION_TIMEOUT_MS },
    );
  });
}

/**
 * Calculate the great-circle distance between two coordinates using the
 * haversine formula.
 *
 * @param lat1 - Latitude of the first point in degrees.
 * @param lng1 - Longitude of the first point in degrees.
 * @param lat2 - Latitude of the second point in degrees.
 * @param lng2 - Longitude of the second point in degrees.
 * @returns Distance between the two points in miles.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculate a bounding box around a center point, suitable for Firestore
 * range queries.
 *
 * @param lat - Center latitude in degrees.
 * @param lng - Center longitude in degrees.
 * @param radiusMiles - Radius of the bounding box in miles.
 * @returns An object with `minLat`, `maxLat`, `minLng`, and `maxLng`.
 */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusMiles: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = (radiusMiles / EARTH_RADIUS_MILES) * (180 / Math.PI);
  const lngDelta =
    (radiusMiles / (EARTH_RADIUS_MILES * Math.cos((lat * Math.PI) / 180))) *
    (180 / Math.PI);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Round latitude and longitude to the nearest 0.1° (~7 miles) for use as
 * geo-bucket cache keys.
 *
 * @param lat - Raw latitude in degrees.
 * @param lng - Raw longitude in degrees.
 * @returns Rounded `{ lat, lng }` snapped to the nearest 0.1°.
 */
export function roundToGeoBucket(
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  return {
    lat: Math.round(lat / GEO_BUCKET_SIZE) * GEO_BUCKET_SIZE,
    lng: Math.round(lng / GEO_BUCKET_SIZE) * GEO_BUCKET_SIZE,
  };
}

/**
 * Build a string cache key from raw coordinates by rounding them to the
 * nearest geo bucket.
 *
 * @param lat - Raw latitude in degrees.
 * @param lng - Raw longitude in degrees.
 * @returns A cache key in the format `"lat_lng"`, e.g. `"34.1_-118.2"`.
 */
export function formatGeoBucketKey(lat: number, lng: number): string {
  const bucket = roundToGeoBucket(lat, lng);

  // Round to one decimal to avoid floating-point artefacts like 34.00000000001
  const bucketLat = parseFloat(bucket.lat.toFixed(1));
  const bucketLng = parseFloat(bucket.lng.toFixed(1));

  return `${bucketLat}_${bucketLng}`;
}
