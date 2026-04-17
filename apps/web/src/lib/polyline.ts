/**
 * Decode a Google Encoded Polyline string into [lat, lng] coordinate pairs.
 * Strava uses precision=5 (the default).
 */
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision)
  const coords: [number, number][] = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0; result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    coords.push([lat / factor, lng / factor])
  }

  return coords
}

/** Parse a GPX XML string and return [lat, lng] pairs */
export function parseGpx(gpxText: string): [number, number][] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxText, 'text/xml')
  const errorNode = doc.querySelector('parsererror')
  if (errorNode) throw new Error('Invalid GPX file')
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))
  if (!trkpts.length) throw new Error('No track points found in GPX file')
  return trkpts.map((pt) => [
    parseFloat(pt.getAttribute('lat') ?? '0'),
    parseFloat(pt.getAttribute('lon') ?? '0'),
  ])
}

/** Convert [lat, lng] pairs to a GeoJSON FeatureCollection (LineString) */
export function coordsToGeoJson(coords: [number, number][]): Record<string, unknown> {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        // GeoJSON uses [lng, lat] order
        coordinates: coords.map(([lat, lng]) => [lng, lat, 0]),
      },
      properties: {},
    }],
    properties: { name: '', description: '', time: '' },
  }
}

/** Get the bounding box of a coordinate array */
export function getBounds(coords: [number, number][]) {
  const lats = coords.map(([lat]) => lat)
  const lngs = coords.map(([, lng]) => lng)
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }
}
