/**
 * LLM client for AI-powered selector generation
 * Supports multiple providers via the Vercel AI SDK
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import type { SnapshotNode } from '@agent-device/contracts';
import type { SelectorStrategy, SelectorStrategyType, LLMSelectorClient, LLMProvider } from './types.js';
import { SelectorStrategyType } from './strategies.js';

const SelectorStrategySchema = z.object({
  type: z.enum([
    'test-id',
    'accessibility-label',
    'role-index',
    'xpath-like',
    'composite',
    'llm-composite',
    'llm-semantic',
    'custom',
  ]),
  selector: z.string(),
  description: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const LLMResponseSchema = z.object({
  strategies: z.array(SelectorStrategySchema),
  reasoning: z.string(),
});

type LLMResponse = z.infer<typeof LLMResponseSchema>;

const PROVIDER_CONFIGS: Record<string, LLMProvider> = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    apiKeyEnvVar: 'OPENAI_API_KEY',
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
  },
  groq: {
    name: 'Groq',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    apiKeyEnvVar: 'GROQ_API_KEY',
  },
  google: {
    name: 'Google',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
    apiKeyEnvVar: 'GOOGLE_API_KEY',
  },
};

function getProviderModel(provider: string, model?: string): { provider: any; model: string } {
  // Dynamic import to avoid requiring all providers
  switch (provider) {
    case 'openai': {
      const { openai } = await import('@ai-sdk/openai');
      return {
        provider: openai,
        model: model || 'gpt-4o-mini',
      };
    }
    case 'anthropic': {
      const { anthropic } = await import('@ai-sdk/anthropic');
      return {
        provider: anthropic,
        model: model || 'claude-3-5-haiku-20241022',
      };
    }
    case 'groq': {
      const { groq } = await import('@ai-sdk/groq');
      return {
        provider: groq,
        model: model || 'llama-3.3-70b-versatile',
      };
    }
    case 'google': {
      const { google } = await import('@ai-sdk/google');
      return {
        provider: google,
        model: model || 'gemini-1.5-flash',
      };
    }
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

function buildSnapshotSummary(snapshot: SnapshotNode[], maxNodes = 50): string {
  let count = 0;
  const lines: string[] = [];

  function traverse(nodes: SnapshotNode[], depth = 0) {
    for (const node of nodes) {
      if (count >= maxNodes) return;
      count++;

      const indent = '  '.repeat(depth);
      const parts = [];
      if (node.ref) parts.push(`@${node.ref}`);
      if (node.role) parts.push(`role=${node.role}`);
      if (node.label) parts.push(`label="${node.label}"`);
      if (node.testId) parts.push(`testId="${node.testId}"`);
      if (node.value !== undefined) parts.push(`value="${node.value}"`);

      lines.push(`${indent}${parts.join(' ')}`);

      if (node.children?.length && depth < 5) {
        traverse(node.children, depth + 1);
      }
    }
  }

  traverse(snapshot);
  return lines.join('\n');
}

function buildPrompt(
  targetNode: SnapshotNode,
  fullSnapshot: SnapshotNode[],
  targetDescription: string,
  existingStrategies: SelectorStrategy[]
): string {
  const snapshotSummary = buildSnapshotSummary(fullSnapshot);
  const existingStrategiesDesc = existingStrategies
    .map(s => `- ${s.type}: ${s.selector} (${s.description})`)
    .join('\n') || 'None';

  return `You are an expert in mobile app automation selector generation. Given an accessibility snapshot and a target element description, generate robust, resilient selectors.

TARGET ELEMENT:
- Description: "${targetDescription}"
- Role: ${targetNode.role || 'unknown'}
- Label: ${targetNode.label || 'none'}
- Test ID: ${targetNode.testId || 'none'}
- Value: ${targetNode.value || 'none'}
- Ref: ${targetNode.ref || 'none'}

FULL SNAPSHOT (truncated):
${snapshotSummary}

EXISTING HEURISTIC STRATEGIES:
${existingStrategiesDesc}

TASK: Generate 1-3 additional selector strategies that are MORE resilient than the heuristic ones.
Focus on:
1. Semantic understanding of the UI structure
2. Stable attributes that won't change between builds
3. Relative positioning that survives layout changes
4. Platform-specific best practices (iOS: accessibility identifiers, Android: resource IDs, Web: data-testid)

Return strategies in order of reliability (most reliable first).
Each strategy must have a unique approach.`;
}

export async function createLLMSelectorClient(
  options: { provider?: string; model?: string } = {}
): Promise<LLMSelectorClient> {
  const providerName = options.provider || 'groq'; // Default to Groq (free tier)
  const model = options.model;

  const { provider, model: resolvedModel } = await getProviderModel(providerName, model);

  return {
    async generateStrategies(
      node: SnapshotNode,
      fullSnapshot: SnapshotNode[],
      targetDescription: string,
      existingStrategies: SelectorStrategy[]
    ): Promise<SelectorStrategy[]> {
      try {
        const prompt = buildPrompt(node, fullSnapshot, targetDescription, existingStrategies);

        const { object } = await generateObject({
          model: provider(resolvedModel),
          schema: LLMResponseSchema,
          prompt,
          temperature: 0.1,
          maxTokens: 2000,
        });

        return object.strategies.map(s => ({
          ...s,
          type: s.type as SelectorStrategyType,
          metadata: {
            ...s.metadata,
            reasoning: object.reasoning,
            model: resolvedModel,
            provider: providerName,
          },
        }));
      } catch (error) {
        console.warn('[ai-selector] LLM generation failed:', error);
        return [];
      }
    },
  };
}

export function getAvailableProviders(): LLMProvider[] {
  return Object.values(PROVIDER_CONFIGS);
}

export function isProviderConfigured(provider: string): boolean {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) return false;
  return !!process.env[config.apiKeyEnvVar];
}

export function getConfiguredProviders(): string[] {
  return Object.entries(PROVIDER_CONFIGS)
    .filter(([, config]) => !!process.env[config.apiKeyEnvVar])
    .map(([name]) => name);
}