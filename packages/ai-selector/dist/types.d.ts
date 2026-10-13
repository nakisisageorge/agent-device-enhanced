/**
 * Type definitions for AI Selector package
 */
import type { SnapshotNode } from '@agent-device/contracts';
export type SelectorStrategyType = 'test-id' | 'accessibility-label' | 'role-index' | 'xpath-like' | 'composite' | 'llm-composite' | 'llm-semantic' | 'custom';
export interface SelectorStrategy {
    type: SelectorStrategyType;
    selector: string;
    description: string;
    metadata?: Record<string, unknown>;
}
export interface SelectorChain {
    targetRef: string;
    strategies: SelectorStrategy[];
    confidence: number;
    fallbackChain: string[];
    metadata?: {
        primaryStrategy: SelectorStrategyType;
        fallbackCount: number;
        candidatePath: string[];
    };
}
export interface SelectorGenerationOptions {
    /** Use LLM for enhanced strategy generation */
    useLLM?: boolean;
    /** LLM provider (openai, anthropic, groq, etc.) */
    llmProvider?: string;
    /** LLM model name */
    llmModel?: string;
    /** Maximum number of candidate elements to evaluate */
    maxStrategies?: number;
    /** Minimum confidence threshold (0-1) */
    minConfidence?: number;
    /** Target platform for platform-specific optimizations */
    platform?: 'ios' | 'android' | 'web' | 'macos' | 'linux' | 'harmonyos' | 'tvos';
    /** Include fallback strategies in the chain */
    includeFallbacks?: boolean;
}
export interface SelectorResult {
    success: boolean;
    targetDescription: string;
    chains: SelectorChain[];
    primaryChain: SelectorChain | null;
    error?: string;
    suggestions?: string[];
    metadata: {
        totalCandidates: number;
        strategiesEvaluated: number;
        platform?: string;
        timestamp: string;
    };
}
export interface LLMSelectorClient {
    generateStrategies(node: SnapshotNode, fullSnapshot: SnapshotNode[], targetDescription: string, existingStrategies: SelectorStrategy[]): Promise<SelectorStrategy[]>;
}
export interface LLMProvider {
    name: string;
    models: string[];
    apiKeyEnvVar: string;
}
export interface ConfidenceFactors {
    hasTestId: boolean;
    hasStableLabel: boolean;
    hasUniqueRoleIndex: boolean;
    snapshotDepth: number;
    candidateScore: number;
}
//# sourceMappingURL=types.d.ts.map