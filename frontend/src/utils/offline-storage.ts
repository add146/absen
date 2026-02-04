import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface AbsenDB extends DBSchema {
    pending_attendance: {
        key: number;
        value: {
            url: string;
            method: string;
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
        dbPromise = openDB<AbsenDB>('absen-db', 1, {
            upgrade(db) {
                const store = db.createObjectStore('pending_attendance', {
                    keyPath: 'timestamp',
                    autoIncrement: true,
                });
                store.createIndex('by-timestamp', 'timestamp');
            },
        });
    }
    return dbPromise;
};

export const saveOfflineRequest = async (url: string, method: string, body: any, type: 'check-in' | 'check-out') => {
    const db = await initDB();
    await db.add('pending_attendance', {
        url,
        method,
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
