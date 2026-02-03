// Discount Engine Service
// Calculates and applies discount rules based on points

export interface DiscountRule {
    id: string;
    tenant_id: string;
    name: string;
    rule_type: 'percentage' | 'fixed' | 'tiered';
    points_required: number;
    discount_value: number;
    max_discount?: number;
    min_purchase?: number;
    valid_from?: number;
    valid_until?: number;
    is_active: number;
}

export interface ApplicableDiscount {
    ruleId: string;
    name: string;
    discountAmount: number;
    pointsCost: number;
}

export class DiscountEngine {
    private db: any;

    constructor(db: any) {
        this.db = db;
    }

    async getApplicableDiscounts(
        tenantId: string,
        userPoints: number,
        purchaseAmount: number
    ): Promise<{ discounts: ApplicableDiscount[]; bestDiscount: ApplicableDiscount | null }> {
        // Get all active discount rules for this tenant
        const { results: rules } = await this.db.prepare(`
            SELECT * FROM discount_rules 
            WHERE tenant_id = ? 
            AND is_active = 1
            AND points_required <= ?
            ORDER BY discount_value DESC
        `).bind(tenantId, userPoints).all() as { results: DiscountRule[] };

        if (!rules || rules.length === 0) {
            return { discounts: [], bestDiscount: null };
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const applicableDiscounts: ApplicableDiscount[] = [];

        for (const rule of rules) {
            // Check validity dates
            if (rule.valid_from && currentTime < rule.valid_from) continue;
            if (rule.valid_until && currentTime > rule.valid_until) continue;

            // Check minimum purchase
            if (rule.min_purchase && purchaseAmount < rule.min_purchase) continue;

            // Calculate discount
            const discountAmount = this.calculateDiscount(rule, purchaseAmount, userPoints);

            if (discountAmount > 0) {
                applicableDiscounts.push({
                    ruleId: rule.id,
                    name: rule.name,
                    discountAmount,
                    pointsCost: rule.points_required
                });
            }
        }

        // Find best discount (highest discount amount)
        const bestDiscount = applicableDiscounts.length > 0
            ? applicableDiscounts.reduce((best, current) =>
                current.discountAmount > best.discountAmount ? current : best
            )
            : null;

        return { discounts: applicableDiscounts, bestDiscount };
    }

    private calculateDiscount(rule: DiscountRule, amount: number, userPoints: number): number {
        switch (rule.rule_type) {
            case 'percentage':
                const percentDiscount = (amount * rule.discount_value) / 100;
                return Math.min(
                    percentDiscount,
                    rule.max_discount || Infinity
                );

            case 'fixed':
                return Math.min(rule.discount_value, amount);

            case 'tiered':
                // Tiered discount: more points = higher discount
                // Format: discount_value is the multiplier
                // Example: 1000 points = 10% off, 2000 points = 20% off
                const tierMultiplier = Math.floor(userPoints / rule.points_required);
                const tieredPercent = rule.discount_value * tierMultiplier;
                const tieredDiscount = (amount * tieredPercent) / 100;
                return Math.min(
                    tieredDiscount,
                    rule.max_discount || Infinity
                );

            default:
                return 0;
        }
    }

    async applyDiscount(
        purchaseAmount: number,
        userPoints: number,
        ruleId: string
    ): Promise<{ finalAmount: number; discountApplied: number; pointsDeducted: number }> {
        // Get the specific rule
        const rule = await this.db.prepare(
            "SELECT * FROM discount_rules WHERE id = ? AND is_active = 1"
        ).bind(ruleId).first() as DiscountRule;

        if (!rule) {
            throw new Error('Discount rule not found or inactive');
        }

        if (userPoints < rule.points_required) {
            throw new Error('Insufficient points for this discount');
        }

        const discountAmount = this.calculateDiscount(rule, purchaseAmount, userPoints);
        const finalAmount = Math.max(0, purchaseAmount - discountAmount);

        return {
            finalAmount,
            discountApplied: discountAmount,
            pointsDeducted: rule.points_required
        };
    }
}
