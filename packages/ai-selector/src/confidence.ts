/**
 * Confidence calculation for selector chains
 */

import type { ConfidenceFactors } from './types.js';

/**
 * Calculate confidence score (0-1) for a selector chain based on various factors.
 * Higher confidence = more likely to be stable across app versions and platforms.
 */
export function calculateConfidence(factors: ConfidenceFactors): number {
  let score = 0;
  let maxScore = 0;

  // Test ID is the gold standard - very stable
  maxScore += 40;
  if (factors.hasTestId) {
    score += 40;
  }

  // Stable accessibility label (not dynamic content)
  maxScore += 25;
  if (factors.hasStableLabel) {
    score += 25;
  }

  // Unique role index (only one element with this role in context)
  maxScore += 20;
  if (factors.hasUniqueRoleIndex) {
    score += 20;
  }

  // Shallow snapshot depth (less nesting = more stable)
  maxScore += 10;
  if (factors.snapshotDepth <= 3) {
    score += 10;
  } else if (factors.snapshotDepth <= 5) {
    score += 5;
  } else if (factors.snapshotDepth <= 8) {
    score += 2;
  }

  // Candidate match score (how well the element matches the description)
  maxScore += 5;
  score += Math.min(5, factors.candidateScore);

  return maxScore > 0 ? Math.min(1, score / maxScore) : 0;
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): 'very-high' | 'high' | 'medium' | 'low' | 'very-low' {
  if (confidence >= 0.9) return 'very-high';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5) return 'medium';
  if (confidence >= 0.3) return 'low';
  return 'very-low';
}

/**
 * Get human-readable confidence description
 */
export function getConfidenceDescription(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  const descriptions: Record<string, string> = {
    'very-high': 'Excellent - Test ID or unique stable identifier',
    'high': 'Good - Stable label or unique role index',
    'medium': 'Fair - Composite selector with multiple attributes',
    'low': 'Weak - XPath-like or deep nesting, may break on UI changes',
    'very-low': 'Poor - Generic selector, likely to break',
  };
  return `${level}: ${descriptions[level]} (${Math.round(confidence * 100)}%)`;
}

/**
 * Calculate confidence for individual strategy
 */
export function calculateStrategyConfidence(
  strategy: { type: string; metadata?: Record<string, unknown> },
  context: { snapshotDepth: number; siblingCount: number }
): number {
  const baseConfidence: Record<string, number> = {
    'test-id': 0.95,
    'accessibility-label': 0.7,
    'role-index': 0.6,
    'composite': 0.75,
    'xpath-like': 0.4,
    'llm-composite': 0.65,
    'llm-semantic': 0.6,
    'custom': 0.3,
  };

  let confidence = baseConfidence[strategy.type] || 0.3;

  // Adjust based on metadata
  if (strategy.type === 'accessibility-label' && strategy.metadata?.label) {
    const label = String(strategy.metadata.label);
    if (label.length < 3) confidence -= 0.2;
    if (/^\d+$/.test(label.trim())) confidence -= 0.3; // Dynamic numbers
  }

  if (strategy.type === 'role-index' && strategy.metadata?.totalSameRole) {
    const total = Number(strategy.metadata.totalSameRole);
    if (total === 1) confidence += 0.2;
    else if (total <= 3) confidence += 0.1;
    else if (total > 10) confidence -= 0.2;
  }

  // Adjust for depth
  if (context.snapshotDepth > 5) confidence -= 0.1;
  if (context.snapshotDepth > 8) confidence -= 0.15;

  return Math.max(0, Math.min(1, confidence));
}