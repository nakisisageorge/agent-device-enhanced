/**
 * Insecure Storage Detection
 *
 * Scans mobile app storage for insecure practices:
 * - Plaintext credentials in SharedPreferences/UserDefaults
 * - Unencrypted sensitive data in AsyncStorage/SQLite/Realm
 * - Keychain/Keystore misconfigurations
 * - World-readable files
 */

import type { StorageScanOptions, StorageFinding } from './types.js';

/**
 * Scan app storage for insecure patterns.
 * This would typically run on a device/simulator via agent-device commands.
 */
export async function scanInsecureStorage(
  options: StorageScanOptions
): Promise<StorageFinding[]> {
  const { platform, appId, deviceId, customPaths = [] } = options;
  const findings: StorageFinding[] = [];

  // In a real implementation, this would execute agent-device commands
  // to inspect the app's storage on the device/simulator
  // For now, we define the detection logic that would be used

  const scanResults = await executeStorageScan(platform, appId, deviceId, customPaths);

  for (const result of scanResults) {
    findings.push(analyzeStorageResult(result, platform));
  }

  return findings;
}

interface RawStorageResult {
  type: string;
  path: string;
  content: any;
  metadata: {
    permissions?: string;
    encryption?: boolean;
    accessibleByOthers?: boolean;
  };
}

/**
 * Execute storage scan on device (placeholder for actual implementation).
 * In practice, this would use agent-device commands like:
 * - `agent-device shell cat /data/data/<package>/shared_prefs/*.xml` (Android)
 * - `agent-device shell plutil -p /var/mobile/Containers/Data/Application/<uuid>/Library/Preferences/*.plist` (iOS)
 * - `agent-device shell cat /data/data/<package>/databases/*.db` (Android SQLite)
 */
