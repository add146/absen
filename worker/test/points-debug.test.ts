
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointsEngine } from '../src/services/points-engine';

describe('PointsEngine Debug', () => {
    let db: any;
    let engine: PointsEngine;

    beforeEach(() => {
        db = {
            prepare: vi.fn(),
        };
        engine = new PointsEngine(db);
    });

    it('should award custom points when location override is active (integer check)', async () => {
        // Mock DB response for location check
        const mockLocation = { use_custom_points: 1, custom_points: 100 };
        const stmt = {
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(mockLocation)
        };
        db.prepare.mockReturnValue(stmt);

        const points = await engine.evaluateRules('check_in', {
            id: '1',
            user_id: 'u1',
            check_in_time: 1234567890,
            location_id: 'loc-1'
        }, { id: 'u1', tenant_id: 't1', points_balance: 0 });

        expect(points).toBe(100);
    });

    it('should award custom points when location override is active (boolean check)', async () => {
        // Mock DB response for location check
        const mockLocation = { use_custom_points: true, custom_points: 100 }; // D1 boolean behavior
        const stmt = {
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(mockLocation as any)
        };
        db.prepare.mockReturnValue(stmt);

        const points = await engine.evaluateRules('check_in', {
            id: '1',
            user_id: 'u1',
            check_in_time: 1234567890,
            location_id: 'loc-1'
        }, { id: 'u1', tenant_id: 't1', points_balance: 0 });

        expect(points).toBe(100);
    });
});
