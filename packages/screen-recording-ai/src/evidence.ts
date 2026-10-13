/**
 * Evidence Extraction from Screen Recordings
 *
 * Extracts structured evidence from recorded frames and highlights:
 * - Network request/response data
 * - Console logs and errors
 * - Performance metrics
 * - Accessibility snapshots at key moments
 * - Crash reports and stack traces
 */

import type { EvidenceExtractionOptions, ExtractedEvidence, EvidenceType } from './types.js';

/**
 * Extract structured evidence from recorded frames and highlights.
 */
export async function extractEvidence(
  options: EvidenceExtractionOptions
): Promise<{ evidence: ExtractedEvidence[]; summary: EvidenceSummary }> {
  const { frames, highlights, platform, includeNetworkLogs, includeConsoleLogs, includePerformanceMetrics } = options;
  const evidence: ExtractedEvidence[] = [];

  // Build a timeline of all events
  const timeline = buildEventTimeline(frames, highlights);

  // Extract network evidence
  if (includeNetworkLogs) {
    evidence.push(...extractNetworkEvidence(timeline, platform));
  }

  // Extract console evidence
  if (includeConsoleLogs) {
    evidence.push(...extractConsoleEvidence(timeline, platform));
  }

  // Extract performance evidence
  if (includePerformanceMetrics) {
    evidence.push(...extractPerformanceEvidence(timeline, platform));
  }

  // Extract snapshot evidence at highlight moments
  evidence.push(...extractSnapshotEvidence(highlights, frames, platform));

  // Extract crash evidence if any
  evidence.push(...extractCrashEvidence(timeline, platform));

  // Sort by timestamp
  evidence.sort((a, b) => a.timestamp - b.timestamp);

  return {
    evidence,
    summary: generateEvidenceSummary(evidence),
  };
}

interface TimelineEvent {
  timestamp: number;
  frameIndex: number;
  type: string;
  data: any;
}

