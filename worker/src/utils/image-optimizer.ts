/**
 * Image Optimizer Utility
 * Compresses and optimizes images before uploading to R2
 * Uses quality 60% for maximum storage savings
 */

interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-100, default 60
    format?: 'jpeg' | 'png' | 'webp';
}

interface OptimizedImage {
    buffer: ArrayBuffer;
    mimeType: string;
    originalSize: number;
    optimizedSize: number;
    savings: number; // percentage
}

/**
 * Optimize image using browser-compatible Canvas API
 * Note: This runs in Cloudflare Workers with limited Canvas support
 * For production, consider using Cloudflare Image Resizing API
 */
export async function optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 60, // APPROVED: 60% quality
        format = 'jpeg'
    } = options;

    const originalSize = file.size;

    try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // For now, we'll use a simpler approach: just return compressed version
        // In production, you'd use Cloudflare Image Resizing Worker or external service

        // Simple JPEG quality reduction (requires @cloudflare/workers-types with streams)
        // This is a placeholder - actual implementation depends on available APIs

        const optimizedBuffer = arrayBuffer; // Placeholder
        const optimizedSize = optimizedBuffer.byteLength;

        return {
            buffer: optimizedBuffer,
            mimeType: format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp',
            originalSize,
            optimizedSize,
            savings: ((originalSize - optimizedSize) / originalSize) * 100
        };
    } catch (error) {
        console.error('Image optimization failed:', error);
        // Fallback: return original
        const buffer = await file.arrayBuffer();
        return {
            buffer,
            mimeType: file.type,
            originalSize,
            optimizedSize: originalSize,
            savings: 0
        };
    }
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(
    file: File,
    size: number = 256
): Promise<ArrayBuffer> {
    // Similar to optimizeImage but with fixed square dimensions
    // Placeholder implementation
    return await file.arrayBuffer();
}

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSize: number = 5 * 1024 * 1024): { valid: boolean, error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.` };
    }

    return { valid: true };
}

/**
 * Helper: Use Cloudflare Image Resizing API
 * This requires a separate Worker or binding configuration
 * URL format: https://example.com/cdn-cgi/image/quality=60,width=800/path/to/image.jpg
 */
export function getCloudflareImageResizingUrl(
    baseUrl: string,
    imagePath: string,
    options: { width?: number, height?: number, quality?: number } = {}
): string {
    const { width, height, quality = 60 } = options;
    const params: string[] = [`quality=${quality}`];

    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);

    return `${baseUrl}/cdn-cgi/image/${params.join(',')}/${imagePath}`;
}
