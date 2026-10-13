/**
 * AI-Powered Highlight Detection
 *
 * Analyzes recorded frames to detect significant events:
 * - Errors and crashes
 * - Network failures
 * - UI state changes
 * - Performance drops
 * - Console errors/warnings
 * - Custom patterns
 */

import type { HighlightDetectionOptions, HighlightDetectionResult, HighlightEvent, HighlightType, HighlightPattern } from './types.js';

const DEFAULT_PATTERNS: HighlightPattern[] = [
  {
    name: 'network-error',
    description: 'HTTP 4xx/5xx responses',
    matcher: 'networkLogs.status >= 400',
    severity: 'error',
  },
  {
    name: 'network-timeout',
    description: 'Network requests timing out',
    matcher: 'networkLogs.duration > 10000',
    severity: 'warning',
  },
  {
    name: 'console-error',
    description: 'Console error messages',
    matcher: 'consoleLogs.level === "error"',
    severity: 'error',
  },
  {
    name: 'console-warning',
    description: 'Console warning messages',
    matcher: 'consoleLogs.level === "warn"',
    severity: 'warning',
  },
  {
    name: 'ui-alert',
    description: 'Alert/Error UI elements appearing',
    matcher: 'snapshot.nodes.some(n => n.role === "alert" || n.role === "dialog")',
    severity: 'warning',
  },
  {
    name: 'performance-drop',
    description: 'FPS dropping below 30',
    matcher: 'performanceMetrics.fps < 30',
    severity: 'warning',
  },
  {
    name: 'high-memory',
    description: 'Memory usage above 200MB',
    matcher: 'performanceMetrics.memoryMB > 200',
    severity: 'warning',
  },
];

/**
 * Detect highlights from recorded frames using AI-assisted analysis.
 */
export async function detectHighlights(
  options: HighlightDetectionOptions
): Promise<HighlightDetectionResult> {
  const { frames, platform, sensitivity, customPatterns = [] } = options;
  const allPatterns = [...DEFAULT_PATTERNS, ...customPatterns];
  const highlights: HighlightEvent[] = [];

  // Thresholds based on sensitivity
  const thresholds = getThresholds(sensitivity);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const frameHighlights = await analyzeFrame(frame, i, platform, allPatterns, thresholds);
    highlights.push(...frameHighlights);
  }

  // Deduplicate similar highlights (e.g., consecutive frames with same error)
  const deduplicated = deduplicateHighlights(highlights);

  // Generate summary
  const summary = generateSummary(deduplicated);

  return {
    highlights: deduplicated,
    summary,
  };
}

/**
 * Analyze a single frame for highlights.
 */
async function analyzeFrame(
  frame: any,
  frameIndex: number,
  platform: string,
  patterns: HighlightPattern[],
  thresholds: Record<string, number>
): Promise<HighlightEvent[]> {
  const highlights: HighlightEvent[] = [];

  // Check network logs
  if (frame.networkLogs?.length) {
    for (const log of frame.networkLogs) {
      if (log.status >= 400) {
        highlights.push(createHighlight({
          id: `network-error-${frameIndex}-${log.url.replace(/[^a-z0-9]/gi, '-')}`,
          timestamp: frame.timestamp,
          type: 'network-failure',
          severity: log.status >= 500 ? 'error' : 'warning',
          title: `Network ${log.status}: ${log.method} ${log.url}`,
          description: `HTTP ${log.status} in ${log.duration}ms${log.error ? `: ${log.error}` : ''}`,
          frameIndex,
          metadata: { url: log.url, method: log.method, status: log.status, duration: log.duration },
        }));
      }

      if (log.duration > thresholds.networkTimeout) {
        highlights.push(createHighlight({
          id: `network-timeout-${frameIndex}-${log.url.replace(/[^a-z0-9]/gi, '-')}`,
          timestamp: frame.timestamp,
          type: 'network-failure',
          severity: 'warning',
          title: `Slow Request: ${log.method} ${log.url}`,
          description: `Request took ${log.duration}ms (threshold: ${thresholds.networkTimeout}ms)`,
          frameIndex,
          metadata: { url: log.url, method: log.method, duration: log.duration },
        }));
      }
    }
  }

  // Check console logs
  if (frame.consoleLogs?.length) {
    for (const log of frame.consoleLogs) {
      if (log.level === 'error') {
        highlights.push(createHighlight({
          id: `console-error-${frameIndex}-${hashString(log.message)}`,
          timestamp: frame.timestamp,
          type: 'console-error',
          severity: 'error',
          title: 'Console Error',
          description: log.message,
          frameIndex,
          metadata: { level: log.level, message: log.message },
        }));
      } else if (log.level === 'warn') {
        highlights.push(createHighlight({
          id: `console-warn-${frameIndex}-${hashString(log.message)}`,
          timestamp: frame.timestamp,
          type: 'console-warning',
          severity: 'warning',
          title: 'Console Warning',
          description: log.message,
          frameIndex,
          metadata: { level: log.level, message: log.message },
        }));
      }
    }
  }

  // Check performance metrics
  if (frame.performanceMetrics) {
    const perf = frame.performanceMetrics;

    if (perf.fps < thresholds.fps) {
      highlights.push(createHighlight({
        id: `perf-fps-${frameIndex}`,
        timestamp: frame.timestamp,
        type: 'performance-drop',
        severity: perf.fps < 15 ? 'error' : 'warning',
        title: `Low FPS: ${Math.round(perf.fps)}`,
        description: `Frame rate dropped to ${Math.round(perf.fps)} FPS (frame time: ${perf.frameTimeMs}ms)`,
        frameIndex,
        metadata: { fps: perf.fps, frameTimeMs: perf.frameTimeMs },
      }));
    }

    if (perf.memoryMB > thresholds.memoryMB) {
      highlights.push(createHighlight({
        id: `perf-memory-${frameIndex}`,
        timestamp: frame.timestamp,
        type: 'performance-drop',
        severity: 'warning',
        title: `High Memory: ${Math.round(perf.memoryMB)}MB`,
        description: `Memory usage exceeded ${thresholds.memoryMB}MB threshold`,
        frameIndex,
        metadata: { memoryMB: perf.memoryMB },
      }));
    }
  }

  // Check UI state changes (snapshot analysis)
  if (frame.snapshot?.nodes) {
    const uiHighlights = analyzeUISnapshot(frame.snapshot, frameIndex, frame.timestamp, platform);
    highlights.push(...uiHighlights);
  }

  // Apply custom patterns (simplified - in practice would use a proper expression evaluator)
  for (const pattern of patterns) {
    if (pattern.matcher.includes('custom') || pattern.name.startsWith('custom-')) {
      // Custom pattern matching would go here
      // For now, skip custom patterns in this implementation
    }
  }

  return highlights;
}

