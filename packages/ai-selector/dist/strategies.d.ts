/**
 * Selector strategy type constants and type guards
 */
export declare const SelectorStrategyType: {
    readonly TestId: 'test-id';
    readonly AccessibilityLabel: 'accessibility-label';
    readonly RoleIndex: 'role-index';
    readonly XPathLike: 'xpath-like';
    readonly Composite: 'composite';
    readonly LLMComposite: 'llm-composite';
    readonly LLMSemantic: 'llm-semantic';
    readonly Custom: 'custom';
};
export type SelectorStrategyType = (typeof SelectorStrategyType)[keyof typeof SelectorStrategyType];
export interface TestIdStrategy {
    type: typeof SelectorStrategyType.TestId;
    selector: `testId="${string}"`;
    metadata: {
        testId: string;
    };
}
export interface AccessibilityLabelStrategy {
    type: typeof SelectorStrategyType.AccessibilityLabel;
    selector: `label="${string}"`;
    metadata: {
        label: string;
    };
}
export interface RoleIndexStrategy {
    type: typeof SelectorStrategyType.RoleIndex;
    selector: `role="${string}" index=${number}`;
    metadata: {
        role: string;
        index: number;
        totalSameRole: number;
    };
}
export interface XPathLikeStrategy {
    type: typeof SelectorStrategyType.XPathLike;
    selector: string;
    metadata: {
        path: string[];
    };
}
export interface CompositeStrategy {
    type: typeof SelectorStrategyType.Composite;
    selector: string;
    metadata: {
        attributes: Record<string, string>;
    };
}
export interface LLMStrategy {
    type: typeof SelectorStrategyType.LLMComposite | typeof SelectorStrategyType.LLMSemantic;
    selector: string;
    metadata: {
        reasoning: string;
        confidence: number;
        model: string;
    };
}
/**
 * Check if a strategy is a high-reliability strategy
 */
export declare function isHighReliabilityStrategy(type: SelectorStrategyType): boolean;
/**
 * Get the priority weight for a strategy type (lower = higher priority)
 */
export declare function getStrategyPriority(type: SelectorStrategyType): number;
//# sourceMappingURL=strategies.d.ts.map