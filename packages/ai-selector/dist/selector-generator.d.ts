import type { SnapshotNode } from '@agent-device/contracts';
import type { SelectorGenerationOptions, SelectorResult } from './types.js';
/**
 * Generate resilient selectors for a target element described in natural language.
 * Uses multiple strategies and optionally LLM assistance to produce a ranked selector chain.
 */
export declare function generateSelectors(snapshot: SnapshotNode[], targetDescription: string, options?: SelectorGenerationOptions): Promise<SelectorResult>;
//# sourceMappingURL=selector-generator.d.ts.map