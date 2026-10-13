/**
 * Selector strategy type constants and type guards
 */

export const SelectorStrategyType = {
  TestId: 'test-id' as const,
  AccessibilityLabel: 'accessibility-label' as const,
  RoleIndex: 'role-index' as const,
  XPathLike: 'xpath-like' as const,
  Composite: 'composite' as const,
  LLMComposite: 'llm-composite' as const,
  LLMSemantic: 'llm-semantic' as const,
  Custom: 'custom' as const,
} as const;

export type SelectorStrategyType =
  (typeof SelectorStrategyType)[keyof typeof SelectorStrategyType];

export interface TestIdStrategy {
  type: typeof SelectorStrategyType.TestId;
  selector: `testId="${string}"`;
  metadata: { testId: string };
}

export interface AccessibilityLabelStrategy {
  type: typeof SelectorStrategyType.AccessibilityLabel;
  selector: `label="${string}"`;
  metadata: { label: string };
}

export interface RoleIndexStrategy {
  type: typeof SelectorStrategyType.RoleIndex;
  selector: `role="${string}" index=${number}`;
  metadata: { role: string; index: number; totalSameRole: number };
}

export interface XPathLikeStrategy {
  type: typeof SelectorStrategyType.XPathLike;
  selector: string;
  metadata: { path: string[] };
}

export interface CompositeStrategy {
  type: typeof SelectorStrategyType.Composite;
  selector: string;
  metadata: { attributes: Record<string, string> };
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
export function isHighReliabilityStrategy(type: SelectorStrategyType): boolean {
  return [
    SelectorStrategyType.TestId,
    SelectorStrategyType.AccessibilityLabel,
    SelectorStrategyType.RoleIndex,
  ].includes(type);
}

/**
 * Get the priority weight for a strategy type (lower = higher priority)
 */
export function getStrategyPriority(type: SelectorStrategyType): number {
  const priorities: Record<SelectorStrategyType, number> = {
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