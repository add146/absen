/**
 * Storage Lifecycle Service
 * Handles cleanup of old files and storage optimization
 */

import type { Bindings } from '../index';



/**
 * Cleanup old files from R2 storage
 * Called by scheduled cron job
 */
export async function cleanupOldFiles(env: Bindings): Promise<{
    deleted: number;
    spaceFreed: number;
}> {
    const RETENTION_DAYS = 90; // Keep files for 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const cutoffISO = cutoffDate.toISOString();

    // Get old files from metadata table
    const oldFiles = await env.DB
        .prepare(`
            SELECT file_key, file_size 
            FROM file_metadata 
            WHERE uploaded_at < ? 
            AND file_type NOT IN ('avatar', 'product') 
            LIMIT 100
        `)
        .bind(cutoffISO)
        .all();

    let deleted = 0;
    let spaceFreed = 0;

    for (const file of oldFiles.results) {
        try {
            // Delete from R2
            await env.STORAGE.delete(file.file_key as string);

            // Delete metadata record
            await env.DB
                .prepare('DELETE FROM file_metadata WHERE file_key = ?')
                .bind(file.file_key)
                .run();

            deleted++;
            spaceFreed += (file.file_size as number) || 0;
        } catch (error) {
            console.error(`Failed to delete file ${file.file_key}:`, error);
        }
    }

    console.log(`Cleanup completed: ${deleted} files deleted, ${(spaceFreed / 1024 / 1024).toFixed(2)} MB freed`);

    return { deleted, spaceFreed };
}

/**
 * Archive old attendance photos (compress or move to cold storage)
 */
export async function archiveOldPhotos(env: Bindings): Promise<number> {
    const ARCHIVE_DAYS = 180; // Archive files older than 6 months
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_DAYS);

    const cutoffISO = cutoffDate.toISOString();

    // Get files to archive
    const filesToArchive = await env.DB
        .prepare(`
            SELECT file_key 
            FROM file_metadata 
            WHERE uploaded_at < ? 
            AND file_type = 'check_in'
            AND is_optimized = 0
            LIMIT 50
        `)
        .bind(cutoffISO)
        .all();

    let archived = 0;

    for (const file of filesToArchive.results) {
        try {
            // TODO: Implement compression or move to cheaper storage tier
            // For now, just mark as archived in metadata
            await env.DB
                .prepare('UPDATE file_metadata SET is_optimized = 1 WHERE file_key = ?')
                .bind(file.file_key)
                .run();

            archived++;
        } catch (error) {
            console.error(`Failed to archive file ${file.file_key}:`, error);
        }
    }

    return archived;
}

/**
 * Generate storage analytics report
 */
export async function getStorageAnalytics(env: Bindings): Promise<any> {
    const stats = await env.DB.prepare(`
        SELECT 
            file_type,
            COUNT(*) as file_count,
            SUM(file_size) as total_size,
            AVG(file_size) as avg_size,
            SUM(CASE WHEN is_optimized = 1 THEN 1 ELSE 0 END) as optimized_count
        FROM file_metadata
        GROUP BY file_type
    `).all();

    const totalStats = await env.DB.prepare(`
        SELECT 
            COUNT(*) as total_files,
            SUM(file_size) as total_storage
        FROM file_metadata
    `).first();

    return {
        byType: stats.results,
        total: totalStats
    };
}

/**
 * Cleanup expired rate limit records
 */
export async function cleanupRateLimits(env: Bindings): Promise<number> {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

    const result = await env.DB
        .prepare('DELETE FROM rate_limits WHERE window_start < ?')
        .bind(oneHourAgo)
        .run();

    return result.meta?.changes || 0;
}
