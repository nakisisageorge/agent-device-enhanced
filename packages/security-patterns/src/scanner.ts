/**
 * Main Security Scanner Orchestrator
 *
 * Runs all security scans and aggregates results.
 */

import type { SecurityScanOptions, SecurityScanResult, SecurityFinding } from './types.js';
import { scanForCredentials } from './credentials.js';
import { scanForPII } from './pii.js';
import { scanInsecureStorage } from './storage.js';
import { verifyCertificatePinning } from './network.js';

/**
 * Run comprehensive security scan.
 */
export async function runSecurityScan(
  options: SecurityScanOptions
): Promise<SecurityScanResult> {
  const {
    sessionId,
    platform,
    appId,
    deviceId,
    scans = {},
    customCredentialPatterns = [],
    customPIIPatterns = [],
  } = options;

  const allFindings: SecurityFinding[] = [];

  // Collect content to scan from session artifacts
  // In real implementation, this would read from agent-device session artifacts
  const sessionContent = await collectSessionContent(sessionId, platform);

  // Credential scanning
  if (scans.credentials !== false) {
    const credentialFindings = await scanForCredentials({
      content: sessionContent,
      source: `session-${sessionId}`,
      platform: platform as any,
      customPatterns: customCredentialPatterns,
    });

    allFindings.push(...credentialFindings.map(f => ({
      id: f.id,
      type: 'credential' as const,
      severity: f.severity,
      title: f.patternDescription,
      description: `Found ${f.patternDescription} in ${f.location.source}`,
      location: f.location.source,
      evidence: { pattern: f.patternName, redactedMatch: f.matchedText },
      remediation: f.remediation,
      references: getCredentialReferences(f.patternName),
    })));
  }

  // PII scanning
  if (scans.pii !== false) {
    const piiFindings = await scanForPII({
      content: sessionContent,
      source: `session-${sessionId}`,
      platform,
      customPatterns: customPIIPatterns,
    });

    allFindings.push(...piiFindings.map(f => ({
      id: f.id,
      type: 'pii' as const,
      severity: f.severity,
      title: f.patternDescription,
      description: `Found ${f.patternDescription} in ${f.location.source}`,
      location: f.location.source,
      evidence: { pattern: f.patternName, redactedMatch: f.matchedText },
      remediation: f.remediation,
      references: getPIIReferences(f.patternName),
    })));
  }

  // Storage scanning
  if (scans.storage !== false && appId) {
    const storageFindings = await scanInsecureStorage({
      platform: platform as any,
      appId,
      deviceId,
    });

    allFindings.push(...storageFindings.map(f => ({
      id: f.id,
      type: 'storage' as const,
      severity: f.severity,
      title: f.title,
      description: f.description,
      location: f.path,
      evidence: f.evidence,
      remediation: f.remediation,
      references: getStorageReferences(f.type),
    })));
  }

  // Certificate pinning verification
  if (scans.pinning !== false && appId) {
    const pinningResults = await verifyCertificatePinning({
      appId,
      deviceId,
      platform: platform as any,
    });

    allFindings.push(...pinningResults
      .filter(r => !r.pinned)
      .map(r => ({
        id: `pinning-${r.hostname}`,
        type: 'pinning' as const,
        severity: 'high' as const,
        title: `Certificate pinning not enforced: ${r.hostname}`,
        description: r.error || 'No certificate pinning configured',
        location: r.hostname,
        evidence: { hostname: r.hostname, pins: r.pins },
        remediation: 'Implement certificate pinning for this hostname. Use platform-specific configuration.',
        references: ['OWASP MASVS-NETWORK-3', 'CWE-295'],
      })));
  }

  // Network security scanning (placeholder for additional checks)
  if (scans.network !== false) {
    const networkFindings = await scanNetworkSecurity(sessionContent, platform);
    allFindings.push(...networkFindings);
  }

  // Calculate summary
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const finding of allFindings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
    byType[finding.type] = (byType[finding.type] || 0) + 1;
  }

  // Determine overall pass/fail (fail on critical/high findings)
  const hasCritical = bySeverity.critical > 0;
  const hasHigh = bySeverity.high > 0;
  const passed = !hasCritical && !hasHigh;

  return {
    sessionId,
    platform,
    timestamp: new Date().toISOString(),
    findings: allFindings,
    summary: {
      total: allFindings.length,
      bySeverity,
      byType,
    },
    passed,
  };
}

/**
 * Collect session content for scanning.
 * In real implementation, reads from agent-device session artifacts.
 */
