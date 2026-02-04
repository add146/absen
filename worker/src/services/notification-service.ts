/**
 * Notification Service
 * Orchestrates sending notifications via WAHA and storing in database
 * Now reads WAHA config from system_settings table
 */

import { WAHAService } from './waha-service';
import { notificationTemplates, getNotificationTitle, type NotificationData } from '../templates/notification-templates';
import { GlobalSettingsService } from './global-settings-service';

export interface Env {
    DB: D1Database;
}

export interface NotificationPayload {
    userId: string;
    tenantId?: string;
    type: string;
    data: NotificationData;
}

export class NotificationService {
    private db: D1Database;

    constructor(env: Env) {
        this.db = env.DB;
    }

    /**
     * Get WAHA configuration from global_settings
     */
    private async getWAHAConfig(): Promise<{ enabled: boolean; baseUrl?: string; apiKey?: string; session?: string }> {
        const settingsService = new GlobalSettingsService(this.db);
        const settings = await settingsService.getSettings();

        // Check if WAHA is configured (at least URL is present)
        const enabled = !!settings.waha_api_url;

        return {
            enabled,
            baseUrl: settings.waha_api_url,
            apiKey: settings.waha_api_key,
            session: settings.waha_session_name || 'default'
        };
    }

    /**
     * Send notification to user
     */
    async send(payload: NotificationPayload): Promise<string> {
        const { userId, tenantId = 'default', type, data } = payload;

        // Get user phone number
        const user = await this.db
            .prepare('SELECT name, phone FROM users WHERE id = ?')
            .bind(userId)
            .first<{ name: string; phone: string }>();

        if (!user) {
            throw new Error('User not found');
        }

        // Add user name to data if not present
        if (!data.userName) {
            data.userName = user.name;
        }

        // Generate message from template
        const template = notificationTemplates[type as keyof typeof notificationTemplates];
        if (!template) {
            throw new Error(`Unknown notification type: ${type}`);
        }

        const message = template(data);
        const title = getNotificationTitle(type);

        // Create notification record
        const notificationId = await this.createNotification({
            userId,
            tenantId,
            type,
            title,
            message,
            data: JSON.stringify(data),
        });

        // Get WAHA config and send if enabled
        const wahaConfig = await this.getWAHAConfig();

        if (wahaConfig.enabled && wahaConfig.baseUrl && user.phone) {
            try {
                const waha = new WAHAService({
                    baseUrl: wahaConfig.baseUrl,
                    apiKey: wahaConfig.apiKey,
                    sessionName: wahaConfig.session || 'default'
                });

                const wahaResponse = await waha.sendTextMessage(user.phone, message);

                // Update notification with WAHA message ID
                await this.db
                    .prepare(`
            UPDATE notifications 
            SET waha_message_id = ?,
                delivery_status = 'sent',
                sent_at = ?
            WHERE id = ?
          `)
                    .bind(wahaResponse.id, Math.floor(Date.now() / 1000), notificationId)
                    .run();

                console.log(`[WAHA] Message sent to ${user.phone}: ${wahaResponse.id}`);
            } catch (error) {
                console.error('[WAHA] Failed to send:', error);

                // Mark as failed
                await this.db
                    .prepare(`
            UPDATE notifications 
            SET delivery_status = 'failed'
            WHERE id = ?
          `)
                    .bind(notificationId)
                    .run();
            }
        } else {
            console.log(`[WAHA] Disabled or not configured, notification stored only`);
        }

        return notificationId;
    }

    /**
     * Create notification in database
     */
    private async createNotification(data: {
        userId: string;
        tenantId: string;
        type: string;
        title: string;
        message: string;
        data: string;
    }): Promise<string> {
        const id = crypto.randomUUID();

        await this.db
            .prepare(`
        INSERT INTO notifications (id, user_id, tenant_id, type, title, message, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(id, data.userId, data.tenantId, data.type, data.title, data.message, data.data)
            .run();

        return id;
    }

    /**
     * Get user notifications
     */
    async getUserNotifications(userId: string, limit = 50): Promise<any[]> {
        const results = await this.db
            .prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `)
            .bind(userId, limit)
            .all();

        return results.results || [];
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<void> {
        await this.db
            .prepare(`
        UPDATE notifications 
        SET is_read = 1 
        WHERE id = ? AND user_id = ?
      `)
            .bind(notificationId, userId)
            .run();
    }

    /**
     * Get unread count
     */
    async getUnreadCount(userId: string): Promise<number> {
        const result = await this.db
            .prepare(`
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? AND is_read = 0
      `)
            .bind(userId)
            .first<{ count: number }>();

        return result?.count || 0;
    }

    /**
     * Delete old notifications (cleanup)
     */
    async cleanup(daysOld = 90): Promise<void> {
        const cutoffTime = Math.floor(Date.now() / 1000) - (daysOld * 24 * 60 * 60);

        await this.db
            .prepare(`
        DELETE FROM notifications 
        WHERE created_at < ? AND is_read = 1
      `)
            .bind(cutoffTime)
            .run();
    }
}
