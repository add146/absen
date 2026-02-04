// Points Rules Engine
// Evaluates and applies point rules based on attendance behavior

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

    /**
     * Evaluate rules based on a trigger event.
     * @param trigger 'check_in' or 'check_out'
     * @param attendance The attendance record
     * @param user The user record
     * @returns Total points earned from this evaluation
     */
    async evaluateRules(trigger: 'check_in' | 'check_out', attendance: Attendance, user: User): Promise<number> {
        // Daily Limit Check for Check-in Points
        if (trigger === 'check_in') {
            const hasPrior = await this.hasPriorCheckInToday(user.id, attendance.id, attendance.check_in_time);
            if (hasPrior) {
                console.log(`[POINTS] Check-in points denied: User ${user.id} already received points today.`);
                return 0;
            }
        }

        // Check for location-specific custom points first (only for check_in)
        if (trigger === 'check_in' && attendance.location_id) {
            try {
                const location = await this.db.prepare(
                    "SELECT use_custom_points, custom_points FROM locations WHERE id = ?"
                ).bind(attendance.location_id).first<{ use_custom_points: number, custom_points: number }>();

                if (location && (location.use_custom_points == 1 || location.use_custom_points === true as any) && location.custom_points > 0) {
                    console.log(`[POINTS] Custom location points applied: ${location.custom_points}`);
                    return location.custom_points;
                }
            } catch (e) {
                console.error('Failed to fetch location custom points:', e);
                // Fall through to regular rules
            }
        }

        // Get all active point rules for this tenant
        const { results: rules } = await this.db.prepare(
            "SELECT * FROM point_rules WHERE tenant_id = ? AND is_active = 1"
        ).bind(user.tenant_id).all() as { results: PointRule[] };

        if (!rules || rules.length === 0) {
            // Default points if no rules exist, ONLY for check_in trigger
            return trigger === 'check_in' ? 10 : 0;
        }

        let totalPoints = 0;
        const appliedRules: string[] = [];

        for (const rule of rules) {
            // Filter rules by trigger
            // check_in triggers: 'check_in', 'on_time', 'streak'
            // check_out triggers: 'full_day'
            if (this.shouldEvaluate(trigger, rule.rule_type)) {
                const points = await this.evaluateRule(rule, attendance, user);
                if (points > 0) {
                    totalPoints += points;
                    appliedRules.push(rule.name);
                }
            }
        }

        if (appliedRules.length > 0) {
            console.log(`[POINTS] Trigger: ${trigger} | Applied: ${appliedRules.join(', ')} = ${totalPoints} points`);
        }

        // If it's a check-in and absolutely 0 points were calculated (e.g. no matching rules), 
        // fallback to base 10 points so user gets something.
        if (trigger === 'check_in' && totalPoints === 0) {
            return 10;
        }

        return totalPoints;
    }

    private async hasPriorCheckInToday(userId: string, currentAttendanceId: string, checkInTime: number): Promise<boolean> {
        // Check for ANY other valid attendance on the same day (WIB +7)
        // We use check_in_time column.
        const dateString = new Date(checkInTime * 1000).toISOString(); // Debug purpose

        // SQLite: Check if there exists a record with same DATE but different ID
        const result = await this.db.prepare(`
            SELECT COUNT(*) as count 
            FROM attendances
            WHERE user_id = ? 
            AND id != ?
            AND date(check_in_time, 'unixepoch', '+7 hours') = date(?, 'unixepoch', '+7 hours')
            AND points_earned > 0
        `).bind(userId, currentAttendanceId, checkInTime).first<{ count: number }>();

        // Note: added 'AND points_earned > 0' to ensure we only count check-ins that actually gave points.
        // If previous check-in gave 0 (e.g. error), maybe allow this one?
        // User said "cukup dapat sekali sehari", implying if they got points once, no more.

        return (result?.count || 0) > 0;
    }

    private shouldEvaluate(trigger: 'check_in' | 'check_out', ruleType: string): boolean {
        if (trigger === 'check_in') {
            return ['check_in', 'on_time', 'streak'].includes(ruleType);
        } else if (trigger === 'check_out') {
            return ['full_day'].includes(ruleType);
        }
        return false;
    }

    private async evaluateRule(rule: PointRule, attendance: Attendance, user: User): Promise<number> {
        try {
            // Parse conditions if string
            if (typeof rule.conditions === 'string') {
                try {
                    rule.conditions = JSON.parse(rule.conditions);
                } catch (e) {
                    rule.conditions = {};
                }
            }

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
        // Base check-in points - always given on check-in
        return rule.points_amount;
    }

    private async evaluateOnTimeBonus(rule: PointRule, attendance: Attendance): Promise<number> {
        const conditions = rule.conditions || {};
        const deadline = conditions.deadline || '09:00'; // Default 09:00

        // Parse check-in time to local time string HH:mm
        // Note: attendance.check_in_time is UTC Unix timestamp
        // We need to know tenant timezone, but for now assuming offset +7 (WIB) or stored relative
        // Improved: Use date-fns-tz if available, or simple offset for now.
        // Assuming server time is used for comparison or raw timestamp.

        // For simplicity in this environment, we'll convert timestamp to HH:mm string
        // In production, we should handle Timezones properly (e.g. stored in Tenant settings)

        const checkInDate = new Date(attendance.check_in_time * 1000);
        // FORCE GMT+7 for ID context as per user location (Indonesia)
        // or get offset from tenant settings

        const formatter = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta'
        });
        const checkInTimeStr = formatter.format(checkInDate); // "08:30"

        // Compare times (string comparison works for HH:mm format)
        if (checkInTimeStr <= deadline) {
            return rule.points_amount;
        }

        return 0;
    }

    private async evaluateStreakBonus(rule: PointRule, user: User): Promise<number> {
        const conditions = rule.conditions || {};
        const requiredDays = conditions.days || 5;

        // Get recent attendances
        const today = new Date();
        const startTimestamp = Math.floor(today.setHours(0, 0, 0, 0) / 1000);

        const { results: recentAttendances } = await this.db.prepare(`
            SELECT COUNT(DISTINCT DATE(check_in_time, 'unixepoch', '+7 hours')) as consecutive_days
            FROM attendances
            WHERE user_id = ?
            AND check_in_time >= ? 
            AND check_in_time < ?
            AND is_valid = 1
        `).bind(
            user.id,
            startTimestamp - ((requiredDays + 2) * 24 * 60 * 60), // Look back a bit more to be safe
            startTimestamp + (24 * 60 * 60)
        ).all() as any;

        // Note: Real SQL streak calculation is complex (gaps and islands problem).
        // This is a simplified "count in last N days" approximation.
        // For true streak, we need recursive CTE or application logic.
        // Falling back to simple count for now.

        const count = recentAttendances[0]?.consecutive_days || 0;

        if (count >= requiredDays) {
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
        const requiredHours = (rule.conditions?.hours || 8);
        const maxDuration = 13; // Hard limit to prevent "forgot checkout" exploits

        if (hoursWorked >= requiredHours) {
            if (hoursWorked > maxDuration) {
                console.log(`[POINTS] Full Day Bonus denied: Duration ${hoursWorked.toFixed(2)}h exceeds limit of ${maxDuration}h`);
                return 0;
            }
            return rule.points_amount;
        }

        return 0;
    }
}

