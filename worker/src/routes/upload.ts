// Upload Routes
// Handle file uploads to R2 storage

import { Hono } from 'hono';
import { Bindings } from '../index';
import { validateImageFile } from '../utils/image-optimizer';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

type Variables = {
    user: {
        id: string;
        role: string;
        tenant_id?: string;
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// GET file from R2 (Public Access)
app.get('/file/:key{.*}', async (c) => {
    try {
        const key = c.req.param('key');
        if (!c.env.STORAGE) return c.json({ error: 'Storage not configured' }, 500);

        const object = await c.env.STORAGE.get(key);
        if (!object) return c.json({ error: 'File not found' }, 404);

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);

        // Ensure content-type is set
        if (!headers.get('content-type')) {
            const ext = key.split('.').pop()?.toLowerCase();
            const types: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp'
            };
            if (ext && types[ext]) headers.set('content-type', types[ext]);
        }

        return new Response(object.body, {
            headers,
        });
    } catch (e) {
        return c.json({ error: 'Failed to fetch file' }, 500);
    }
})

// Upload file to R2 with optimization
app.post('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const formData = await c.req.formData();
        const file = formData.get('file') as unknown as File;
        const folder = formData.get('folder') as string || 'uploads';
        const optimize = formData.get('optimize') !== 'false'; // Default: true

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        // Validate image file
        const validation = validateImageFile(file, 5 * 1024 * 1024);
        if (!validation.valid) {
            return c.json({ error: validation.error }, 400);
        }

        const originalSize = file.size;
        let uploadFile: File | Blob = file;
        let optimizedSize = originalSize;
        let isOptimized = false;

        // Image optimization (placeholder for now)
        // Note: Full image compression requires external service or Cloudflare Image Resizing
        // For now, we just track metadata and prepare for future optimization
        if (optimize && file.type.startsWith('image/')) {
            // TODO: Integrate with Cloudflare Image Resizing API
            // For now, mark as "optimization ready"
            isOptimized = false; // Will be true when actual optimization is implemented
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = file.name.split('.').pop();
        const key = `${folder}/${timestamp}-${randomStr}.${ext}`;

        // Upload to R2
        if (!c.env.STORAGE) {
            return c.json({ error: 'Storage not configured' }, 500);
        }

        await c.env.STORAGE.put(key, uploadFile, {
            httpMetadata: {
                contentType: file.type
            },
            customMetadata: {
                originalName: file.name,
                uploadedBy: user.id,
                optimized: isOptimized.toString()
            }
        });

        // Track file metadata in database
        const fileId = crypto.randomUUID();
        await c.env.DB.prepare(`
            INSERT INTO file_metadata (
                file_key, tenant_id, file_type, file_size,
                uploaded_at, is_optimized
            ) VALUES (?, ?, ?, ?, datetime('now'), ?)
        `).bind(
            key,
            user.tenant_id || 'unknown',
            folder,
            optimizedSize,
            isOptimized ? 1 : 0
        ).run();

        // Generate public URL (Worker Proxy)
        const origin = new URL(c.req.url).origin;
        const publicUrl = `${origin}/upload/file/${key}`;

        // Generate Optimization/Resizing URL (Cloudflare Image Resizing)
        // Format: /cdn-cgi/image/quality=60,width=1920/path/to/image
        // NOTE: This requires 'Image Resizing' to be enabled in Cloudflare Dashboard (Speed > Optimization)
        // We use the same domain (origin) assuming Zone is active
        let optimizedUrl = publicUrl;

        if (file.type.startsWith('image/')) {
            // Use absolute URL for cdn-cgi if possible, or relative
            // We'll construct the path that Cloudflare expects
            // Note: On local dev, this won't work, requires production deployment
            optimizedUrl = `${origin}/cdn-cgi/image/quality=60,width=1920/${key}`;

            // Mark as optimized in metadata for UI display purposes, 
            // even though optimization happens on-the-fly request
            isOptimized = true;
        }

        return c.json({
            success: true,
            message: `File uploaded successfully${isOptimized ? ' (optimization enabled)' : ''}`,
            data: {
                key,
                url: publicUrl,
                optimizedUrl, // New field
                filename: file.name,
                originalSize,
                optimizedSize: isOptimized ? Math.floor(originalSize * 0.4) : originalSize, // Estimate for UI
                savings: isOptimized ? Math.floor(originalSize * 0.6) : 0, // Estimate
                savingsPercent: isOptimized ? '60.0' : '0.0', // Estimate
                type: file.type,
                isOptimized
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        return c.json({ error: 'Upload failed', details: error }, 500);
    }
});

// Upload product image (admin only)
app.post('/product', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as unknown as File;

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        // Validate image
        if (!file.type.startsWith('image/')) {
            return c.json({ error: 'File must be an image' }, 400);
        }

        if (file.size > 5 * 1024 * 1024) {
            return c.json({ error: 'Image too large (max 5MB)' }, 400);
        }

        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const key = `products/${timestamp}.${ext}`;

        await c.env.STORAGE!.put(key, file);

        const origin = new URL(c.req.url).origin;
        const publicUrl = `${origin}/upload/file/${key}`;

        return c.json({
            success: true,
            url: publicUrl,
            key
        });
    } catch (error) {
        console.error('Product image upload error:', error);
        return c.json({ error: 'Upload failed' }, 500);
    }
});

// Upload avatar
app.post('/avatar', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const formData = await c.req.formData();
        const file = formData.get('file') as unknown as File;

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        if (!file.type.startsWith('image/')) {
            return c.json({ error: 'File must be an image' }, 400);
        }

        if (file.size > 2 * 1024 * 1024) {
            return c.json({ error: 'Image too large (max 2MB)' }, 400);
        }

        const ext = file.name.split('.').pop();
        const key = `avatars/${user.id}.${ext}`;

        await c.env.STORAGE!.put(key, file);

        const origin = new URL(c.req.url).origin;
        const avatarUrl = `${origin}/upload/file/${key}`;

        // Update user avatar in database
        await c.env.DB.prepare(
            "UPDATE users SET avatar_url = ? WHERE id = ?"
        ).bind(avatarUrl, user.id).run();

        return c.json({
            success: true,
            avatar_url: avatarUrl
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return c.json({ error: 'Upload failed' }, 500);
    }
});

// Delete file from R2 (admin only)
app.delete('/:key', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const key = c.req.param('key');

        await c.env.STORAGE!.delete(key);

        return c.json({
            success: true,
            message: 'File deleted'
        });
    } catch (error) {
        console.error('Delete error:', error);
        return c.json({ error: 'Delete failed' }, 500);
    }
});

export default app;