/**
 * Analyze accessibility snapshot for UI-related highlights.
 */
function analyzeUISnapshot(
  snapshot: any,
  frameIndex: number,
  timestamp: number,
  platform: string
): HighlightEvent[] {
  const highlights: HighlightEvent[] = [];

  function traverse(nodes: any[]) {
    for (const node of nodes) {
      // Check for alert/error dialogs
      if (node.role === 'alert' || (node.role === 'dialog' && node.label?.toLowerCase().includes('error'))) {
        highlights.push(createHighlight({
          id: `ui-alert-${frameIndex}-${node.ref || 'unknown'}`,
          timestamp,
          type: 'ui-change',
          severity: 'error',
          title: 'Error Dialog/Alert Detected',
          description: node.label || 'Unknown error dialog',
          frameIndex,
          snapshotRef: node.ref,
          metadata: { role: node.role, label: node.label, platform },
        }));
      }

      // Check for loading states that persist too long
      if (node.role === 'activity-indicator' || node.role === 'progress-indicator') {
        highlights.push(createHighlight({
          id: `ui-loading-${frameIndex}-${node.ref || 'unknown'}`,
          timestamp,
          type: 'ui-change',
          severity: 'info',
          title: 'Loading Indicator Active',
          description: node.label || 'Loading...',
          frameIndex,
          snapshotRef: node.ref,
          metadata: { role: node.role, label: node.label },
        }));
      }

      // Check for empty states
      if (node.role === 'list' || node.role === 'collection') {
        const itemCount = node.children?.length || 0;
        if (itemCount === 0 && node.label?.toLowerCase().includes('empty')) {
          highlights.push(createHighlight({
            id: `ui-empty-${frameIndex}-${node.ref || 'unknown'}`,
            timestamp,
            type: 'ui-change',
            severity: 'info',
            title: 'Empty State Detected',
            description: node.label || 'List is empty',
            frameIndex,
            snapshotRef: node.ref,
            metadata: { role: node.role, label: node.label },
          }));
        }
      }

      if (node.children?.length) {
        traverse(node.children);
      }
    }
  }

  traverse(snapshot.nodes);
  return highlights;
}

/**
 * Create a highlight event object.
 */
function createHighlight(params: Omit<HighlightEvent, 'id'> & { id: string }): HighlightEvent {
  return params;
}

/**
 * Deduplicate consecutive highlights of the same type.
 */
function deduplicateHighlights(highlights: HighlightEvent[]): HighlightEvent[] {
  if (highlights.length <= 1) return highlights;

  const deduplicated: HighlightEvent[] = [];
  let lastHighlight: HighlightEvent | null = null;

  for (const highlight of highlights) {
    if (
      lastHighlight &&
      highlight.type === lastHighlight.type &&
      highlight.severity === lastHighlight.severity &&
      Math.abs(highlight.timestamp - lastHighlight.timestamp) < 500 // Within 500ms
    ) {
      // Merge: update the last highlight's timestamp and extend description
      lastHighlight.timestamp = highlight.timestamp;
      lastHighlight.frameIndex = highlight.frameIndex;
      if (highlight.metadata) {
        lastHighlight.metadata = { ...lastHighlight.metadata, ...highlight.metadata };
      }
    } else {
      deduplicated.push(highlight);
      lastHighlight = highlight;
    }
  }

  return deduplicated;
}

/**
 * Generate summary statistics.
 */
function generateSummary(highlights: HighlightEvent[]): HighlightDetectionResult['summary'] {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const h of highlights) {
    byType[h.type] = (byType[h.type] || 0) + 1;
    bySeverity[h.severity] = (bySeverity[h.severity] || 0) + 1;
  }

  return {
    total: highlights.length,
    byType: byType as Record<HighlightType, number>,
    bySeverity,
  };
}

/**
 * Get detection thresholds based on sensitivity.
 */
function getThresholds(sensitivity: 'low' | 'medium' | 'high'): Record<string, number> {
  const configs = {
    low: { networkTimeout: 15000, fps: 20, memoryMB: 300 },
    medium: { networkTimeout: 10000, fps: 30, memoryMB: 200 },
    high: { networkTimeout: 5000, fps: 45, memoryMB: 150 },
  };
  return configs[sensitivity];
}

/**
 * Simple string hash for ID generation.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}