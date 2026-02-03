// Upload Routes
// Handle file uploads to R2 storage

import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

type Variables = {
    user: {
        id: string;
        role: string;
        tenant_id?: string;
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// Upload file to R2
app.post('/', authMiddleware, async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as unknown as File;
        const folder = formData.get('folder') as string || 'uploads';

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        // Validate file size (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return c.json({ error: 'File too large. Max size is 5MB' }, 400);
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return c.json({ error: 'Invalid file type. Only images allowed' }, 400);
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

        await c.env.STORAGE.put(key, file);

        // Generate public URL (adjust based on your R2 public domain)
        const publicUrl = `https://pub-YOUR_R2_PUBLIC_ID.r2.dev/${key}`;

        // For now, return the key (you'll need to configure R2 public access)
        return c.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                key,
                url: publicUrl,
                filename: file.name,
                size: file.size,
                type: file.type
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

        const publicUrl = `https://pub-YOUR_R2_PUBLIC_ID.r2.dev/${key}`;

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

        const avatarUrl = `https://pub-YOUR_R2_PUBLIC_ID.r2.dev/${key}`;

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
