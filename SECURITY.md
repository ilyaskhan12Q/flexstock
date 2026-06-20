# Security Policy

## Supported Versions

| Version | Supported          |
|---|---|
| 1.x.x   | Yes - Active support |
| < 1.0   | No - Not supported    |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities by emailing: **security@flexstock.example.com**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact / severity assessment
- Affected version(s)
- Any suggested fix (optional but appreciated)

### Response Timeline

- **48 hours** — Acknowledgment of receipt
- **7 days** — Initial assessment and severity classification
- **30 days** — Target fix or mitigation published

We take all security reports seriously and will credit researchers who responsibly disclose valid vulnerabilities.

## Security Best Practices for Deployment

- Change all default seed passwords immediately after first deployment
- Use a strong, random `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (32+ characters)
- Never commit `.env` files to version control
- Keep Node.js and all dependencies up to date
- Run behind a reverse proxy (nginx/caddy) with HTTPS
- Set `NODE_ENV=production` in production
