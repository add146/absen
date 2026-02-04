
export class LocationValidator {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async validate(latitude: number, longitude: number, tenantId: string, specificLocationId?: string): Promise<{ isValid: boolean, validLocationId?: string, error?: string }> {
        try {
            if (specificLocationId && specificLocationId !== 'default') {
                // Validate against specific location
                const loc = await this.db.prepare('SELECT * FROM locations WHERE id = ?').bind(specificLocationId).first<any>();
                if (loc) {
                    if (this.isLocationValid(latitude, longitude, loc)) {
                        return { isValid: true, validLocationId: loc.id };
                    }
                }
                return { isValid: false, error: 'Location validation failed. You are outside the designated area.' };
            } else {
                // Validate against ANY active location for this tenant
                const locations = await this.db.prepare('SELECT * FROM locations WHERE is_active = 1 AND tenant_id = ?').bind(tenantId).all<any>();

                for (const loc of locations.results) {
                    if (this.isLocationValid(latitude, longitude, loc)) {
                        return { isValid: true, validLocationId: loc.id };
                    }
                }

                return { isValid: false, error: 'Location validation failed. You are outside of any active office area.' };
            }
        } catch (e) {
            console.error('Error in LocationValidator:', e);
            throw e;
        }
    }

    private isLocationValid(lat: number, lng: number, loc: any): boolean {
        if (loc.polygon_coords) {
            // Polygon Validation
            let polygon: any[] = [];
            try {
                polygon = typeof loc.polygon_coords === 'string' ? JSON.parse(loc.polygon_coords) : loc.polygon_coords;
            } catch (e) { }

            return this.isPointInPolygon({ lat, lng }, polygon);
        } else {
            // Radius Validation
            const distance = this.calculateDistance(lat, lng, loc.latitude, loc.longitude);
            // Add 50m buffer
            return distance <= (loc.radius_meters || 100) + 50;
        }
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    private isPointInPolygon(point: { lat: number, lng: number }, polygon: { lat: number, lng: number }[]) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lng, yi = polygon[i].lat;
            const xj = polygon[j].lng, yj = polygon[j].lat;

            const intersect = ((yi > point.lat) !== (yj > point.lat))
                && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
