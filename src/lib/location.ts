import * as Location from 'expo-location';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  name: string | null; // human-readable street/area name (reverse-geocoded)
}

/** Builds a readable, de-duplicated address string from a geocode result. */
function formatPlace(p: Location.LocationGeocodedAddress): string {
  const raw = [
    p.name,
    p.street,
    p.district,
    p.city ?? p.subregion,
    p.region,
    p.postalCode,
  ];
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const val of raw) {
    if (!val) continue;
    const key = val.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(val);
  }
  return parts.slice(0, 4).join(', ');
}

/**
 * getCurrentLocation — asks for foreground permission, grabs GPS coordinates,
 * and reverse-geocodes them to a street/area name (on-device, no API key).
 * Throws if permission is denied; geocoding failure just yields a null name.
 */
export async function getCurrentLocation(): Promise<GeoPoint> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to record where the trip starts and ends.');
  }

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const { latitude, longitude } = pos.coords;

  let name: string | null = null;
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (places.length) name = formatPlace(places[0]) || null;
  } catch {
    /* geocoding is best-effort; coordinates are still saved */
  }

  return { latitude, longitude, name };
}
