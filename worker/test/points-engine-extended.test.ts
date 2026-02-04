import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PointsEngine, Attendance, User, PointRule } from '../src/services/points-engine'

describe('Points Engine - Location Custom Points', () => {
    let mockDb: any;
    let engine: PointsEngine;

    beforeEach(() => {
        mockDb = {
            prepare: vi.fn().mockReturnThis(),
            bind: vi.fn().mockReturnThis(),
            all: vi.fn(),
            first: vi.fn()
        };
        engine = new PointsEngine(mockDb);
    });

    it('should use location custom points if enabled', async () => {
        // Mock location with custom points enabled
        mockDb.first.mockResolvedValue({
            use_custom_points: 1,
            custom_points: 25
        });

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: 1707015600,
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_in', attendance, user);
        expect(points).toBe(25); // Should use custom points
    });

    it('should fallback to global rules if custom points not enabled', async () => {
        // Mock location with custom points disabled
        mockDb.first.mockResolvedValue({
            use_custom_points: 0,
            custom_points: 25
        });

        // Mock global rules
        const rules: PointRule[] = [{
            id: 'r1',
            tenant_id: 't1',
            name: 'Base Checkin',
            rule_type: 'check_in',
            points_amount: 15,
            conditions: {} as any,
            is_active: 1
        }];
        mockDb.all.mockResolvedValue({ results: rules });

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: 1707015600,
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_in', attendance, user);
        expect(points).toBe(15); // Should use global rule, not custom
    });

    it('should calculate full_day bonus correctly', async () => {
        mockDb.all.mockResolvedValue({
            results: [{
                id: 'r1',
                tenant_id: 't1',
                name: 'Full Day',
                rule_type: 'full_day',
                points_amount: 20,
                conditions: { hours: 8 },
                is_active: 1
            }]
        });

        // Check-in at 09:00, Check-out at 18:00 (9 hours)
        const checkInTime = 1707015600; // 9 AM
        const checkOutTime = checkInTime + (9 * 60 * 60); // 9 hours later

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_out', attendance, user);
        expect(points).toBe(20); // Should award full day bonus
    });

    it('should NOT award full_day bonus if worked less than required hours', async () => {
        mockDb.all.mockResolvedValue({
            results: [{
                id: 'r1',
                tenant_id: 't1',
                name: 'Full Day',
                rule_type: 'full_day',
                points_amount: 20,
                conditions: { hours: 8 },
                is_active: 1
            }]
        });

        // Check-in at 09:00, Check-out at 16:00 (7 hours)
        const checkInTime = 1707015600;
        const checkOutTime = checkInTime + (7 * 60 * 60);

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_out', attendance, user);
        expect(points).toBe(0); // Should NOT award bonus
    });
});
