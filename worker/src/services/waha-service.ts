/**
 * WAHA WhatsApp API Service
 * Handles sending messages via WAHA (WhatsApp HTTP API)
 * Documentation: https://waha.devlike.pro/docs/how-to/send-messages/
 */

export interface WAHAConfig {
    baseUrl: string;
    apiKey?: string;
    sessionName: string;
}

export interface SendMessageResponse {
    id: string;
    timestamp: number;
    ack?: number; // 1=sent, 2=delivered, 3=read
}

export class WAHAService {
    private baseUrl: string;
    private apiKey: string;
    private sessionName: string;

    constructor(config: WAHAConfig) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey || '';
        this.sessionName = config.sessionName;
    }

    /**
     * Format phone number to WhatsApp format
     * @param phone - Phone number (e.g., "08123456789" or "628123456789")
     * @returns Formatted chatId (e.g., "628123456789@c.us")
     */
    private formatChatId(phone: string): string {
        // Remove any non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // If starts with 0, replace with 62 (Indonesia country code)
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }

        // If doesn't start with country code, add 62
        if (!cleaned.startsWith('62')) {
            cleaned = '62' + cleaned;
        }

        return `${cleaned}@c.us`;
    }

    /**
     * Send text message via WAHA
     * @param phone - Recipient phone number
     * @param text - Message text (supports WhatsApp formatting)
     * @returns Message response with ID
     */
    async sendTextMessage(phone: string, text: string): Promise<SendMessageResponse> {
        const chatId = this.formatChatId(phone);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.apiKey) {
            headers['X-Api-Key'] = this.apiKey;
        }

        const response = await fetch(`${this.baseUrl}/api/sendText`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                session: this.sessionName,
                chatId: chatId,
                text: text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WAHA API error (${response.status}): ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Send message with buttons (interactive message)
     * @param phone - Recipient phone number
     * @param text - Message text
     * @param buttons - Array of button objects
     */
    async sendButtons(phone: string, text: string, buttons: Array<{ id: string; text: string }>) {
        const chatId = this.formatChatId(phone);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.apiKey) {
            headers['X-Api-Key'] = this.apiKey;
        }

        const response = await fetch(`${this.baseUrl}/api/sendButtons`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                session: this.sessionName,
                chatId: chatId,
                text: text,
                buttons: buttons,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WAHA API error (${response.status}): ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Check if session is active
     */
    async checkSession(): Promise<boolean> {
        try {
            const headers: Record<string, string> = {};
            if (this.apiKey) {
                headers['X-Api-Key'] = this.apiKey;
            }

            const response = await fetch(`${this.baseUrl}/api/sessions/${this.sessionName}`, {
                headers,
            });

            if (!response.ok) return false;

            const data = await response.json();
            return data.status === 'WORKING';
        } catch (error) {
            console.error('Error checking WAHA session:', error);
            return false;
        }
    }
}
