/**
 * LLM client for AI-powered selector generation
 * Supports multiple providers via the Vercel AI SDK
 */
import type { LLMSelectorClient, LLMProvider } from './types.js';
export declare function createLLMSelectorClient(options?: {
    provider?: string;
    model?: string;
}): Promise<LLMSelectorClient>;
export declare function getAvailableProviders(): LLMProvider[];
export declare function isProviderConfigured(provider: string): boolean;
export declare function getConfiguredProviders(): string[];
//# sourceMappingURL=llm.d.ts.map