import { SelectorStrategyType } from './strategies.js';
import { createLLMSelectorClient } from './llm.js';
import { calculateConfidence } from './confidence.js';
/**
 * Generate resilient selectors for a target element described in natural language.
 * Uses multiple strategies and optionally LLM assistance to produce a ranked selector chain.
 */
export async function generateSelectors(snapshot, targetDescription, options = {}) {
    const { useLLM = true, llmProvider, llmModel, maxStrategies = 5, minConfidence = 0.3, platform, includeFallbacks = true, } = options;
    // Find candidate nodes matching the description
    const candidates = findCandidateNodes(snapshot, targetDescription, platform);
    if (candidates.length === 0) {
        return {
            success: false,
            targetDescription,
            chains: [],
            error: 'No matching elements found in snapshot',
            suggestions: generateSuggestions(snapshot, targetDescription),
        };
    }
    const chains = [];
    for (const candidate of candidates.slice(0, maxStrategies)) {
        const strategies = await generateStrategiesForNode(candidate, snapshot, targetDescription, { useLLM, llmProvider, llmModel, platform });
        const chain = buildSelectorChain(strategies, candidate, includeFallbacks);
        if (chain.strategies.length > 0) {
            chains.push(chain);
        }
    }
    // Sort by confidence descending
    chains.sort((a, b) => b.confidence - a.confidence);
    // Filter by minimum confidence
    const filteredChains = chains.filter(c => c.confidence >= minConfidence);
    return {
        success: filteredChains.length > 0,
        targetDescription,
        chains: filteredChains,
        primaryChain: filteredChains[0] || null,
        metadata: {
            totalCandidates: candidates.length,
            strategiesEvaluated: chains.reduce((sum, c) => sum + c.strategies.length, 0),
            platform,
            timestamp: new Date().toISOString(),
        },
    };
}
/**
 * Find nodes in the snapshot that match the target description.
 * Uses simple text matching on labels, roles, and test IDs.
 */
function findCandidateNodes(snapshot, description, platform) {
    const candidates = [];
    const descLower = description.toLowerCase();
    const descWords = descLower.split(/\s+/).filter(w => w.length > 1);
    function traverse(nodes, path = []) {
        for (const node of nodes) {
            const currentPath = [...path, node.ref || `idx-${nodes.indexOf(node)}`];
            // Calculate match score
            let score = 0;
            const searchableText = [
                node.label || '',
                node.role || '',
                node.testId || '',
                node.value || '',
                ...(node.children || []).flatMap(c => [c.label, c.role, c.testId].filter(Boolean)),
            ].join(' ').toLowerCase();
            for (const word of descWords) {
                if (searchableText.includes(word)) {
                    score += 1;
                }
            }
            // Boost for exact label match
            if (node.label?.toLowerCase() === descLower) {
                score += 10;
            }
            // Boost for test-id match
            if (node.testId?.toLowerCase().includes(descLower)) {
                score += 8;
            }
            if (score > 0) {
                candidates.push({ node, path: currentPath, score });
            }
            if (node.children?.length) {
                traverse(node.children, currentPath);
            }
        }
    }
    traverse(snapshot);
    return candidates.sort((a, b) => b.score - a.score);
}
/**
 * Generate multiple selector strategies for a single node.
 */
async function generateStrategiesForNode(candidate, fullSnapshot, targetDescription, options) {
    const { node, path } = candidate;
    const strategies = [];
    // Strategy 1: Test ID (highest priority, most stable)
    if (node.testId) {
        strategies.push({
            type: SelectorStrategyType.TestId,
            selector: `testId="${node.testId}"`,
            description: `Test ID: ${node.testId}`,
            metadata: { testId: node.testId },
        });
    }
    // Strategy 2: Accessibility label
    if (node.label) {
        strategies.push({
            type: SelectorStrategyType.AccessibilityLabel,
            selector: `label="${escapeSelectorValue(node.label)}"`,
            description: `Accessibility label: "${node.label}"`,
            metadata: { label: node.label },
        });
    }
    // Strategy 3: Role + index within parent
    if (node.role) {
        const siblings = getSiblings(node, fullSnapshot);
        const sameRoleSiblings = siblings.filter(s => s.role === node.role);
        const index = sameRoleSiblings.findIndex(s => s.ref === node.ref);
        if (index >= 0) {
            strategies.push({
                type: SelectorStrategyType.RoleIndex,
                selector: `role="${node.role}" index=${index}`,
                description: `${node.role} at index ${index} (of ${sameRoleSiblings.length})`,
                metadata: { role: node.role, index, totalSameRole: sameRoleSiblings.length },
            });
        }
    }
    // Strategy 4: XPath-like path from root
    const xpathLike = buildXPathLikePath(path, fullSnapshot);
    if (xpathLike) {
        strategies.push({
            type: SelectorStrategyType.XPathLike,
            selector: xpathLike,
            description: `Path: ${xpathLike}`,
            metadata: { path },
        });
    }
    // Strategy 5: LLM-generated composite (if enabled)
    if (options.useLLM) {
        try {
            const llmClient = createLLMSelectorClient({
                provider: options.llmProvider,
                model: options.llmModel,
            });
            const llmStrategies = await llmClient.generateStrategies(node, fullSnapshot, targetDescription, strategies);
            strategies.push(...llmStrategies);
        }
        catch (error) {
            // LLM failed, continue with heuristic strategies
            console.warn('[ai-selector] LLM strategy generation failed:', error);
        }
    }
    // Strategy 6: Composite - combine multiple attributes
    const composite = buildCompositeSelector(node);
    if (composite) {
        strategies.push({
            type: SelectorStrategyType.Composite,
            selector: composite,
            description: `Composite: ${composite}`,
            metadata: { attributes: extractSelectorAttributes(node) },
        });
    }
    return strategies;
}
/**
 * Build a selector chain with primary strategy and fallbacks.
 */
