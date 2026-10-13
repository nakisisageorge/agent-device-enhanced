import { describe, it, expect } from 'vitest';
import { generateSelectors } from './selector-generator.js';
import type { SnapshotNode } from '@agent-device/contracts';

const mockSnapshot: SnapshotNode[] = [
  {
    ref: '@e1',
    role: 'window',
    label: 'Main Window',
    children: [
      {
        ref: '@e2',
        role: 'button',
        label: 'Add Contact',
        testId: 'add-contact-button',
        children: [],
      },
      {
        ref: '@e3',
        role: 'text-field',
        label: 'First Name',
        placeholder: 'Enter first name',
        testId: 'first-name-field',
        children: [],
      },
      {
        ref: '@e4',
        role: 'text-field',
        label: 'Last Name',
        placeholder: 'Enter last name',
        testId: 'last-name-field',
        children: [],
      },
      {
        ref: '@e5',
        role: 'button',
        label: 'Save',
        testId: 'save-button',
        children: [],
      },
      {
        ref: '@e6',
        role: 'button',
        label: 'Cancel',
        children: [],
      },
    ],
  },
];

describe('generateSelectors', () => {
  it('should find element by test ID with high confidence', async () => {
    const result = await generateSelectors(mockSnapshot, 'Add Contact button', {
      useLLM: false,
    });

    expect(result.success).toBe(true);
    expect(result.chains.length).toBeGreaterThan(0);
    expect(result.primaryChain).not.toBeNull();
    expect(result.primaryChain?.strategies[0].type).toBe('test-id');
    expect(result.primaryChain?.confidence).toBeGreaterThan(0.8);
  });

  it('should find element by label when no test ID', async () => {
    const result = await generateSelectors(mockSnapshot, 'Cancel button', {
      useLLM: false,
    });

    expect(result.success).toBe(true);
    expect(result.primaryChain?.strategies[0].type).toBe('accessibility-label');
  });

  it('should generate role-index strategy for elements without label or testId', async () => {
    const snapshotWithoutIds: SnapshotNode[] = [
      {
        ref: '@e1',
        role: 'view',
        children: [
          { ref: '@e2', role: 'button', children: [] },
          { ref: '@e3', role: 'button', children: [] },
          { ref: '@e4', role: 'button', children: [] },
        ],
      },
    ];

    const result = await generateSelectors(snapshotWithoutIds, 'second button', {
      useLLM: false,
    });

    expect(result.success).toBe(true);
    const hasRoleIndex = result.chains.some(c =>
      c.strategies.some(s => s.type === 'role-index')
    );
    expect(hasRoleIndex).toBe(true);
  });

  it('should return failure when no matches found', async () => {
    const result = await generateSelectors(mockSnapshot, 'NonExistentElement123', {
      useLLM: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.suggestions).toBeDefined();
  });

  it('should include fallback strategies when enabled', async () => {
    const result = await generateSelectors(mockSnapshot, 'Add Contact button', {
      useLLM: false,
      includeFallbacks: true,
    });

    expect(result.primaryChain?.fallbackChain.length).toBeGreaterThan(0);
  });

  it('should respect minConfidence threshold', async () => {
    const result = await generateSelectors(mockSnapshot, 'Add Contact button', {
      useLLM: false,
      minConfidence: 0.99, // Very high threshold
    });

    // Should still find the test-id strategy which has very high confidence
    expect(result.success).toBe(true);
  });

  it('should sort chains by confidence descending', async () => {
    const result = await generateSelectors(mockSnapshot, 'button', {
      useLLM: false,
    });

    for (let i = 1; i < result.chains.length; i++) {
      expect(result.chains[i - 1].confidence).toBeGreaterThanOrEqual(result.chains[i].confidence);
    }
  });
});

describe('confidence calculation', () => {
  it('should give high confidence for test-id', async () => {
    const { calculateConfidence } = await import('./confidence.js');
    const confidence = calculateConfidence({
      hasTestId: true,
      hasStableLabel: false,
      hasUniqueRoleIndex: false,
      snapshotDepth: 2,
      candidateScore: 5,
    });
    expect(confidence).toBeGreaterThan(0.8);
  });

  it('should give lower confidence for deep nesting', async () => {
    const { calculateConfidence } = await import('./confidence.js');
    const shallow = calculateConfidence({
      hasTestId: false,
      hasStableLabel: true,
      hasUniqueRoleIndex: true,
      snapshotDepth: 2,
      candidateScore: 5,
    });
    const deep = calculateConfidence({
      hasTestId: false,
      hasStableLabel: true,
      hasUniqueRoleIndex: true,
      snapshotDepth: 10,
      candidateScore: 5,
    });
    expect(shallow).toBeGreaterThan(deep);
  });
});