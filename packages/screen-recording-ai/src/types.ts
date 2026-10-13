/**
 * Type definitions for AI Screen Recording package
 */

export interface AIRecordingOptions {
  /** Target platform */
  platform?: 'ios' | 'android' | 'web' | 'macos' | 'linux' | 'harmonyos' | 'tvos';
  /** Output video file path */
  outputPath?: string;
  /** Target app bundle ID or package name */
  targetApp?: string;
  /** Highlight detection sensitivity */
  highlightSensitivity?: 'low' | 'medium' | 'high';
  /** Custom patterns for highlight detection */
  customHighlightPatterns?: HighlightPattern[];
  /** Include network logs in evidence */
  includeNetworkLogs?: boolean;
  /** Include console logs in evidence */
  includeConsoleLogs?: boolean;
  /** Include performance metrics in evidence */
  includePerformanceMetrics?: boolean;
  /** Generate .ad replay script from recording */
  generateReplayScript?: boolean;
  /** Maximum recording duration in milliseconds */
  maxDurationMs?: number;
}

export interface HighlightPattern {
  name: string;
  description: string;
  // Could be a regex, a snapshot query, or a custom function identifier
  matcher: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface AIRecordingResult {
  sessionId: string;
  videoPath: string;
  duration: number;
  highlights: HighlightEvent[];
  evidence: ExtractedEvidence[];
  replayScript: GeneratedReplayScript | null;
  metadata: RecordingMetadata;
}

export interface RecordingMetadata {
  platform: string;
  startTime: number;
  endTime: number;
  frameCount: number;
}

export interface HighlightEvent {
  id: string;
  timestamp: number;
  type: HighlightType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  frameIndex: number;
  snapshotRef?: string;
  metadata?: Record<string, unknown>;
}

export type HighlightType =
  | 'error'
  | 'crash'
  | 'network-failure'
  | 'ui-change'
  | 'performance-drop'
  | 'console-error'
  | 'console-warning'
  | 'custom';

export interface HighlightDetectionOptions {
  frames: any[];
  platform: string;
  sensitivity: 'low' | 'medium' | 'high';
  customPatterns?: HighlightPattern[];
}

export interface HighlightDetectionResult {
  highlights: HighlightEvent[];
  summary: {
    total: number;
    byType: Record<HighlightType, number>;
    bySeverity: Record<string, number>;
  };
}

export interface EvidenceExtractionOptions {
  frames: any[];
  highlights: HighlightEvent[];
  platform: string;
  includeNetworkLogs: boolean;
  includeConsoleLogs: boolean;
  includePerformanceMetrics: boolean;
}

export interface ExtractedEvidence {
  id: string;
  timestamp: number;
  type: EvidenceType;
  title: string;
  description: string;
  data: any;
  relatedHighlights: string[];
}

export type EvidenceType =
  | 'network-request'
  | 'network-error'
  | 'console-log'
  | 'console-error'
  | 'performance-metric'
  | 'snapshot'
  | 'crash-report'
  | 'custom';

export interface ReplayGenerationOptions {
  highlights: HighlightEvent[];
  evidence: ExtractedEvidence[];
  platform: string;
  targetApp?: string;
}

export interface GeneratedReplayScript {
  script: string; // .ad script content
  steps: ReplayStep[];
  metadata: {
    generatedAt: string;
    platform: string;
    targetApp?: string;
    stepCount: number;
  };
}

export interface ReplayStep {
  command: string;
  args: Record<string, any>;
  description: string;
  timestamp: number;
  evidenceRefs: string[];
}