/**
 * AI-Enhanced Screen Recorder
 *
 * Wraps the native screen recording functionality with AI-powered
 * highlight detection and evidence extraction.
 */

import type { AIRecordingOptions, AIRecordingResult, HighlightEvent } from './types.js';
import { detectHighlights } from './highlights.js';
import { extractEvidence } from './evidence.js';
import { generateReplayScript } from './replay.js';

interface RecordingSession {
  id: string;
  startTime: number;
  options: AIRecordingOptions;
  videoPath: string;
  metadataPath: string;
  highlights: HighlightEvent[];
  evidence: any[];
}

/**
 * Start an AI-enhanced screen recording session.
 * Returns a session object that can be used to stop recording and get results.
 */
export async function startAIRecording(
  options: AIRecordingOptions = {}
): Promise<{ sessionId: string; stop: () => Promise<AIRecordingResult> }> {
  const sessionId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const startTime = Date.now();

  // In a real implementation, this would start the actual screen recording
  // via the agent-device screen-record command or platform-specific APIs
  const videoPath = options.outputPath || `.tmp/recordings/${sessionId}.mp4`;
  const metadataPath = `.tmp/recordings/${sessionId}.json`;

  const session: RecordingSession = {
    id: sessionId,
    startTime,
    options,
    videoPath,
    metadataPath,
    highlights: [],
    evidence: [],
  };

  // Store session (in practice, this would be in a session manager)
  activeSessions.set(sessionId, session);

  const stop = async (): Promise<AIRecordingResult> => {
    const endedSession = activeSessions.get(sessionId);
    if (!endedSession) {
      throw new Error(`Recording session ${sessionId} not found`);
    }
    activeSessions.delete(sessionId);

    const duration = Date.now() - startTime;

    // In real implementation, this would wait for the video file to be written
    // For now, we simulate the AI analysis on mock data
    const mockFrames = generateMockFrames(endedSession.options.platform || 'ios', duration);

    // Run AI highlight detection
    const highlights = await detectHighlights({
      frames: mockFrames,
      platform: endedSession.options.platform,
      sensitivity: endedSession.options.highlightSensitivity || 'medium',
      customPatterns: endedSession.options.customHighlightPatterns,
    });

    // Extract evidence
    const evidence = await extractEvidence({
      frames: mockFrames,
      highlights: highlights.highlights,
      platform: endedSession.options.platform,
      includeNetworkLogs: endedSession.options.includeNetworkLogs !== false,
      includeConsoleLogs: endedSession.options.includeConsoleLogs !== false,
      includePerformanceMetrics: endedSession.options.includePerformanceMetrics !== false,
    });

    // Generate replay script if requested
    let replayScript = null;
    if (endedSession.options.generateReplayScript) {
      replayScript = await generateReplayScript({
        highlights: highlights.highlights,
        evidence: evidence.evidence,
        platform: endedSession.options.platform,
        targetApp: endedSession.options.targetApp,
      });
    }

    return {
      sessionId,
      videoPath: endedSession.videoPath,
      duration,
      highlights: highlights.highlights,
      evidence: evidence.evidence,
      replayScript,
      metadata: {
        platform: endedSession.options.platform,
        startTime: endedSession.startTime,
        endTime: Date.now(),
        frameCount: mockFrames.length,
      },
    };
  };

  return { sessionId, stop };
}

/**
 * Stop an AI recording session and get results.
 * This is a convenience function that calls the stop function returned by startAIRecording.
 */
export async function stopAIRecording(
  sessionId: string
): Promise<AIRecordingResult> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Recording session ${sessionId} not found`);
  }

  // The stop function is not stored in the session in this simplified version
  // In practice, you'd store the stop function or have a session manager
  throw new Error('Use the stop function returned by startAIRecording()');
}

// In-memory session store (replace with persistent storage in production)
const activeSessions = new Map<string, RecordingSession>();

/**
 * Generate mock frames for testing/development.
 * In production, this would read actual video frames or accessibility snapshots.
 */
function generateMockFrames(platform: string, durationMs: number): any[] {
  const frameCount = Math.min(60, Math.floor(durationMs / 100)); // Max 60 frames, 10fps
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    frames.push({
      timestamp: i * 100,
      snapshot: generateMockSnapshot(platform, i),
      networkLogs: generateMockNetworkLogs(i),
      consoleLogs: generateMockConsoleLogs(i),
      performanceMetrics: generateMockPerformanceMetrics(i),
    });
  }

  return frames;
}

function generateMockSnapshot(platform: string, frameIndex: number): any {
  // Simulate UI changes over time
  const isErrorState = frameIndex > 20 && frameIndex < 25;
  const isLoadingState = frameIndex > 10 && frameIndex < 15;

  return {
    platform,
    timestamp: frameIndex * 100,
    nodes: [
      {
        ref: '@root',
        role: 'window',
        label: 'App',
        children: [
          {
            ref: '@nav',
            role: 'navigation-bar',
            label: 'Navigation',
            children: [
              { ref: '@title', role: 'text', label: isErrorState ? 'Error' : 'Contacts' },
            ],
          },
          {
            ref: '@content',
            role: 'view',
            children: isLoadingState
              ? [{ ref: '@spinner', role: 'activity-indicator', label: 'Loading...' }]
              : [
                  {
                    ref: '@list',
                    role: 'list',
                    children: Array.from({ length: 10 }, (_, i) => ({
                      ref: `@item${i}`,
                      role: 'cell',
                      label: `Contact ${i + 1}`,
                      children: [
                        { ref: `@name${i}`, role: 'text', label: `Name ${i + 1}` },
                        { ref: `@phone${i}`, role: 'text', label: `555-${1000 + i}` },
                      ],
                    })),
                  },
                  isErrorState && {
                    ref: '@error',
                    role: 'alert',
                    label: 'Failed to load contacts. Tap to retry.',
                  },
                ].filter(Boolean),
          },
        ],
      },
    ],
  };
}

function generateMockNetworkLogs(frameIndex: number): any[] {
  const logs = [];

  if (frameIndex === 5) {
    logs.push({
      timestamp: frameIndex * 100,
      url: 'https://api.example.com/contacts',
      method: 'GET',
      status: 200,
      duration: 245,
      responseSize: 2048,
    });
  }

  if (frameIndex === 22) {
    logs.push({
      timestamp: frameIndex * 100,
      url: 'https://api.example.com/contacts',
      method: 'GET',
      status: 500,
      duration: 5000,
      error: 'Internal Server Error',
    });
  }

  return logs;
}

function generateMockConsoleLogs(frameIndex: number): any[] {
  const logs = [];

  if (frameIndex === 10) {
    logs.push({
      timestamp: frameIndex * 100,
      level: 'log',
      message: 'Fetching contacts...',
    });
  }

  if (frameIndex === 22) {
    logs.push({
      timestamp: frameIndex * 100,
      level: 'error',
      message: 'Network request failed: 500 Internal Server Error',
    });
  }

  if (frameIndex === 23) {
    logs.push({
      timestamp: frameIndex * 100,
      level: 'warn',
      message: 'Retrying in 3 seconds...',
    });
  }

  return logs;
}

function generateMockPerformanceMetrics(frameIndex: number): any {
  return {
    timestamp: frameIndex * 100,
    cpuPercent: 15 + Math.random() * 10,
    memoryMB: 45 + Math.random() * 20,
    fps: isLoadingState(frameIndex) ? 30 : 60,
    frameTimeMs: isLoadingState(frameIndex) ? 33 : 16,
  };
}

function isLoadingState(frameIndex: number): boolean {
  return frameIndex > 10 && frameIndex < 15;
}