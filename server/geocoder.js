import db from './db.js';

let lastRequestTime = 0;

// Rate-limiting helper (fair use)
async function throttle() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 500) { // BigDataCloud is more forgiving, 500ms throttle is plenty
    const delay = 500 - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

/**
 * Reverse geocodes coordinates using BigDataCloud Client API, 
 * using SQLite cache to minimize API calls.
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>}
 */
export async function reverseGeocode(latitude, longitude) {
  if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
    return 'Unknown Location';
  }

  // 4 decimal places is roughly 11m precision, perfect for caching nearby photos
  const latRounded = parseFloat(latitude.toFixed(4));
  const lonRounded = parseFloat(longitude.toFixed(4));

  // Check SQLite Cache
  try {
    const cached = db.prepare(
      'SELECT location_name FROM geocoding_cache WHERE lat_rounded = ? AND lon_rounded = ?'
    ).get(latRounded, lonRounded);

    if (cached) {
      return cached.location_name;
    }
  } catch (error) {
    console.error('Error reading geocoding cache:', error);
  }

  // Throttle
  await throttle();

  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latRounded}&longitude=${lonRounded}&localityLanguage=en`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`BigDataCloud API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Construct a premium-looking short location name (e.g., "Sydney, New South Wales, Australia")
    const parts = [];
    if (data.locality) parts.push(data.locality);
    else if (data.city) parts.push(data.city);

    if (data.principalSubdivision && data.principalSubdivision !== data.locality && data.principalSubdivision !== data.city) {
      parts.push(data.principalSubdivision);
    }
    if (data.countryName) {
      parts.push(data.countryName);
    }

    const locationName = parts.length > 0 ? parts.join(', ') : 'Unknown Location';

    // Cache the resolved name
    db.prepare(
      'INSERT OR REPLACE INTO geocoding_cache (lat_rounded, lon_rounded, location_name) VALUES (?, ?, ?)'
    ).run(latRounded, lonRounded, locationName);

    return locationName;
  } catch (error) {
    console.error(`Failed to geocode (${latRounded}, ${lonRounded}):`, error);
    return `Coords: ${latRounded.toFixed(4)}, ${lonRounded.toFixed(4)}`;
  }
}
