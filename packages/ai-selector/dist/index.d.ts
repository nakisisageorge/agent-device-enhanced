/**
 * AI-Powered Selector Generation for agent-device
 *
 * This package provides LLM-assisted generation of resilient selectors
 * from accessibility snapshots, with confidence scoring and fallback chains.
 */
export { generateSelectors, type SelectorGenerationOptions, type SelectorResult, type SelectorStrategy, type SelectorChain, } from './selector-generator.js';
export { SelectorStrategyType, type TestIdStrategy, type AccessibilityLabelStrategy, type RoleIndexStrategy, type XPathLikeStrategy, type CompositeStrategy, } from './strategies.js';
export { createLLMSelectorClient, type LLMSelectorClient, type LLMProvider, } from './llm.js';
export { calculateConfidence, type ConfidenceFactors, } from './confidence.js';
//# sourceMappingURL=index.d.ts.map