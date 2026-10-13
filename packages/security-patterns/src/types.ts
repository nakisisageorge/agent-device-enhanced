/**
 * Type definitions for Security Patterns package
 */

export interface CredentialScanOptions {
  /** Text content to scan (logs, snapshots, network bodies) */
  content: string;
  /** Source identifier for the finding */
  source: string;
  /** Platform context */
  platform?: 'ios' | 'android' | 'web' | 'macos' | 'linux' | 'harmonyos' | 'tvos';
  /** Custom patterns to add */
  customPatterns?: CredentialPattern[];
  /** Minimum severity to report */
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface CredentialPattern {
  name: string;
  description: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  // Optional: function to validate if match is a false positive
  validator?: (match: string, context: string) => boolean;
}

export interface CredentialFinding {
  id: string;
  patternName: string;
  patternDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedText: string; // Redacted for safety
  fullMatch: string; // The actual matched text (use carefully)
  location: {
    source: string;
    line?: number;
    column?: number;
  };
  platform?: string;
  remediation: string;
}

export interface PIIScanOptions {
  content: string;
  source: string;
  platform?: string;
  customPatterns?: PIIPattern[];
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  /** Redact findings in output */
  redactOutput?: boolean;
}

export interface PIIPattern {
  name: string;
  description: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  validator?: (match: string, context: string) => boolean;
}

export interface PIIFinding {
  id: string;
  patternName: string;
  patternDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedText: string; // Redacted
  fullMatch: string;
  location: {
    source: string;
    line?: number;
    column?: number;
  };
  platform?: string;
  remediation: string;
}

export interface StorageScanOptions {
  /** Platform to scan */
  platform: 'ios' | 'android' | 'web' | 'harmonyos';
  /** App bundle ID / package name */
  appId: string;
  /** Device/simulator identifier */
  deviceId?: string;
  /** Custom storage paths to check */
  customPaths?: string[];
}

export interface StorageFinding {
  id: string;
  type: 'shared-preferences' | 'keychain' | 'keychain-insecure' | 'async-storage' | 'sqlite' | 'realm' | 'user-defaults' | 'file' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  path: string;
  evidence: any;
  remediation: string;
}

export interface PinningVerificationOptions {
  appId: string;
  deviceId?: string;
  platform: 'ios' | 'android' | 'harmonyos';
  /** Hostnames to verify pinning for */
  hostnames?: string[];
  /** Test with invalid certificate */
  testInvalidCert?: boolean;
}

export interface PinningResult {
  hostname: string;
  pinned: boolean;
  pins?: string[]; // SHA256 hashes of pinned certificates
  error?: string;
  testedAt: string;
}

export interface SecurityScanOptions {
  sessionId: string;
  platform: 'ios' | 'android' | 'web' | 'macos' | 'linux' | 'harmonyos' | 'tvos';
  appId?: string;
  deviceId?: string;
  /** Enable specific scan types */
  scans: {
    credentials?: boolean;
    pii?: boolean;
    storage?: boolean;
    pinning?: boolean;
    network?: boolean;
  };
  /** Custom patterns */
  customCredentialPatterns?: CredentialPattern[];
  customPIIPatterns?: PIIPattern[];
}

export interface SecurityScanResult {
  sessionId: string;
  platform: string;
  timestamp: string;
  findings: SecurityFinding[];
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  passed: boolean;
}

export interface SecurityFinding {
  id: string;
  type: 'credential' | 'pii' | 'storage' | 'pinning' | 'network' | 'config';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: string;
  evidence: any;
  remediation: string;
  references?: string[]; // OWASP MASVS, CWE, etc.
}