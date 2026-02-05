import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface AbsenDB extends DBSchema {
    pending_attendance: {
        key: number;
        value: {
            url: string;
            method: string;
            headers: any;
            body: any;
            timestamp: number;
            type: 'check-in' | 'check-out';
        };
        indexes: { 'by-timestamp': number };
    };
}

let dbPromise: Promise<IDBPDatabase<AbsenDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<AbsenDB>('absen-db', 2, { // Bump version
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    const store = db.createObjectStore('pending_attendance', {
                        keyPath: 'timestamp',
                        autoIncrement: true,
                    });
                    store.createIndex('by-timestamp', 'timestamp');
                }
                // Migration for version 2 if needed (auto handled if we just add field to new records, but schema def changed)
            },
        });
    }
    return dbPromise;
};

export const saveOfflineRequest = async (url: string, method: string, body: any, headers: any, type: 'check-in' | 'check-out') => {
    const db = await initDB();
    await db.add('pending_attendance', {
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
        type
    });
};

export const getPendingRequests = async () => {
    const db = await initDB();
    return await db.getAllFromIndex('pending_attendance', 'by-timestamp');
};

export const clearRequest = async (key: number) => {
    const db = await initDB();
    await db.delete('pending_attendance', key);
};