async function collectSessionContent(sessionId: string, platform: string): Promise<string> {
  // Placeholder - would read:
  // - Session logs
  // - Accessibility snapshots
  // - Network request/response bodies
  // - Console logs
  // - Screen recording transcripts

  return `
# Session ${sessionId} Artifacts (${platform})

## Console Logs
[INFO] User logged in: user@example.com
[INFO] API Key: sk_live_abcdefghijklmnopqrstuvwx
[ERROR] Failed to fetch: https://api.example.com/users?api_key=sk_live_1234567890
[WARN] Password reset requested for john.doe@company.com

## Network Traffic
GET https://api.example.com/contacts HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Response: 200 OK

POST https://api.example.com/payment HTTP/1.1
Content-Type: application/json
{"card_number": "4111 1111 1111 1111", "cvv": "123", "exp": "12/25"}

## Accessibility Snapshot
Window: "Payment Screen"
  Text Field: "Card Number" = "4111 1111 1111 1111"
  Text Field: "CVV" = "123"
  Text Field: "Expiry" = "12/25"
  Button: "Pay Now"

## Storage (Android SharedPreferences)
<?xml version="1.0" encoding="utf-8"?>
<map>
  <string name="user_email">user@example.com</string>
  <string name="auth_token">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</string>
  <string name="api_key">sk_live_abcdefghijklmnopqrstuvwx</string>
  <boolean name="remember_me">true</boolean>
</map>
`;
}

async function scanNetworkSecurity(content: string, platform: string): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  // Check for cleartext HTTP
  if (content.includes('http://') && !content.includes('https://')) {
    findings.push({
      id: 'network-cleartext-http',
      type: 'network',
      severity: 'high',
      title: 'Cleartext HTTP Traffic',
      description: 'App communicates over unencrypted HTTP',
      location: 'Network traffic',
      evidence: { protocol: 'http' },
      remediation: 'Enforce HTTPS for all network communication. Use network security config to block cleartext.',
      references: ['OWASP MASVS-NETWORK-1', 'CWE-319'],
    });
  }

  // Check for weak TLS
  if (content.includes('TLSv1.0') || content.includes('TLSv1.1') || content.includes('SSLv')) {
    findings.push({
      id: 'network-weak-tls',
      type: 'network',
      severity: 'high',
      title: 'Weak TLS Version',
      description: 'App supports deprecated TLS versions',
      location: 'Network traffic',
      evidence: { tlsVersion: 'TLSv1.0/1.1' },
      remediation: 'Enforce TLS 1.2 or higher. Disable TLS 1.0 and 1.1.',
      references: ['OWASP MASVS-NETWORK-2', 'CWE-326'],
    });
  }

  return findings;
}

function getCredentialReferences(patternName: string): string[] {
  const refs: Record<string, string[]> = {
    'aws-access-key': ['OWASP MASVS-STORAGE-1', 'CWE-798'],
    'aws-secret-key': ['OWASP MASVS-STORAGE-1', 'CWE-798'],
    'github-token': ['OWASP MASVS-STORAGE-1', 'CWE-798'],
    'generic-api-key': ['OWASP MASVS-STORAGE-1', 'CWE-798'],
    'mongodb-uri': ['OWASP MASVS-STORAGE-1', 'CWE-798'],
    'postgres-uri': ['OWASP MASVS-STORAGE-1', 'CWE-798'],
    'gcp-api-key': ['OWASP MASVS-STORAGE-1', 'CWE-798'],
    'jwt-token': ['OWASP MASVS-AUTH-3', 'CWE-798'],
    'private-key': ['OWASP MASVS-CRYPTO-1', 'CWE-312'],
  };
  return refs[patternName] || ['OWASP MASVS-STORAGE-1', 'CWE-798'];
}

function getPIIReferences(patternName: string): string[] {
  const refs: Record<string, string[]> = {
    'email': ['GDPR Art. 4', 'OWASP MASVS-PRIVACY-1'],
    'ssn-us': ['GDPR Art. 9', 'HIPAA', 'OWASP MASVS-PRIVACY-1'],
    'credit-card': ['PCI DSS', 'OWASP MASVS-PRIVACY-1', 'CWE-359'],
    'medical-record-number': ['HIPAA', 'GDPR Art. 9', 'OWASP MASVS-PRIVACY-1'],
  };
  return refs[patternName] || ['GDPR Art. 4', 'OWASP MASVS-PRIVACY-1'];
}

function getStorageReferences(storageType: string): string[] {
  const refs: Record<string, string[]> = {
    'shared-preferences': ['OWASP MASVS-STORAGE-1', 'CWE-922'],
    'user-defaults': ['OWASP MASVS-STORAGE-1', 'CWE-922'],
    'async-storage': ['OWASP MASVS-STORAGE-1', 'CWE-922'],
    'keychain': ['OWASP MASVS-STORAGE-2', 'CWE-312'],
    'sqlite': ['OWASP MASVS-STORAGE-1', 'CWE-312'],
    'realm': ['OWASP MASVS-STORAGE-1', 'CWE-312'],
  };
  return refs[storageType] || ['OWASP MASVS-STORAGE-1'];
}