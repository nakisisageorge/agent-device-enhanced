/**
 * AI-Enhanced Screen Recording for agent-device
 *
 * Provides automatic highlight detection, evidence extraction,
 * and replay script generation from screen recordings.
 */

export {
  startAIRecording,
  stopAIRecording,
  type AIRecordingOptions,
  type AIRecordingResult,
  type HighlightEvent,
} from './recorder.js';

export {
  detectHighlights,
  type HighlightDetectionOptions,
  type HighlightDetectionResult,
} from './highlights.js';

export {
  extractEvidence,
  type EvidenceExtractionOptions,
  type ExtractedEvidence,
} from './evidence.js';

export {
  generateReplayScript,
  type ReplayGenerationOptions,
  type GeneratedReplayScript,
} from './replay.js';