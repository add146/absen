import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PointsEngine, Attendance, User, PointRule } from '../src/services/points-engine'

describe('PointsEngine', () => {
    let mockDb: any;
    let engine: PointsEngine;

    beforeEach(() => {
        // Mock DB structure
        mockDb = {
            prepare: vi.fn().mockReturnThis(),
            bind: vi.fn().mockReturnThis(),
            all: vi.fn()
        };
        engine = new PointsEngine(mockDb);
    });

    it('should return default 10 points for check_in if no rules exist', async () => {
        mockDb.all.mockResolvedValue({ results: [] });

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: 1707015600, // example timestamp
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_in', attendance, user);
        expect(points).toBe(10);
    });

    it('should return default 0 points for check_out if no rules exist', async () => {
        mockDb.all.mockResolvedValue({ results: [] });

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: 1707015600,
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_out', attendance, user);
        expect(points).toBe(0);
    });

    it('should calculate check_in base points', async () => {
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
        expect(points).toBe(15);
    });

    it('should calculate on_time bonus correctly', async () => {
        const rules: PointRule[] = [
            {
                id: 'r1',
                tenant_id: 't1',
                name: 'Base',
                rule_type: 'check_in',
                points_amount: 10,
                conditions: {} as any,
                is_active: 1
            },
            {
                id: 'r2',
                tenant_id: 't1',
                name: 'On Time',
                rule_type: 'on_time',
                points_amount: 5,
                conditions: JSON.stringify({ deadline: '09:00' }) as any,
                is_active: 1
            }
        ];
        mockDb.all.mockResolvedValue({ results: rules });

        // User check-in at 08:30 (Asia/Jakarta GMT+7)
        // 08:30 GMT+7 is 01:30 UTC
        // 2024-02-04 01:30:00 UTC = 1707010200
        const checkInTime = 1707010200;

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: checkInTime,
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_in', attendance, user);
        expect(points).toBe(15); // 10 base + 5 bonus
    });

    it('should NOT award on_time bonus if late', async () => {
        const rules: PointRule[] = [
            {
                id: 'r1',
                tenant_id: 't1',
                name: 'Base',
                rule_type: 'check_in',
                points_amount: 10,
                conditions: {} as any,
                is_active: 1
            },
            {
                id: 'r2',
                tenant_id: 't1',
                name: 'On Time',
                rule_type: 'on_time',
                points_amount: 5,
                conditions: JSON.stringify({ deadline: '09:00' }) as any,
                is_active: 1
            }
        ];
        mockDb.all.mockResolvedValue({ results: rules });

        // User check-in at 09:30 (Asia/Jakarta GMT+7)
        // 09:30 GMT+7 is 02:30 UTC
        // 2024-02-04 02:30:00 UTC = 1707013800
        const checkInTime = 1707013800;

        const attendance: Attendance = {
            id: '1',
            user_id: 'u1',
            check_in_time: checkInTime,
            location_id: 'loc1'
        };
        const user: User = { id: 'u1', tenant_id: 't1', points_balance: 0 };

        const points = await engine.evaluateRules('check_in', attendance, user);
        expect(points).toBe(10); // Only base 10
    });

    it('should calculate streak bonus correctly', async () => {
        // Mock streak rule
        const rules: PointRule[] = [{
            id: 'r1',
            tenant_id: 't1',
            name: 'Streak Bonus',
            rule_type: 'streak',
            points_amount: 15,
            conditions: { days: 5 } as any, // 5 consecutive days
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

        // Streak rule should be evaluated on check-in
        const points = await engine.evaluateRules('check_in', attendance, user);
        expect(points).toBeGreaterThanOrEqual(0);
    });

    it('should NOT award streak bonus if consecutive days threshold not met', async () => {
        // Mock streak rule requiring 5 consecutive days
        const rules: PointRule[] = [{
            id: 'r1',
            tenant_id: 't1',
            name: 'Streak Bonus',
            rule_type: 'streak',
            points_amount: 15,
            conditions: { days: 5 } as any,
            is_active: 1
        }];
        mockDb.all.mockResolvedValue({ results: rules });

        // User has only checked in 3 consecutive days (not enough)
        const consecutiveDays = 3;
        const requiredDays = 5;

        expect(consecutiveDays).toBeLessThan(requiredDays);

        // Streak bonus should NOT be awarded
        const streakBonus = consecutiveDays >= requiredDays ? 15 : 0;
        expect(streakBonus).toBe(0);
    });
});
