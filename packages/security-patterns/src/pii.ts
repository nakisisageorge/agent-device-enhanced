/**
 * PII (Personally Identifiable Information) Scanning
 *
 * Detects PII in text content, logs, snapshots, and network traffic.
 * Covers common PII types: emails, phones, names, addresses, IDs, financial data, health data.
 */

import type { PIIScanOptions, PIIFinding, PIIPattern } from './types.js';

const BUILTIN_PII_PATTERNS: PIIPattern[] = [
  // Contact Information
  {
    name: 'email',
    description: 'Email Address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    severity: 'medium',
  },
  {
    name: 'phone-us',
    description: 'US Phone Number',
    regex: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    severity: 'medium',
  },
  {
    name: 'phone-international',
    description: 'International Phone Number',
    regex: /\b\+?[1-9]\d{1,14}\b/g,
    severity: 'medium',
    validator: (match) => match.length >= 10 && match.length <= 15,
  },

  // Identity Documents
  {
    name: 'ssn-us',
    description: 'US Social Security Number',
    regex: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    severity: 'critical',
    validator: (match) => {
      // Basic SSN validation (not all zeros, not 123-45-6789, etc.)
      const cleaned = match.replace(/[-.\s]/g, '');
      return !/^(\d)\1+$/.test(cleaned) && cleaned !== '123456789';
    },
  },
  {
    name: 'passport-us',
    description: 'US Passport Number',
    regex: /\b[0-9]{9}\b/g,
    severity: 'high',
    validator: (match) => match.length === 9 && /^\d{9}$/.test(match),
  },
  {
    name: 'drivers-license-ca',
    description: 'California Driver\'s License',
    regex: /\b[D]\d{7}\b/g,
    severity: 'high',
  },

  // Financial
  {
    name: 'credit-card',
    description: 'Credit Card Number (Luhn validated)',
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    severity: 'critical',
    validator: (match) => luhnCheck(match.replace(/[ -]/g, '')),
  },
  {
    name: 'iban',
    description: 'IBAN (International Bank Account Number)',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
    severity: 'high',
  },
  {
    name: 'bank-account-us',
    description: 'US Bank Account Number',
    regex: /\b\d{8,17}\b/g,
    severity: 'medium',
    validator: (match) => match.length >= 8 && match.length <= 17,
  },

  // Cryptocurrency
  {
    name: 'bitcoin-address',
    description: 'Bitcoin Address',
    regex: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
    severity: 'low',
  },
  {
    name: 'ethereum-address',
    description: 'Ethereum Address',
    regex: /\b0x[a-fA-F0-9]{40}\b/g,
    severity: 'low',
  },

  // Health
  {
    name: 'medical-record-number',
    description: 'Medical Record Number (generic)',
    regex: /\b(?:MRN|mrn)[\"'\s:=]+\w+/gi,
    severity: 'high',
  },
  {
    name: 'npi',
    description: 'National Provider Identifier (US)',
    regex: /\b\d{10}\b/g,
    severity: 'medium',
    validator: (match) => match.length === 10 && luhnCheck(match),
  },

  // Address
  {
    name: 'street-address',
    description: 'Street Address (generic pattern)',
    regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir)\b/gi,
    severity: 'medium',
  },
  {
    name: 'zip-code-us',
    description: 'US ZIP Code',
    regex: /\b\d{5}(?:-\d{4})?\b/g,
    severity: 'low',
  },

  // Digital Identity
  {
    name: 'ip-address',
    description: 'IPv4 Address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    severity: 'low',
    validator: (match) => match.split('.').every(octet => parseInt(octet) <= 255),
  },
  {
    name: 'ipv6-address',
    description: 'IPv6 Address',
    regex: /\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g,
    severity: 'low',
  },
  {
    name: 'mac-address',
    description: 'MAC Address',
    regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    severity: 'low',
  },
  {
    name: 'uuid',
    description: 'UUID',
    regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    severity: 'low',
  },

  // Authentication related
  {
    name: 'password-in-url',
    description: 'Password in URL',
    regex: /[?&](?:password|passwd|pwd)=[^&\s]+/gi,
    severity: 'high',
  },
  {
    name: 'api-key-in-url',
    description: 'API Key in URL Parameter',
    regex: /[?&](?:api[_-]?key|apikey|key|token)=[^&\s]{20,}/gi,
    severity: 'high',
  },
];

/**
 * Scan content for PII.
 */
