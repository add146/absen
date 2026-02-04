
export class GeofenceService {
    /**
     * Calculate distance between two points in meters using Haversine formula
     */
    static getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth radius in meters
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Check if a point is inside a polygon using Ray Casting algorithm
     * @param point {lat, lng}
     * @param polygon Array of {lat, lng}
     */
    static isPointInPolygon(point: { lat: number, lng: number }, polygon: Array<{ lat: number, lng: number }>): boolean {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat, yi = polygon[i].lng;
            const xj = polygon[j].lat, yj = polygon[j].lng;

            const intersect = ((yi > point.lng) !== (yj > point.lng))
                && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Validate if a user is within a valid geofence (Radius or Polygon)
     */
    static validateLocation(
        userLat: number,
        userLng: number,
        location: {
            latitude: number,
            longitude: number,
            radius_meters?: number,
            polygon_coords?: string // JSON string
        }
    ): boolean {
        // 1. Check Polygon if exists
        if (location.polygon_coords) {
            try {
                const polygon = JSON.parse(location.polygon_coords);
                if (Array.isArray(polygon) && polygon.length >= 3) {
                    return this.isPointInPolygon({ lat: userLat, lng: userLng }, polygon);
                }
            } catch (e) {
                console.error('Invalid polygon coords:', e);
            }
        }

        // 2. Fallback to Radius Check
        // If polygon check failed or didn't exist, proceed to radius check IF radius is defined
        // However, if logic dictates "Polygon OR Radius", usually we check what's configured.
        // Assuming if polygon is set, we prioritize it. If not set, we check radius.

        // If polygon was present but point was outside, strictly return false? 
        // Or do we support hybrid? Let's assume strict: If polygon defined, MUST be in polygon.
        if (location.polygon_coords && location.polygon_coords !== '[]') {
            // Re-evaluating: The isPointInPolygon above returns boolean. 
            // If we just returned that result, we are done.
            // But let's re-parse to be safe or just use the logic flow.
            try {
                const polygon = JSON.parse(location.polygon_coords);
                if (Array.isArray(polygon) && polygon.length >= 3) {
                    return this.isPointInPolygon({ lat: userLat, lng: userLng }, polygon);
                }
            } catch (e) { /* ignore */ }
        }

        // Default to Radius
        const distance = this.getDistanceInMeters(userLat, userLng, location.latitude, location.longitude);
        const radius = location.radius_meters || 100; // Default 100m
        return distance <= radius;
    }
}