function buildEventTimeline(frames: any[], highlights: any[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (frame.networkLogs?.length) {
      for (const log of frame.networkLogs) {
        events.push({
          timestamp: frame.timestamp,
          frameIndex: i,
          type: 'network',
          data: log,
        });
      }
    }

    if (frame.consoleLogs?.length) {
      for (const log of frame.consoleLogs) {
        events.push({
          timestamp: frame.timestamp,
          frameIndex: i,
          type: 'console',
          data: log,
        });
      }
    }

    if (frame.performanceMetrics) {
      events.push({
        timestamp: frame.timestamp,
        frameIndex: i,
        type: 'performance',
        data: frame.performanceMetrics,
      });
    }

    if (frame.snapshot) {
      events.push({
        timestamp: frame.timestamp,
        frameIndex: i,
        type: 'snapshot',
        data: frame.snapshot,
      });
    }
  }

  for (const highlight of highlights) {
    events.push({
      timestamp: highlight.timestamp,
      frameIndex: highlight.frameIndex,
      type: 'highlight',
      data: highlight,
    });
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

function extractNetworkEvidence(timeline: TimelineEvent[], platform: string): ExtractedEvidence[] {
  const evidence: ExtractedEvidence[] = [];
  const networkEvents = timeline.filter(e => e.type === 'network');

  for (const event of networkEvents) {
    const log = event.data;
    const isError = log.status >= 400;

    evidence.push({
      id: `net-${event.frameIndex}-${hashString(log.url)}`,
      timestamp: event.timestamp,
      type: isError ? 'network-error' : 'network-request',
      title: isError ? `Failed Request: ${log.method} ${log.url}` : `Request: ${log.method} ${log.url}`,
      description: isError
        ? `HTTP ${log.status} after ${log.duration}ms${log.error ? `: ${log.error}` : ''}`
        : `Completed in ${log.duration}ms, ${log.responseSize} bytes`,
      data: {
        url: log.url,
        method: log.method,
        status: log.status,
        duration: log.duration,
        requestHeaders: log.requestHeaders,
        responseHeaders: log.responseHeaders,
        responseSize: log.responseSize,
        error: log.error,
      },
      relatedHighlights: [], // Would be populated by matching with highlights
    });
  }

  return evidence;
}

function extractConsoleEvidence(timeline: TimelineEvent[], platform: string): ExtractedEvidence[] {
  const evidence: ExtractedEvidence[] = [];
  const consoleEvents = timeline.filter(e => e.type === 'console');

  for (const event of consoleEvents) {
    const log = event.data;
    const isError = log.level === 'error';

    evidence.push({
      id: `console-${event.frameIndex}-${hashString(log.message)}`,
      timestamp: event.timestamp,
      type: isError ? 'console-error' : 'console-log',
      title: isError ? 'Console Error' : `Console ${log.level}`,
      description: log.message,
      data: {
        level: log.level,
        message: log.message,
        args: log.args,
        stack: log.stack,
      },
      relatedHighlights: [],
    });
  }

  return evidence;
}

function extractPerformanceEvidence(timeline: TimelineEvent[], platform: string): ExtractedEvidence[] {
  const evidence: ExtractedEvidence[] = [];
  const perfEvents = timeline.filter(e => e.type === 'performance');

  // Sample every 10th event to avoid too many data points
  const sampled = perfEvents.filter((_, i) => i % 10 === 0);

  for (const event of sampled) {
    const metrics = event.data;

    evidence.push({
      id: `perf-${event.frameIndex}`,
      timestamp: event.timestamp,
      type: 'performance-metric',
      title: 'Performance Metrics',
      description: `FPS: ${Math.round(metrics.fps)}, Memory: ${Math.round(metrics.memoryMB)}MB, CPU: ${Math.round(metrics.cpuPercent)}%`,
      data: {
        fps: metrics.fps,
        frameTimeMs: metrics.frameTimeMs,
        memoryMB: metrics.memoryMB,
        cpuPercent: metrics.cpuPercent,
      },
      relatedHighlights: [],
    });
  }

  return evidence;
}

function extractSnapshotEvidence(highlights: any[], frames: any[], platform: string): ExtractedEvidence[] {
  const evidence: ExtractedEvidence[] = [];

  for (const highlight of highlights) {
    // Find the closest frame with a snapshot
    const frame = frames[highlight.frameIndex] || frames[frames.length - 1];
    if (!frame?.snapshot) continue;

    evidence.push({
      id: `snapshot-${highlight.id}`,
      timestamp: highlight.timestamp,
      type: 'snapshot',
      title: `Snapshot at ${highlight.title}`,
      description: `Accessibility tree captured at highlight: ${highlight.description}`,
      data: {
        snapshot: frame.snapshot,
        highlightRef: highlight.id,
        platform,
      },
      relatedHighlights: [highlight.id],
    });
  }

  return evidence;
}

function extractCrashEvidence(timeline: TimelineEvent[], platform: string): ExtractedEvidence[] {
  const evidence: ExtractedEvidence[] = [];

  // Look for crash indicators in console logs
  const crashLogs = timeline.filter(
    e => e.type === 'console' &&
    (e.data.message?.includes('crash') ||
     e.data.message?.includes('fatal') ||
     e.data.message?.includes('uncaught') ||
     e.data.message?.includes('unhandled') ||
     e.data.stack)
  );

  for (const event of crashLogs) {
    evidence.push({
      id: `crash-${event.frameIndex}-${hashString(event.data.message)}`,
      timestamp: event.timestamp,
      type: 'crash-report',
      title: 'Potential Crash Detected',
      description: event.data.message,
      data: {
        message: event.data.message,
        stack: event.data.stack,
        level: event.data.level,
      },
      relatedHighlights: [],
    });
  }

  return evidence;
}

function generateEvidenceSummary(evidence: ExtractedEvidence[]): EvidenceSummary {
  const byType: Record<EvidenceType, number> = {} as Record<EvidenceType, number>;
  let errorCount = 0;
  let warningCount = 0;

  for (const e of evidence) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    if (e.type === 'network-error' || e.type === 'console-error' || e.type === 'crash-report') {
      errorCount++;
    } else if (e.type === 'console-log' && e.data.level === 'warn') {
      warningCount++;
    }
  }

  return {
    total: evidence.length,
    byType,
    errorCount,
    warningCount,
  };
}

interface EvidenceSummary {
  total: number;
  byType: Record<EvidenceType, number>;
  errorCount: number;
  warningCount: number;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}