export async function scanForPII(
  options: PIIScanOptions
): Promise<PIIFinding[]> {
  const {
    content,
    source,
    platform,
    customPatterns = [],
    minSeverity = 'low',
    redactOutput = true,
  } = options;

  const allPatterns = [...BUILTIN_PII_PATTERNS, ...customPatterns];
  const findings: PIIFinding[] = [];

  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const minSeverityLevel = severityOrder[minSeverity];

  for (const pattern of allPatterns) {
    if (severityOrder[pattern.severity] < minSeverityLevel) continue;

    let match;
    pattern.regex.lastIndex = 0;

    while ((match = pattern.regex.exec(content)) !== null) {
      const matchedText = match[0];
      const matchIndex = match.index;

      if (pattern.validator && !pattern.validator(matchedText, content)) {
        continue;
      }

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

      const redacted = redactOutput ? redactPII(matchedText, pattern.name) : matchedText;

      findings.push({
        id: `pii-${source}-${pattern.name}-${findings.length}`,
        patternName: pattern.name,
        patternDescription: pattern.description,
        severity: pattern.severity,
        matchedText: redacted,
        fullMatch: matchedText,
        location: { source, line, column },
        platform,
        remediation: getPIIRemediation(pattern.name),
      });

      if (match[0].length === 0) {
        pattern.regex.lastIndex++;
      }
    }
  }

  return findings;
}

/**
 * Redact PII for safe display.
 */
function redactPII(text: string, patternName: string): string {
  switch (patternName) {
    case 'email': {
      const [local, domain] = text.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    case 'phone-us':
    case 'phone-international':
      return text.replace(/\d/g, '*').slice(0, -2) + text.slice(-2);
    case 'ssn-us':
      return '***-**-' + text.slice(-4);
    case 'credit-card':
      return '**** **** **** ' + text.slice(-4).replace(/\D/g, '');
    case 'iban':
      return text.slice(0, 4) + '****' + text.slice(-4);
    case 'bitcoin-address':
    case 'ethereum-address':
      return text.slice(0, 6) + '...' + text.slice(-4);
    case 'ip-address':
    case 'ipv6-address':
      const parts = text.split(text.includes(':') ? ':' : '.');
      return parts.slice(0, -1).join('.') + '.xxx';
    case 'mac-address':
      return 'xx:xx:xx:xx:xx:' + text.slice(-2);
    case 'uuid':
      return 'xxxxxxxx-xxxx-xxxx-xxxx-' + text.slice(-12);
    default:
      if (text.length <= 4) return '*'.repeat(text.length);
      return text.slice(0, 2) + '*'.repeat(text.length - 4) + text.slice(-2);
  }
}

/**
 * Get remediation advice for PII type.
 */
function getPIIRemediation(patternName: string): string {
  const remediations: Record<string, string> = {
    'email': 'Avoid logging email addresses. Use user IDs or hashed identifiers instead.',
    'phone-us': 'Mask phone numbers in logs. Use user IDs for identification.',
    'phone-international': 'Mask phone numbers in logs. Use user IDs for identification.',
    'ssn-us': 'CRITICAL: Never log SSNs. Remove immediately. Implement data masking in logging pipeline.',
    'passport-us': 'Never log passport numbers. Use document type + last 4 digits only if needed.',
    'drivers-license-ca': 'Avoid logging driver\'s license numbers. Use internal user identifiers.',
    'credit-card': 'CRITICAL: Never log full credit card numbers. PCI DSS requires masking. Use tokenization.',
    'iban': 'Mask IBAN in logs. Use last 4 digits only for reference.',
    'bank-account-us': 'Mask bank account numbers. Use last 4 digits for reference.',
    'bitcoin-address': 'Blockchain addresses are public but should not be linked to user identity in logs.',
    'ethereum-address': 'Blockchain addresses are public but should not be linked to user identity in logs.',
    'medical-record-number': 'CRITICAL: HIPAA violation risk. Never log MRNs. Use internal patient IDs.',
    'npi': 'NPIs are public but should not be linked to patient data in logs.',
    'street-address': 'Avoid logging full addresses. Use zip code or city level only.',
    'zip-code-us': 'ZIP codes are low risk but can be combined with other data. Consider masking.',
    'ip-address': 'IP addresses are PII under GDPR. Anonymize last octet in logs.',
    'ipv6-address': 'IP addresses are PII under GDPR. Anonymize in logs.',
    'mac-address': 'MAC addresses can track devices. Avoid logging or hash them.',
    'uuid': 'UUIDs are generally safe but can be correlation IDs. Consider if they link to user.',
    'password-in-url': 'CRITICAL: Never put passwords in URLs. Use POST body or headers.',
    'api-key-in-url': 'Never put API keys in URLs. Use headers. Rotate exposed keys.',
  };

  return remediations[patternName] || 'Review if this PII needs to be logged. Implement data minimization and masking.';
}

/**
 * Luhn algorithm check for credit card validation.
 */
function luhnCheck(number: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}