# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ✅ Yes             |

## Reporting a Vulnerability

If you discover a security vulnerability in **agent-device-enhanced**, please report it responsibly:

1. **Email**: security@gictafrica.com (GPG key available on request)
2. **GitHub Security Advisories**: Use the "Report a vulnerability" tab on GitHub
3. **Do not** create public issues for security vulnerabilities

We will acknowledge receipt within 48 hours and provide a timeline for fix.

## Security Features

This enhanced fork includes built-in security scanning capabilities:

### Credential Detection
Scans for 40+ credential patterns including:
- AWS keys (Access Key ID, Secret Access Key, Session Tokens)
- GitHub tokens (PAT, Fine-grained, OAuth, App, Refresh)
- Cloud provider keys (GCP, Azure, DigitalOcean)
- Database connection strings (MongoDB, PostgreSQL, MySQL, Redis)
- API keys (Stripe, Twilio, SendGrid, Slack, generic)
- Private keys (SSH, PEM, PKCS#8)
- JWT tokens

### PII Detection
Identifies personally identifiable information:
- Contact info (emails, phone numbers)
- Identity documents (SSN, passport, driver's license)
- Financial data (credit cards, IBAN, bank accounts, crypto addresses)
- Health data (MRN, NPI)
- Location data (addresses, ZIP codes)
- Digital identifiers (IPs, MAC addresses, UUIDs)

### Insecure Storage Audit
Checks mobile app storage for:
- Plaintext credentials in SharedPreferences (Android)
- Unencrypted sensitive data in Keychain/UserDefaults (iOS)
- React Native AsyncStorage vulnerabilities
- SQLite/Realm database encryption status
- World-readable file permissions

### Certificate Pinning Verification
- Extracts pinning configuration from app
- Validates pinning enforcement via MITM testing
- Generates platform-specific pinning config templates

### Network Security Scanning
- Cleartext HTTP traffic detection
- Weak TLS version identification (TLS 1.0/1.1, SSL)
- Missing HSTS/HPKP headers

## Security Best Practices for Users

1. **Never commit secrets** — Use environment variables or secret managers
2. **Rotate exposed credentials immediately** — Our scanner provides remediation steps
3. **Enable certificate pinning** — Use generated configs for your platform
4. **Encrypt sensitive storage** — Use EncryptedSharedPreferences, Keychain, react-native-encrypted-storage
5. **Run security scans in CI** — Add `agent-device security-scan` to your pipeline

## Dependency Security

- We run `pnpm audit` on every release
- Dependencies are pinned in `pnpm-lock.yaml`
- SBOM generated on release via `pnpm sbom`
- Mutations testing ensures critical paths are tested (Stryker)

## Compliance References

Our security patterns align with:
- **OWASP MASVS** (Mobile Application Security Verification Standard)
- **CWE Top 25** (Common Weakness Enumeration)
- **PCI DSS** (Payment Card Industry Data Security Standard)
- **GDPR** Articles 4 & 9 (Personal Data & Special Categories)
- **HIPAA** (Health Insurance Portability and Accountability Act)

## Acknowledgments

Security patterns inspired by:
- [OWASP Mobile Security Testing Guide](https://github.com/OWASP/owasp-mstg)
- [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) for credential patterns
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)