function buildSelectorChain(strategies, candidate, includeFallbacks) {
    if (strategies.length === 0) {
        return {
            targetRef: candidate.node.ref || '',
            strategies: [],
            confidence: 0,
            fallbackChain: [],
        };
    }
    // Sort strategies by reliability (TestId > Label > RoleIndex > XPath > Composite > LLM)
    const priorityOrder = [
        SelectorStrategyType.TestId,
        SelectorStrategyType.AccessibilityLabel,
        SelectorStrategyType.RoleIndex,
        SelectorStrategyType.Composite,
        SelectorStrategyType.XPathLike,
    ];
    const sorted = [...strategies].sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a.type);
        const bIdx = priorityOrder.indexOf(b.type);
        if (aIdx !== -1 && bIdx !== -1)
            return aIdx - bIdx;
        if (aIdx !== -1)
            return -1;
        if (bIdx !== -1)
            return 1;
        return 0;
    });
    const primary = sorted[0];
    const fallbacks = includeFallbacks ? sorted.slice(1) : [];
    // Calculate overall confidence
    const confidenceFactors = {
        hasTestId: strategies.some(s => s.type === SelectorStrategyType.TestId),
        hasStableLabel: strategies.some(s => s.type === SelectorStrategyType.AccessibilityLabel && isStableLabel(s.metadata?.label)),
        hasUniqueRoleIndex: strategies.some(s => s.type === SelectorStrategyType.RoleIndex && (s.metadata?.totalSameRole || 0) === 1),
        snapshotDepth: candidate.path.length,
        candidateScore: candidate.score,
    };
    const confidence = calculateConfidence(confidenceFactors);
    return {
        targetRef: candidate.node.ref || '',
        strategies: [primary, ...fallbacks],
        confidence,
        fallbackChain: fallbacks.map(f => f.selector),
        metadata: {
            primaryStrategy: primary.type,
            fallbackCount: fallbacks.length,
            candidatePath: candidate.path,
        },
    };
}
/**
 * Build XPath-like path from root to node.
 */
function buildXPathLikePath(path, snapshot) {
    if (path.length === 0)
        return null;
    // Simplified: just use refs in path
    return path.map(p => `@${p}`).join(' > ');
}
/**
 * Build composite selector combining multiple attributes.
 */
function buildCompositeSelector(node) {
    const parts = [];
    if (node.role)
        parts.push(`role="${node.role}"`);
    if (node.label)
        parts.push(`label="${escapeSelectorValue(node.label)}"`);
    if (node.testId)
        parts.push(`testId="${node.testId}"`);
    if (node.value !== undefined && node.value !== '') {
        parts.push(`value="${escapeSelectorValue(String(node.value))}"`);
    }
    return parts.length > 1 ? parts.join(' && ') : (parts[0] || null);
}
/**
 * Extract selector-relevant attributes from node.
 */
function extractSelectorAttributes(node) {
    const attrs = {};
    if (node.role)
        attrs.role = node.role;
    if (node.label)
        attrs.label = node.label;
    if (node.testId)
        attrs.testId = node.testId;
    if (node.value !== undefined)
        attrs.value = String(node.value);
    if (node.placeholder)
        attrs.placeholder = node.placeholder;
    return attrs;
}
/**
 * Get sibling nodes of a given node.
 */
function getSiblings(node, snapshot) {
    // Find parent and return its children
    function findParent(nodes, target) {
        for (const n of nodes) {
            if (n.children?.includes(target))
                return n;
            if (n.children) {
                const found = findParent(n.children, target);
                if (found)
                    return found;
            }
        }
        return null;
    }
    const parent = findParent(snapshot, node);
    return parent?.children || [];
}
/**
 * Check if a label is likely stable (not dynamic content).
 */
function isStableLabel(label) {
    if (!label)
        return false;
    const unstablePatterns = [
        /^\d+$/, // Just numbers
        /^[\d\s\-\:\.]+$/, // Timestamps, phone numbers
        /^[A-Z]{1,2}\d+$/, // IDs like "A1", "AB123"
    ];
    return !unstablePatterns.some(p => p.test(label.trim()));
}
/**
 * Escape selector value for safe use in selector strings.
 */
function escapeSelectorValue(value) {
    return value.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}
/**
 * Generate suggestions when no candidates found.
 */
function generateSuggestions(snapshot, description) {
    const suggestions = [];
    const labels = new Set();
    const roles = new Set();
    const testIds = new Set();
    function collect(nodes) {
        for (const node of nodes) {
            if (node.label)
                labels.add(node.label);
            if (node.role)
                roles.add(node.role);
            if (node.testId)
                testIds.add(node.testId);
            if (node.children?.length)
                collect(node.children);
        }
    }
    collect(snapshot);
    suggestions.push(`Available roles: ${Array.from(roles).slice(0, 10).join(', ')}`);
    suggestions.push(`Sample labels: ${Array.from(labels).slice(0, 10).join(', ')}`);
    if (testIds.size > 0) {
        suggestions.push(`Test IDs: ${Array.from(testIds).slice(0, 10).join(', ')}`);
    }
    return suggestions;
}
//# sourceMappingURL=selector-generator.js.map