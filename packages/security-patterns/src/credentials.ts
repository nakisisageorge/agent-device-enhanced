/**
 * Credential/API Key Leakage Detection
 *
 * Scans text content (logs, snapshots, network responses, etc.)
 * for accidentally exposed credentials, API keys, tokens, and secrets.
 */

import type { CredentialScanOptions, CredentialFinding, CredentialPattern } from './types.js';

// Built-in patterns for common credential types
const BUILTIN_PATTERNS: CredentialPattern[] = [
  // AWS
  {
    name: 'aws-access-key',
    description: 'AWS Access Key ID',
    regex: /(?:A3T|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    severity: 'critical',
  },
  {
    name: 'aws-secret-key',
    description: 'AWS Secret Access Key',
    regex: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
    severity: 'critical',
  },
  {
    name: 'aws-session-token',
    description: 'AWS Session Token',
    regex: /(?<=aws_session_token[\"'\s:=]+)[A-Za-z0-9/+=]{100,}/gi,
    severity: 'critical',
  },

  // GitHub
  {
    name: 'github-token',
    description: 'GitHub Personal Access Token (classic)',
    regex: /ghp_[A-Za-z0-9]{36}/g,
    severity: 'critical',
  },
  {
    name: 'github-fine-grained',
    description: 'GitHub Fine-grained PAT',
    regex: /github_pat_[A-Za-z0-9_]{82}/g,
    severity: 'critical',
  },
  {
    name: 'github-oauth',
    description: 'GitHub OAuth Token',
    regex: /gho_[A-Za-z0-9]{36}/g,
    severity: 'critical',
  },
  {
    name: 'github-app',
    description: 'GitHub App Token',
    regex: /ghs_[A-Za-z0-9]{36}/g,
    severity: 'critical',
  },
  {
    name: 'github-refresh',
    description: 'GitHub Refresh Token',
    regex: /ghr_[A-Za-z0-9]{36}/g,
    severity: 'critical',
  },

  // Generic API Keys
  {
    name: 'generic-api-key',
    description: 'Generic API Key (key=value pattern)',
    regex: /(?:api[_-]?key|apikey|api_key)[\"'\s:=]+[A-Za-z0-9_\-]{20,}/gi,
    severity: 'high',
  },
  {
    name: 'generic-secret',
    description: 'Generic Secret (secret=value pattern)',
    regex: /(?:secret|secret_key|secretkey)[\"'\s:=]+[A-Za-z0-9_\-]{20,}/gi,
    severity: 'high',
  },

  // Database
  {
    name: 'mongodb-uri',
    description: 'MongoDB Connection String',
    regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\/]+\/[^?\s]+/gi,
    severity: 'critical',
  },
  {
    name: 'postgres-uri',
    description: 'PostgreSQL Connection String',
    regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\/]+\/[^?\s]+/gi,
    severity: 'critical',
  },
  {
    name: 'mysql-uri',
    description: 'MySQL Connection String',
    regex: /mysql:\/\/[^:]+:[^@]+@[^\/]+\/[^?\s]+/gi,
    severity: 'critical',
  },
  {
    name: 'redis-uri',
    description: 'Redis Connection String',
    regex: /redis:\/\/[^:]+:[^@]+@[^\/]+\/[^?\s]+/gi,
    severity: 'critical',
  },

  // Cloud Providers
  {
    name: 'gcp-api-key',
    description: 'Google Cloud API Key',
    regex: /AIza[A-Za-z0-9_\-]{35}/g,
    severity: 'critical',
  },
  {
    name: 'gcp-service-account',
    description: 'GCP Service Account Key (JSON)',
    regex: /\"type\":\s*\"service_account\"/g,
    severity: 'critical',
  },
  {
    name: 'azure-connection-string',
    description: 'Azure Connection String',
    regex: /(?:AccountKey|SharedAccessKey)=[A-Za-z0-9/+=]{40,}/gi,
    severity: 'critical',
  },
  {
    name: 'azure-client-secret',
    description: 'Azure Client Secret',
    regex: /(?:client[_-]?secret)[\"'\s:=]+[A-Za-z0-9_\-]{20,}/gi,
    severity: 'critical',
  },

  // JWT
  {
    name: 'jwt-token',
    description: 'JWT Token',
    regex: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    severity: 'high',
    validator: (match) => {
      // Validate it looks like a real JWT (3 parts, base64url encoded)
      const parts = match.split('.');
      return parts.length === 3 && parts.every(p => p.length > 0);
    },
  },

  // Slack
  {
    name: 'slack-token',
    description: 'Slack Bot/User/OAuth Token',
    regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g,
    severity: 'critical',
  },

  // Stripe
  {
    name: 'stripe-secret',
    description: 'Stripe Secret Key',
    regex: /sk_live_[A-Za-z0-9]{24,}/g,
    severity: 'critical',
  },
  {
    name: 'stripe-publishable',
    description: 'Stripe Publishable Key',
    regex: /pk_live_[A-Za-z0-9]{24,}/g,
    severity: 'medium',
  },

  // Twilio
  {
    name: 'twilio-sid',
    description: 'Twilio Account SID',
    regex: /AC[A-Za-z0-9]{32}/g,
    severity: 'medium',
  },
  {
    name: 'twilio-token',
    description: 'Twilio Auth Token',
    regex: /(?<=twilio[_-]?auth[_-]?token[\"'\s:=]+)[A-Za-z0-9]{32}/gi,
    severity: 'critical',
  },

  // SendGrid
  {
    name: 'sendgrid-api-key',
    description: 'SendGrid API Key',
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: 'critical',
  },

  // Generic patterns
  {
    name: 'private-key',
    description: 'Private Key (PEM format)',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
  },
  {
    name: 'ssh-private-key',
    description: 'SSH Private Key',
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
    severity: 'critical',
  },
  {
    name: 'basic-auth',
    description: 'Basic Auth Credentials in URL',
    regex: /https?:\/\/[^:]+:[^@]+@[^\/\s]+/g,
    severity: 'high',
  },
  {
    name: 'bearer-token',
    description: 'Bearer Token in Header',
    regex: /(?:Authorization|authorization)[\"'\s:=]+Bearer\s+[A-Za-z0-9_\-]{20,}/gi,
    severity: 'high',
  },
];

/**
 * Scan content for credential leakage.
 */
export async function scanForCredentials(
  options: CredentialScanOptions
): Promise<CredentialFinding[]> {
  const {
    content,
    source,
    platform,
    customPatterns = [],
    minSeverity = 'low',
  } = options;

  const allPatterns = [...BUILTIN_PATTERNS, ...customPatterns];
  const findings: CredentialFinding[] = [];
  const lines = content.split('\n');

  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const minSeverityLevel = severityOrder[minSeverity];

  for (const pattern of allPatterns) {
    if (severityOrder[pattern.severity] < minSeverityLevel) continue;

    let match;
    pattern.regex.lastIndex = 0; // Reset regex state

    while ((match = pattern.regex.exec(content)) !== null) {
      const matchedText = match[0];
      const matchIndex = match.index;

      // Run validator if provided
      if (pattern.validator && !pattern.validator(matchedText, content)) {
        continue;
      }

      // Calculate line and column
      let line = 1;
      let column = 1;
      for (let i = 0; i < matchIndex; i++) {
        if (content[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
      }

      // Redact the matched text for safe logging
      const redacted = redactCredential(matchedText, pattern.name);

      findings.push({
        id: `cred-${source}-${pattern.name}-${findings.length}`,
        patternName: pattern.name,
        patternDescription: pattern.description,
        severity: pattern.severity,
        matchedText: redacted,
        fullMatch: matchedText,
        location: { source, line, column },
        platform,
        remediation: getRemediation(pattern.name),
      });

      // Prevent infinite loop on zero-width matches
      if (match[0].length === 0) {
        pattern.regex.lastIndex++;
      }
    }
  }

  return findings;
}

/**
 * Redact credential for safe display/logging.
 */
function redactCredential(text: string, patternName: string): string {
  // Show only first 4 and last 4 characters
  if (text.length <= 8) {
    return '*'.repeat(text.length);
  }
  return text.slice(0, 4) + '*'.repeat(text.length - 8) + text.slice(-4);
}

/**
 * Get remediation advice for a credential type.
 */
function getRemediation(patternName: string): string {
  const remediations: Record<string, string> = {
    'aws-access-key': 'Rotate the AWS access key immediately. Delete the compromised key and create a new one. Review CloudTrail for unauthorized usage.',
    'aws-secret-key': 'Rotate the AWS secret key immediately. Delete the compromised key and create a new one. Review CloudTrail for unauthorized usage.',
    'aws-session-token': 'Session tokens are temporary but should still be revoked. Check for any active sessions using this token.',
    'github-token': 'Revoke the token immediately at https://github.com/settings/tokens. Generate a new token with minimal required scopes.',
    'github-fine-grained': 'Revoke the fine-grained PAT immediately. Create a new one with minimal required permissions.',
    'github-oauth': 'Revoke the OAuth token. Review authorized OAuth applications.',
    'github-app': 'Revoke the GitHub App installation token. Check app permissions.',
    'github-refresh': 'Revoke the refresh token. Re-authorize the OAuth application.',
    'generic-api-key': 'Rotate the API key immediately. Use environment variables or secret managers for storage.',
    'generic-secret': 'Rotate the secret immediately. Store secrets in secure vaults, not code or logs.',
    'mongodb-uri': 'Rotate the database credentials. Update connection strings to use new credentials. Enable IP whitelisting.',
    'postgres-uri': 'Rotate the database credentials. Update connection strings. Use connection pooling with secure credentials.',
    'mysql-uri': 'Rotate the database credentials. Update connection strings. Use SSL connections.',
    'redis-uri': 'Rotate the Redis password. Update connection strings. Enable TLS.',
    'gcp-api-key': 'Revoke the API key in Google Cloud Console. Create a new key with restricted API access.',
    'gcp-service-account': 'Rotate the service account key. Delete the compromised key file. Use Workload Identity where possible.',
    'azure-connection-string': 'Regenerate the storage account keys. Update all applications using the connection string.',
    'azure-client-secret': 'Create a new client secret in Azure AD. Update applications. Delete the old secret.',
    'jwt-token': 'Revoke the JWT signing key if possible. Implement short expiration times. Use refresh token rotation.',
    'slack-token': 'Revoke the token at https://api.slack.com/apps. Generate a new token with minimal scopes.',
    'stripe-secret': 'Roll the API key in Stripe Dashboard immediately. Update all integrations.',
    'stripe-publishable': 'Roll the publishable key. Less critical but should be rotated.',
    'twilio-sid': 'Account SID is public but paired with auth token. Rotate the auth token.',
    'twilio-token': 'Rotate the auth token in Twilio Console. Update all applications.',
    'sendgrid-api-key': 'Revoke the API key in SendGrid. Create a new key with minimal permissions.',
    'private-key': 'Revoke the certificate/key pair immediately. Generate a new key pair. Re-issue certificates.',
    'ssh-private-key': 'Remove the compromised key from all authorized_keys. Generate a new SSH key pair.',
    'basic-auth': 'Change the password immediately. Use token-based authentication instead of basic auth.',
    'bearer-token': 'Invalidate the token. Implement token refresh with short-lived access tokens.',
  };

  return remediations[patternName] || 'Rotate/revoke the credential immediately. Store secrets securely using environment variables or secret managers.';
}