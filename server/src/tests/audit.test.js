import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

describe('audit logging', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flexstock-audit-'));
    process.env.AUDIT_LOG_DIR = tempDir;
    delete require.cache[require.resolve('../lib/audit')];
  });

  afterEach(() => {
    delete process.env.AUDIT_LOG_DIR;
    delete require.cache[require.resolve('../lib/audit')];
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes immutable audit lines with sensitive fields redacted', () => {
    const { recordAuditEvent, AUDIT_LOG_PATH } = require('../lib/audit');

    const event = recordAuditEvent({
      req: {
        method: 'PATCH',
        originalUrl: '/api/v1/settings',
        headers: {
          'user-agent': 'vitest',
          'x-request-id': 'req-123'
        },
        ip: '127.0.0.1'
      },
      actor: { id: 'user-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
      action: 'update_settings',
      resourceType: 'settings',
      resourceId: 'global',
      before: { smtp: { password: 'super-secret' }, businessName: 'Old Store' },
      after: { smtp: { password: 'new-secret' }, businessName: 'New Store' },
      reason: 'Updated business profile',
      metadata: { password: 'hidden' }
    });

    expect(event.id).toBeTruthy();
    expect(fs.existsSync(AUDIT_LOG_PATH)).toBe(true);

    const [line] = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').trim().split('\n');
    const parsed = JSON.parse(line);

    expect(parsed.action).toBe('update_settings');
    expect(parsed.actor.email).toBe('admin@example.com');
    expect(parsed.before.smtp.password).toBe('[REDACTED]');
    expect(parsed.after.smtp.password).toBe('[REDACTED]');
    expect(parsed.metadata.password).toBe('[REDACTED]');
    expect(parsed.request.requestId).toBe('req-123');
  });

  it('writes alert records for suspicious security incidents', () => {
    const { recordSecurityIncident, ALERT_LOG_PATH } = require('../lib/audit');

    recordSecurityIncident({
      req: {
        method: 'POST',
        originalUrl: '/api/v1/auth/login',
        headers: {
          'user-agent': 'vitest'
        },
        ip: '10.0.0.8'
      },
      category: 'authentication',
      action: 'login_failed',
      reason: 'Invalid credentials',
      metadata: { email: 'intruder@example.com' }
    });

    expect(fs.existsSync(ALERT_LOG_PATH)).toBe(true);

    const [line] = fs.readFileSync(ALERT_LOG_PATH, 'utf8').trim().split('\n');
    const parsed = JSON.parse(line);

    expect(parsed.alertType).toBe('security_audit_signal');
    expect(parsed.action).toBe('login_failed');
    expect(parsed.reason).toBe('Invalid credentials');
    expect(parsed.request.ip).toBe('10.0.0.8');
  });
});
