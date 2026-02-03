// Fraud Detection Service
// Analyzes attendance check-ins for suspicious patterns

import { Context } from 'hono';

export interface FraudIndicators {
    mockLocationDetected: boolean;
    ipLocationMismatch: boolean;
    impossibleTravel: boolean;
    unusualTime: boolean;
    fraudScore: number; // 0-100
    details: string[];
}

export interface AttendanceCheck {
    id: string;
    user_id: string;
    check_in_lat?: number;
    check_in_lng?: number;
    check_in_time: number;
    ip_address?: string;
    device_info?: string;
}

export class FraudDetector {
    private db: any;

    constructor(db: any) {
        this.db = db;
    }

    async analyzeCheckIn(attendance: AttendanceCheck, mockLocationFlag?: boolean): Promise<FraudIndicators> {
        const indicators: FraudIndicators = {
            mockLocationDetected: false,
            ipLocationMismatch: false,
            impossibleTravel: false,
            unusualTime: false,
            fraudScore: 0,
            details: []
        };

        // 1. Mock Location Detection
        if (mockLocationFlag === true) {
            indicators.mockLocationDetected = true;
            indicators.details.push('Mock location app detected');
        }

        // 2. IP Geolocation Mismatch (placeholder - requires Cloudflare headers)
        // In production, compare CF-IPCountry header with GPS coordinates
        // indicators.ipLocationMismatch = await this.checkIPMismatch(attendance);

        // 3. Impossible Travel Detection
        indicators.impossibleTravel = await this.checkImpossibleTravel(attendance);

        // 4. Unusual Time Detection
        indicators.unusualTime = this.checkUnusualTime(attendance.check_in_time);

        // Calculate fraud score
        indicators.fraudScore = this.calculateFraudScore(indicators);

        return indicators;
    }

    private async checkImpossibleTravel(attendance: AttendanceCheck): Promise<boolean> {
        try {
            // Get the most recent previous attendance
            const previousAttendance = await this.db.prepare(`
                SELECT check_in_lat, check_in_lng, check_in_time
                FROM attendances
                WHERE user_id = ?
                AND id != ?
                AND check_in_time < ?
                AND check_in_lat IS NOT NULL
                ORDER BY check_in_time DESC
                LIMIT 1
            `).bind(attendance.user_id, attendance.id, attendance.check_in_time).first() as any;

            if (!previousAttendance || !attendance.check_in_lat || !attendance.check_in_lng) {
                return false; // No previous attendance or no GPS data
            }

            // Calculate distance in kilometers
            const distance = this.calculateDistance(
                previousAttendance.check_in_lat,
                previousAttendance.check_in_lng,
                attendance.check_in_lat,
                attendance.check_in_lng
            );

            // Calculate time difference in hours
            const timeDiff = (attendance.check_in_time - previousAttendance.check_in_time) / 3600;

            if (timeDiff <= 0) return false;

            // Calculate speed in km/h
            const speed = distance / timeDiff;

            // Flag if speed exceeds 200 km/h (impossible for normal travel)
            const SPEED_THRESHOLD = 200;

            if (speed > SPEED_THRESHOLD) {
                console.log(`[FRAUD] Impossible travel detected: ${distance.toFixed(1)} km in ${timeDiff.toFixed(1)} hours = ${speed.toFixed(1)} km/h`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking impossible travel:', error);
            return false;
        }
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        // Haversine formula to calculate distance between two GPS coordinates
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private checkUnusualTime(checkInTime: number): boolean {
        const date = new Date(checkInTime * 1000);
        const hours = date.getHours();
        const dayOfWeek = date.getDay();

        // Flag if check-in is outside typical work hours (6 AM - 10 PM)
        // or on weekend (Saturday = 6, Sunday = 0)
        const outsideWorkHours = hours < 6 || hours > 22;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (outsideWorkHours || isWeekend) {
            console.log(`[FRAUD] Unusual time: ${date.toISOString()}`);
            return true;
        }

        return false;
    }

    private calculateFraudScore(indicators: FraudIndicators): number {
        let score = 0;

        // Assign weights to each indicator
        if (indicators.mockLocationDetected) score += 40;
        if (indicators.ipLocationMismatch) score += 30;
        if (indicators.impossibleTravel) score += 50;
        if (indicators.unusualTime) score += 10;

        // Cap at 100
        return Math.min(score, 100);
    }

    serializeIndicators(indicators: FraudIndicators): string {
        return JSON.stringify({
            mock_location: indicators.mockLocationDetected,
            ip_mismatch: indicators.ipLocationMismatch,
            impossible_travel: indicators.impossibleTravel,
            unusual_time: indicators.unusualTime,
            score: indicators.fraudScore,
            details: indicators.details
        });
    }
}
