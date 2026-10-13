/**
 * Selector strategy type constants and type guards
 */
export const SelectorStrategyType = {
    TestId: 'test-id',
    AccessibilityLabel: 'accessibility-label',
    RoleIndex: 'role-index',
    XPathLike: 'xpath-like',
    Composite: 'composite',
    LLMComposite: 'llm-composite',
    LLMSemantic: 'llm-semantic',
    Custom: 'custom',
};
/**
 * Check if a strategy is a high-reliability strategy
 */
export function isHighReliabilityStrategy(type) {
    return [
        SelectorStrategyType.TestId,
        SelectorStrategyType.AccessibilityLabel,
        SelectorStrategyType.RoleIndex,
    ].includes(type);
}
/**
 * Get the priority weight for a strategy type (lower = higher priority)
 */
export function getStrategyPriority(type) {
    const priorities = {
        [SelectorStrategyType.TestId]: 10,
        [SelectorStrategyType.AccessibilityLabel]: 20,
        [SelectorStrategyType.RoleIndex]: 30,
        [SelectorStrategyType.Composite]: 40,
        [SelectorStrategyType.XPathLike]: 50,
        [SelectorStrategyType.LLMComposite]: 60,
        [SelectorStrategyType.LLMSemantic]: 70,
        [SelectorStrategyType.Custom]: 100,
    };
    return priorities[type] ?? 100;
}
//# sourceMappingURL=strategies.js.map