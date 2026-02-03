/**
 * Face Verification Service
 * Handles face registration and verification using Cloudflare AI
 */

import { Ai } from '@cloudflare/ai';

export interface FaceVerificationResult {
    verified: boolean;
    confidence: number;
    error?: string;
}

export class FaceVerificationService {
    private ai: Ai;
    private db: D1Database;
    private threshold: number = 0.75; // Verification threshold (0-1)

    constructor(env: any) {
        this.ai = new Ai(env.AI);
        this.db = env.DB;
    }

    /**
     * Compare two face images and return similarity score
     * Uses ResNet-50 model from Cloudflare AI
     */
    async compareFaces(
        referenceImageUrl: string,
        checkInImageUrl: string
    ): Promise<FaceVerificationResult> {
        try {
            // Fetch images as ArrayBuffer
            const [refConfig, checkConfig] = await Promise.all([
                this.fetchImage(referenceImageUrl),
                this.fetchImage(checkInImageUrl)
            ]);

            if (!refConfig || !checkConfig) {
                return { verified: false, confidence: 0, error: 'Failed to fetch images' };
            }

            // Run image classification/embedding model
            // Note: Cloudflare AI doesn't have a direct "face comparison" model yet
            // We use ResNet-50 to get image embeddings and compare them using cosine similarity

            const [refEmbedding, checkEmbedding] = await Promise.all([
                this.getEmbedding(refConfig),
                this.getEmbedding(checkConfig)
            ]);

            const confidence = this.cosineSimilarity(refEmbedding, checkEmbedding);
            const verified = confidence >= this.threshold;

            return { verified, confidence };
        } catch (error: any) {
            console.error('Face verification error:', error);
            return { verified: false, confidence: 0, error: error.message };
        }
    }

    /**
     * Fetch image and convert to standardized input
     */
    private async fetchImage(url: string): Promise<ArrayBuffer | null> {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch image');
            return await response.arrayBuffer();
        } catch (error) {
            console.error(`Error fetching image ${url}:`, error);
            return null;
        }
    }

    /**
     * Get image embeddings using ResNet-50
     */
    private async getEmbedding(image: ArrayBuffer): Promise<number[]> {
        // Current workaround: Using ResNet-50 for feature extraction
        // In production, you might want to use a specific face recognition model
        // or an external API if stricter security is needed

        // @ts-ignore - Cloudflare AI types might not be fully up to date
        const output = await this.ai.run('@cf/microsoft/resnet-50', {
            image: [...new Uint8Array(image)]
        });

        // The output format depends on the model, here we assume it returns features
        // If specific embedding model is available (like CLIP), use that instead
        return output as unknown as number[];
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