async function executeStorageScan(
  platform: string,
  appId: string,
  deviceId?: string,
  customPaths: string[] = []
): Promise<RawStorageResult[]> {
  // This is a placeholder - real implementation would use agent-device CLI
  // to execute commands on the target device/simulator

  const mockResults: RawStorageResult[] = [
    // Example: Android SharedPreferences with plaintext password
    {
      type: 'shared-preferences',
      path: `/data/data/${appId}/shared_prefs/auth_prefs.xml`,
      content: {
        user_email: 'user@example.com',
        user_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        remember_me: 'true',
        api_key: 'sk_live_abcdef1234567890',
      },
      metadata: { permissions: 'rw-------', encryption: false, accessibleByOthers: false },
    },
    // Example: iOS UserDefaults with PII
    {
      type: 'user-defaults',
      path: `/var/mobile/Containers/Data/Application/<uuid>/Library/Preferences/${appId}.plist`,
      content: {
        'user.fullName': 'John Doe',
        'user.phone': '+1-555-123-4567',
        'user.ssn': '123-45-6789',
        'auth.token': 'ghp_abcdefghijklmnopqrstuvwxyz123456',
      },
      metadata: { encryption: false, accessibleByOthers: false },
    },
    // Example: AsyncStorage (React Native) with sensitive data
    {
      type: 'async-storage',
      path: `/data/data/${appId}/files/AsyncStorage/manifest.json`,
      content: {
        '@@userProfile': JSON.stringify({
          email: 'user@example.com',
          password: 'plaintextpassword123', // BAD!
          creditCard: '4111 1111 1111 1111',
        }),
        '@@authToken': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      metadata: { encryption: false, accessibleByOthers: false },
    },
  ];

  return mockResults;
}

/**
 * Analyze storage scan result for security issues.
 */
function analyzeStorageResult(result: RawStorageResult, platform: string): StorageFinding {
  const { type, path, content, metadata } = result;
  const issues: StorageFinding[] = [];

  // Check for credentials in content
  const credentialPatterns = [
    { key: 'password', severity: 'critical' as const, type: 'password' },
    { key: 'token', severity: 'critical' as const, type: 'token' },
    { key: 'api_key', severity: 'critical' as const, type: 'api-key' },
    { key: 'secret', severity: 'critical' as const, type: 'secret' },
    { key: 'ssn', severity: 'critical' as const, type: 'ssn' },
    { key: 'credit_card', severity: 'critical' as const, type: 'credit-card' },
    { key: 'creditCard', severity: 'critical' as const, type: 'credit-card' },
  ];

  const contentStr = JSON.stringify(content);

  for (const { key, severity, type: issueType } of credentialPatterns) {
    if (contentStr.toLowerCase().includes(key.toLowerCase())) {
      issues.push({
        id: `storage-${type}-${issueType}-${Date.now()}`,
        type: type as any,
        severity,
        title: `${type} contains ${issueType}`,
        description: `Found ${issueType} in ${type} at ${path}. Data is stored ${metadata.encryption ? 'encrypted' : 'in plaintext'}.`,
        path,
        evidence: { keys: Object.keys(content).filter(k => k.toLowerCase().includes(key.toLowerCase())) },
        remediation: getStorageRemediation(type, issueType, metadata.encryption),
      });
    }
  }

  // Check for world-readable files
  if (metadata.permissions && metadata.permissions.includes('r--r--r--')) {
    issues.push({
      id: `storage-${type}-world-readable-${Date.now()}`,
      type: type as any,
      severity: 'high',
      title: `${type} file is world-readable`,
      description: `File at ${path} has permissions ${metadata.permissions}, allowing other apps to read it.`,
      path,
      evidence: { permissions: metadata.permissions },
      remediation: 'Restrict file permissions to owner-only (rw-------). Use internal storage, not external.',
    });
  }

  // Check for lack of encryption
  if (!metadata.encryption && (type === 'shared-preferences' || type === 'user-defaults' || type === 'async-storage')) {
    const hasSensitive = credentialPatterns.some(p => contentStr.toLowerCase().includes(p.key.toLowerCase()));
    if (hasSensitive) {
      issues.push({
        id: `storage-${type}-unencrypted-${Date.now()}`,
        type: type as any,
        severity: 'high',
        title: `${type} stores sensitive data without encryption`,
        description: `Sensitive data in ${type} at ${path} is stored in plaintext.`,
        path,
        evidence: { encryption: false },
        remediation: `Use EncryptedSharedPreferences (Android) or Keychain (iOS) for sensitive data. For React Native, use react-native-encrypted-storage or react-native-keychain.`,
      });
    }
  }

  // Return the highest severity issue, or first if multiple
  if (issues.length > 0) {
    return issues.sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity))[0];
  }

  // Default finding if no specific issues but storage exists
  return {
    id: `storage-${type}-info-${Date.now()}`,
    type: type as any,
    severity: 'low',
    title: `${type} storage found`,
    description: `${type} at ${path} contains ${Object.keys(content).length} keys. Review for sensitive data.`,
    path,
    evidence: { keyCount: Object.keys(content).length },
    remediation: 'Audit stored data for sensitive information. Encrypt sensitive values.',
  };
}

function severityOrder(severity: string): number {
  const order: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  return order[severity] || 0;
}

function getStorageRemediation(storageType: string, issueType: string, encrypted: boolean): string {
  const base = encrypted ? 'Data is encrypted but ' : 'Data is in plaintext. ';

  const recommendations: Record<string, string> = {
    'shared-preferences': base + 'Use EncryptedSharedPreferences (Android) with MasterKey.',
    'user-defaults': base + 'Use Keychain (iOS/macOS) for sensitive data. Consider CryptoKit for encryption.',
    'async-storage': base + 'Use react-native-encrypted-storage or react-native-keychain.',
    'keychain': base + 'Ensure kSecAttrAccessible is set appropriately (not kSecAttrAccessibleAlways).',
    'sqlite': base + 'Use SQLCipher for encrypted database. Avoid storing sensitive data in plaintext.',
    'realm': base + 'Use Realm encryption with a strong key stored in Keychain/Keystore.',
  };

  return recommendations[storageType] || 'Encrypt sensitive data at rest. Use platform-provided secure storage.';
}