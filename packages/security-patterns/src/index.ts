/**
 * Security Automation Patterns for agent-device
 *
 * Provides mobile app security scanning capabilities:
 * - Credential/API key leakage detection
 * - PII (Personally Identifiable Information) scanning
 * - Certificate pinning verification
 * - Insecure storage detection
 * - Security misconfiguration checks
 */

export {
  scanForCredentials,
  type CredentialScanOptions,
  type CredentialFinding,
} from './credentials.js';

export {
  scanForPII,
  type PIIScanOptions,
  type PIIFinding,
} from './pii.js';

export {
  scanInsecureStorage,
  type StorageScanOptions,
  type StorageFinding,
} from './storage.js';

export {
  verifyCertificatePinning,
  type PinningVerificationOptions,
  type PinningResult,
} from './network.js';

export {
  runSecurityScan,
  type SecurityScanOptions,
  type SecurityScanResult,
} from './scanner.js';