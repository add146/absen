// Points Rules Engine
// Evaluates and applies point rules based on attendance behavior

import { Context } from 'hono';

export interface PointRule {
    id: string;
    tenant_id: string;
    name: string;
    rule_type: 'check_in' | 'on_time' | 'streak' | 'full_day';
    points_amount: number;
    conditions: Record<string, any>;
    is_active: number;
}

export interface Attendance {
    id: string;
    user_id: string;
    check_in_time: number; // Unix timestamp
    check_out_time?: number;
    location_id: string;
}

export interface User {
    id: string;
    tenant_id: string;
    points_balance: number;
}

export class PointsEngine {
    private db: any;

    constructor(db: any) {
        this.db = db;
    }

    async evaluateRules(attendance: Attendance, user: User): Promise<number> {
        // Get all active point rules for this tenant
        const { results: rules } = await this.db.prepare(
            "SELECT * FROM point_rules WHERE tenant_id = ? AND is_active = 1"
        ).bind(user.tenant_id).all() as { results: PointRule[] };

        if (!rules || rules.length === 0) {
            // Default  points if no rules
            return 10;
        }

        let totalPoints = 0;
        const appliedRules: string[] = [];

        for (const rule of rules) {
            const points = await this.evaluateRule(rule, attendance, user);
            if (points > 0) {
                totalPoints += points;
                appliedRules.push(rule.name);
            }
        }

        console.log(`[POINTS] Applied rules: ${appliedRules.join(', ')} = ${totalPoints} points`);

        return totalPoints > 0 ? totalPoints : 10; // Minimum 10 points
    }

    private async evaluateRule(rule: PointRule, attendance: Attendance, user: User): Promise<number> {
        try {
            switch (rule.rule_type) {
                case 'check_in':
                    return this.evaluateCheckInRule(rule, attendance);

                case 'on_time':
                    return await this.evaluateOnTimeBonus(rule, attendance);

                case 'streak':
                    return await this.evaluateStreakBonus(rule, user);

                case 'full_day':
                    return this.evaluateFullDayBonus(rule, attendance);

                default:
                    return 0;
            }
        } catch (error) {
            console.error(`Error evaluating rule ${rule.name}:`, error);
            return 0;
        }
    }

    private evaluateCheckInRule(rule: PointRule, attendance: Attendance): number {
        // Base check-in points - always given
        return rule.points_amount;
    }

    private async evaluateOnTimeBonus(rule: PointRule, attendance: Attendance): Promise<number> {
        const conditions = rule.conditions;
        const deadline = conditions.deadline || '09:00:00'; // Default 9 AM

        // Parse check-in time
        const checkInDate = new Date(attendance.check_in_time * 1000);
        const hours = checkInDate.getHours();
        const minutes = checkInDate.getMinutes();
        const seconds = checkInDate.getSeconds();

        const checkInTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Compare times
        if (checkInTimeStr <= deadline) {
            console.log(`[POINTS] On-time bonus: ${checkInTimeStr} <= ${deadline}`);
            return rule.points_amount;
        }

        return 0;
    }

    private async evaluateStreakBonus(rule: PointRule, user: User): Promise<number> {
        const conditions = rule.conditions;
        const requiredDays = conditions.days || 5;

        // Get recent attendances
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startTimestamp = Math.floor(startOfToday.getTime() / 1000);

        const { results: recentAttendances } = await this.db.prepare(`
            SELECT COUNT(DISTINCT DATE(check_in_time, 'unixepoch')) as consecutive_days
            FROM attendances
            WHERE user_id = ?
            AND check_in_time >= ?
            AND check_in_time < ?
            AND is_valid = 1
        `).bind(
            user.id,
            startTimestamp - (requiredDays * 24 * 60 * 60), // Last N days
            startTimestamp + (24 * 60 * 60) // Up to end of today
        ).all() as any;

        const consecutiveDays = recentAttendances[0]?.consecutive_days || 0;

        if (consecutiveDays >= requiredDays) {
            console.log(`[POINTS] Streak bonus: ${consecutiveDays} consecutive days`);
            return rule.points_amount;
        }

        return 0;
    }

    private evaluateFullDayBonus(rule: PointRule, attendance: Attendance): number {
        if (!attendance.check_out_time) {
            return 0; // No checkout yet
        }

        const checkIn = new Date(attendance.check_in_time * 1000);
        const checkOut = new Date(attendance.check_out_time * 1000);

        const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        const requiredHours = (rule.conditions.hours || 8);

        if (hoursWorked >= requiredHours) {
            console.log(`[POINTS] Full day bonus: ${hoursWorked.toFixed(1)} hours worked`);
            return rule.points_amount;
        }

        return 0;
    }
}
