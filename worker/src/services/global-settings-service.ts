
export interface GlobalSettings {
    waha_api_url?: string;
    waha_api_key?: string;
    waha_session_name?: string;
    midtrans_server_key?: string;
    midtrans_client_key?: string;
    midtrans_mode?: string;
    google_maps_api_key?: string;
    jwt_secret?: string;
    [key: string]: string | undefined;
}

export class GlobalSettingsService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Get all global settings as a key-value object
     */
    async getSettings(): Promise<GlobalSettings> {
        try {
            const results = await this.db.prepare('SELECT setting_key, setting_value FROM global_settings').all();

            const settings: GlobalSettings = {};
            if (results.results) {
                for (const row of results.results) {
                    // @ts-ignore
                    settings[row.setting_key] = row.setting_value;
                }
            }
            return settings;
        } catch (error) {
            console.error('Failed to fetch global settings:', error);
            return {};
        }
    }

    /**
     * Get a specific setting value
     */
    async get(key: string): Promise<string | null> {
        try {
            const result = await this.db.prepare('SELECT setting_value FROM global_settings WHERE setting_key = ?')
                .bind(key)
                .first();

            // @ts-ignore
            return result ? result.setting_value : null;
        } catch (error) {
            console.error(`Failed to fetch setting ${key}:`, error);
            return null;
        }
    }
}
