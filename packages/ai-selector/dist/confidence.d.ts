/**
 * Confidence calculation for selector chains
 */
import type { ConfidenceFactors } from './types.js';
/**
 * Calculate confidence score (0-1) for a selector chain based on various factors.
 * Higher confidence = more likely to be stable across app versions and platforms.
 */
export declare function calculateConfidence(factors: ConfidenceFactors): number;
/**
 * Get confidence level label
 */
export declare function getConfidenceLevel(confidence: number): 'very-high' | 'high' | 'medium' | 'low' | 'very-low';
/**
 * Get human-readable confidence description
 */
export declare function getConfidenceDescription(confidence: number): string;
/**
 * Calculate confidence for individual strategy
 */
export declare function calculateStrategyConfidence(strategy: {
    type: string;
    metadata?: Record<string, unknown>;
}, context: {
    snapshotDepth: number;
    siblingCount: number;
}): number;
//# sourceMappingURL=confidence.d.ts.map