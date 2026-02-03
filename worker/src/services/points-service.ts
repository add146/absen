/**
 * Points Service
 * Handles point transactions and balance management
 */

import { D1Database } from '@cloudflare/workers-types';
// Note: We'll use D1's transaction capability if available or just sequential queries

export class PointsService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Add points to a user
     */
    async addPoints(userId: string, amount: number, type: string, description: string, referenceId?: string) {
        if (amount <= 0) throw new Error('Amount must be positive');
        return this.createTransaction(userId, amount, type, description, referenceId);
    }

    /**
     * Deduct points from a user
     */
    async deductPoints(userId: string, amount: number, type: string, description: string, referenceId?: string) {
        if (amount <= 0) throw new Error('Amount must be positive');

        // Check balance first
        const balance = await this.getBalance(userId);
        if (balance < amount) {
            throw new Error('Insufficient points balance');
        }

        return this.createTransaction(userId, -amount, type, description, referenceId);
    }

    /**
     * Get user point balance
     */
    async getBalance(userId: string): Promise<number> {
        const user = await this.db.prepare('SELECT points_balance FROM users WHERE id = ?')
            .bind(userId)
            .first<{ points_balance: number }>();
        return user?.points_balance || 0;
    }

    /**
     * Get point history
     */
    async getHistory(userId: string, limit = 20, offset = 0) {
        return await this.db.prepare(
            'SELECT * FROM point_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(userId, limit, offset).all();
    }

    /**
     * Create a point transaction
     */
    private async createTransaction(userId: string, amount: number, type: string, description: string, referenceId?: string) {
        const id = crypto.randomUUID();

        // Execute as a batch/transaction to ensure consistency
        const batch = [
            this.db.prepare(
                'INSERT INTO point_history (id, user_id, amount, type, description, reference_id) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(id, userId, amount, type, description, referenceId),

            this.db.prepare(
                'UPDATE users SET points_balance = points_balance + ? WHERE id = ?'
            ).bind(amount, userId)
        ];

        await this.db.batch(batch);
        return { success: true, transactionId: id };
    }
}
