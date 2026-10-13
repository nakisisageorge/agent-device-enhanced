/**
 * Replay Script Generation from Recordings
 *
 * Converts AI-detected highlights and extracted evidence into
 * executable .ad replay scripts for CI/CD and regression testing.
 */

import type { ReplayGenerationOptions, GeneratedReplayScript, ReplayStep } from './types.js';

/**
 * Generate a .ad replay script from highlights and evidence.
 */
export async function generateReplayScript(
  options: ReplayGenerationOptions
): Promise<GeneratedReplayScript> {
  const { highlights, evidence, platform, targetApp } = options;
  const steps: ReplayStep[] = [];

  // Add setup steps
  if (targetApp) {
    steps.push({
      command: 'open',
      args: { app: targetApp, platform },
      description: `Open target app: ${targetApp}`,
      timestamp: 0,
      evidenceRefs: [],
    });
  }

  steps.push({
    command: 'snapshot',
    args: { interactiveOnly: true },
    description: 'Capture initial accessibility snapshot',
    timestamp: 100,
    evidenceRefs: [],
  });

  // Group highlights by type and generate reproduction steps
  const errorHighlights = highlights.filter(h =>
    h.severity === 'error' || h.severity === 'critical' || h.type === 'error' || h.type === 'crash'
  );

  const networkHighlights = highlights.filter(h => h.type === 'network-failure');
  const uiHighlights = highlights.filter(h => h.type === 'ui-change');
  const perfHighlights = highlights.filter(h => h.type === 'performance-drop');

  // Generate steps for error reproduction
  if (errorHighlights.length > 0) {
    steps.push(...generateErrorReproductionSteps(errorHighlights, evidence));
  }

  // Generate steps for network failure reproduction
  if (networkHighlights.length > 0) {
    steps.push(...generateNetworkReproductionSteps(networkHighlights, evidence));
  }

  // Generate steps for UI interaction
  if (uiHighlights.length > 0) {
    steps.push(...generateUIInteractionSteps(uiHighlights, evidence));
  }

  // Add verification steps
  steps.push(...generateVerificationSteps(highlights, evidence));

  // Add cleanup
  steps.push({
    command: 'close',
    args: {},
    description: 'Close the session',
    timestamp: Date.now(),
    evidenceRefs: [],
  });

  // Generate .ad script content
  const scriptContent = generateADScript(steps, platform, targetApp);

  return {
    script: scriptContent,
    steps,
    metadata: {
      generatedAt: new Date().toISOString(),
      platform,
      targetApp,
      stepCount: steps.length,
    },
  };
}

function generateErrorReproductionSteps(highlights: any[], evidence: any[]): ReplayStep[] {
  const steps: ReplayStep[] = [];

  for (const highlight of highlights) {
    // Find related console error evidence
    const consoleError = evidence.find(e =>
      e.type === 'console-error' &&
      Math.abs(e.timestamp - highlight.timestamp) < 5000
    );

    // Find related snapshot
    const snapshot = evidence.find(e =>
      e.type === 'snapshot' &&
      e.relatedHighlights.includes(highlight.id)
    );

    if (snapshot) {
      steps.push({
        command: 'snapshot',
        args: { interactiveOnly: true },
        description: `Capture snapshot at error: ${highlight.title}`,
        timestamp: highlight.timestamp,
        evidenceRefs: [snapshot.id],
      });
    }

    if (consoleError) {
      steps.push({
        command: 'log',
        args: { level: 'error', message: `Reproduced error: ${consoleError.description}` },
        description: `Log error: ${consoleError.description}`,
        timestamp: highlight.timestamp + 100,
        evidenceRefs: [consoleError.id],
      });
    }

    // If it's a UI alert, try to dismiss it
    if (highlight.type === 'ui-change' && highlight.metadata?.role === 'alert') {
      steps.push({
        command: 'press',
        args: { ref: highlight.snapshotRef, settle: true },
        description: `Dismiss error alert: ${highlight.description}`,
        timestamp: highlight.timestamp + 200,
        evidenceRefs: [highlight.id],
      });
    }
  }

  return steps;
}

