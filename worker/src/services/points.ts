
export class PointsService {
    constructor(private db: D1Database) { }

    async getBalance(userId: string): Promise<number> {
        const user = await this.db.prepare('SELECT points_balance FROM users WHERE id = ?').bind(userId).first<{ points_balance: number }>();
        return user?.points_balance || 0;
    }

    async getHistory(userId: string, limit = 20, offset = 0) {
        return await this.db.prepare(
            'SELECT * FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(userId, limit, offset).all();
    }

    async awardPoints(userId: string, amount: number, sourceType: string, description: string, referenceId?: string) {
        if (amount <= 0) return;

        // Get current balance first to calculate balance_after
        const currentBalance = await this.getBalance(userId);
        const newBalance = currentBalance + amount;

        // Transaction to ensure atomicity
        const batch = [
            this.db.prepare(
                'UPDATE users SET points_balance = ? WHERE id = ?'
            ).bind(newBalance, userId),
            this.db.prepare(
                'INSERT INTO points_ledger (id, user_id, transaction_type, amount, reference_type, reference_id, description, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(crypto.randomUUID(), userId, 'earn', amount, sourceType, referenceId || null, description, newBalance)
        ];

        await this.db.batch(batch);
    }

    async deductPoints(userId: string, amount: number, sourceType: string, description: string, referenceId?: string) {
        if (amount <= 0) return;

        // Check balance first
        const currentBalance = await this.getBalance(userId);
        if (currentBalance < amount) {
            throw new Error('Insufficient points');
        }

        const newBalance = currentBalance - amount;

        const batch = [
            this.db.prepare(
                'UPDATE users SET points_balance = ? WHERE id = ?'
            ).bind(newBalance, userId),
            this.db.prepare(
                'INSERT INTO points_ledger (id, user_id, transaction_type, amount, reference_type, reference_id, description, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(crypto.randomUUID(), userId, 'redeem', -amount, sourceType, referenceId || null, description, newBalance)
        ];

        await this.db.batch(batch);
    }
}
