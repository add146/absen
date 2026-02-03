/**
 * Image Compression Utility
 * Compresses images to be under 500KB and 80% quality
 */

export const compressImage = async (input: File | string): Promise<File> => {
    let file: File;

    if (typeof input === 'string') {
        // Convert Base64/URL to File
        const res = await fetch(input);
        const blob = await res.blob();
        file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    } else {
        file = input;
    }

    // If not an image, return original
    if (!file.type.startsWith('image/')) return file;

    // Target configuration
    const MAX_SIZE_BYTES = 500 * 1024; // 500KB
    const INITIAL_QUALITY = 0.8;

    // If already small enough, return original
    if (file.size <= MAX_SIZE_BYTES) return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        reader.onerror = (e) => reject(e);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Limit max dimensions
            const MAX_DIMENSION = 1920;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file); // Fallback
                return;
            }

            // Draw with white background (handle PNG transparency converting to JPG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Iteratively reduce quality until size is met
            let quality = INITIAL_QUALITY;

            const attemptCompression = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }

                        if (blob.size <= MAX_SIZE_BYTES || quality <= 0.5) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            console.log(`Compressed: ${file.size} -> ${blob.size} (Quality: ${quality})`);
                            resolve(compressedFile);
                        } else {
                            quality -= 0.1;
                            attemptCompression();
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            attemptCompression();
        };

        reader.readAsDataURL(file);
    });
};