function generateNetworkReproductionSteps(highlights: any[], evidence: any[]): ReplayStep[] {
  const steps: ReplayStep[] = [];

  for (const highlight of highlights) {
    const networkError = evidence.find(e =>
      e.type === 'network-error' &&
      Math.abs(e.timestamp - highlight.timestamp) < 5000
    );

    if (networkError) {
      steps.push({
        command: 'log',
        args: {
          level: 'warning',
          message: `Network failure reproduced: ${networkError.data.method} ${networkError.data.url} -> ${networkError.data.status}`,
        },
        description: `Verify network failure: ${highlight.title}`,
        timestamp: highlight.timestamp,
        evidenceRefs: [networkError.id],
      });

      // If there's a retry button in the UI, press it
      const retrySnapshot = evidence.find(e =>
        e.type === 'snapshot' &&
        e.relatedHighlights.includes(highlight.id)
      );

      if (retrySnapshot?.data?.snapshot) {
        // Search for retry button in snapshot
        const retryButton = findRetryButton(retrySnapshot.data.snapshot);
        if (retryButton) {
          steps.push({
            command: 'press',
            args: { ref: retryButton.ref, settle: true },
            description: 'Press retry button',
            timestamp: highlight.timestamp + 500,
            evidenceRefs: [retrySnapshot.id, highlight.id],
          });
        }
      }
    }
  }

  return steps;
}

function generateUIInteractionSteps(highlights: any[], evidence: any[]): ReplayStep[] {
  const steps: ReplayStep[] = [];

  for (const highlight of highlights) {
    if (highlight.snapshotRef) {
      steps.push({
        command: 'press',
        args: { ref: highlight.snapshotRef, settle: true },
        description: `Interact with UI element: ${highlight.description}`,
        timestamp: highlight.timestamp,
        evidenceRefs: [highlight.id],
      });
    }
  }

  return steps;
}

function generateVerificationSteps(highlights: any[], evidence: any[]): ReplayStep[] {
  const steps: ReplayStep[] = [];

  // Add assertions based on evidence
  const networkErrors = evidence.filter(e => e.type === 'network-error');
  if (networkErrors.length > 0) {
    steps.push({
      command: 'assert',
      args: {
        condition: 'no-network-errors',
        message: 'No network errors should occur during replay',
      },
      description: 'Assert no network errors in replay',
      timestamp: Date.now(),
      evidenceRefs: networkErrors.map(e => e.id),
    });
  }

  const consoleErrors = evidence.filter(e => e.type === 'console-error');
  if (consoleErrors.length > 0) {
    steps.push({
      command: 'assert',
      args: {
        condition: 'no-console-errors',
        message: 'No console errors should occur during replay',
      },
      description: 'Assert no console errors in replay',
      timestamp: Date.now(),
      evidenceRefs: consoleErrors.map(e => e.id),
    });
  }

  return steps;
}

function findRetryButton(snapshot: any): { ref: string } | null {
  function traverse(nodes: any[]): { ref: string } | null {
    for (const node of nodes) {
      const label = node.label?.toLowerCase() || '';
      if ((label.includes('retry') || label.includes('try again') || label.includes('reload')) &&
          (node.role === 'button' || node.role === 'link')) {
        return { ref: node.ref };
      }
      if (node.children?.length) {
        const found = traverse(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  return traverse(snapshot.nodes || []);
}

function generateADScript(steps: ReplayStep[], platform: string, targetApp?: string): string {
  const lines: string[] = [
    '# agent-device replay script',
    `# Generated: ${new Date().toISOString()}`,
    `# Platform: ${platform}`,
    targetApp ? `# Target App: ${targetApp}` : '',
    '',
  ];

  for (const step of steps) {
    const argsStr = Object.entries(step.args)
      .map(([k, v]) => {
        if (typeof v === 'string') return `${k}="${v}"`;
        if (typeof v === 'boolean') return v ? k : '';
        return `${k}=${JSON.stringify(v)}`;
      })
      .filter(Boolean)
      .join(' ');

    lines.push(`# ${step.description}`);
    lines.push(`agent-device ${step.command} ${argsStr}`);
    lines.push('');
  }

  return lines.join('\n');
}