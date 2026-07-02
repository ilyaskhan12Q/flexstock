const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIT_ROOT = process.env.AUDIT_LOG_DIR
  ? path.resolve(process.env.AUDIT_LOG_DIR)
  : path.join(__dirname, '../../audit-logs');

const AUDIT_LOG_PATH = path.join(AUDIT_ROOT, 'audit.jsonl');
const ALERT_LOG_PATH = path.join(AUDIT_ROOT, 'security-alerts.jsonl');

const REDACT_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'passwordConfirmation',
  'refreshToken',
  'accessToken',
  'token',
  'jwt',
  'secret',
  'smtp.password',
  'smtpPassword'
]);

const SENSITIVE_ACTIONS = new Set([
  'login_failed',
  'login_success',
  'permission_denied',
  'create_user',
  'update_user',
  'deactivate_user',
  'create_category',
  'update_category',
  'delete_category',
  'create_product',
  'update_product',
  'delete_product',
  'bulk_import_products',
  'record_stock_movement',
  'create_sale',
  'update_settings',
  'add_location',
  'remove_location',
  'export_backup'
]);

function ensureAuditDir() {
  fs.mkdirSync(AUDIT_ROOT, { recursive: true });
}

function appendJsonl(filePath, payload) {
  ensureAuditDir();
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function redact(value, parentKey = '') {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, parentKey));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    const compoundKey = parentKey ? `${parentKey}.${key}` : key;
    if (REDACT_KEYS.has(key) || REDACT_KEYS.has(compoundKey)) {
      output[key] = '[REDACTED]';
      continue;
    }

    output[key] = redact(child, compoundKey);
  }

  return output;
}

function getRequestMeta(req = {}) {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : (forwardedFor || req.ip || req.socket?.remoteAddress || null);

  return {
    requestId: req.requestId || req.headers?.['x-request-id'] || crypto.randomUUID(),
    method: req.method || null,
    path: req.originalUrl || req.url || null,
    ip,
    userAgent: req.headers?.['user-agent'] || null,
    referrer: req.headers?.referer || req.headers?.referrer || null
  };
}

function inferSeverity(action, outcome = 'success') {
  if (outcome !== 'success') {
    return 'medium';
  }

  if (['delete_user', 'remove_location', 'export_backup'].includes(action)) {
    return 'high';
  }

  if (SENSITIVE_ACTIONS.has(action)) {
    return 'medium';
  }

  return 'low';
}

function shouldRaiseAlert(action, outcome, explicitSuspicious = false) {
  return explicitSuspicious || outcome !== 'success' || SENSITIVE_ACTIONS.has(action);
}

function recordAuditEvent({
  req,
  actor = null,
  action,
  resourceType,
  resourceId = null,
  before = null,
  after = null,
  reason = null,
  outcome = 'success',
  statusCode = outcome === 'success' ? 200 : 400,
  tags = [],
  suspicious = false,
  metadata = {}
}) {
  const timestamp = new Date().toISOString();
  const meta = getRequestMeta(req);
  const event = {
    id: crypto.randomUUID(),
    timestamp,
    eventType: 'audit',
    action,
    resourceType,
    resourceId,
    outcome,
    statusCode,
    severity: inferSeverity(action, outcome),
    actor: actor
      ? {
          id: actor.id || null,
          name: actor.name || null,
          email: actor.email || null,
          role: actor.role || null
        }
      : null,
    reason: reason || null,
    request: meta,
    tags,
    suspicious: shouldRaiseAlert(action, outcome, suspicious),
    before: before ? redact(before) : null,
    after: after ? redact(after) : null,
    metadata: redact(metadata)
  };

  try {
    appendJsonl(AUDIT_LOG_PATH, event);
    if (event.suspicious) {
      appendJsonl(ALERT_LOG_PATH, {
        id: crypto.randomUUID(),
        timestamp,
        alertType: 'security_audit_signal',
        action,
        resourceType,
        resourceId,
        severity: event.severity,
        actor: event.actor,
        request: meta,
        reason: event.reason,
        outcome,
        tags,
        metadata: event.metadata
      });
    }
  } catch (error) {
    // Never let audit logging break the business flow.
    console.error(`[AUDIT] Failed to persist audit event: ${error.message}`);
  }

  return event;
}

function recordSecurityIncident({
  req,
  actor = null,
  category,
  action,
  resourceType = 'security',
  resourceId = null,
  reason,
  outcome = 'failure',
  statusCode = 403,
  metadata = {}
}) {
  return recordAuditEvent({
    req,
    actor,
    action,
    resourceType,
    resourceId,
    reason,
    outcome,
    statusCode,
    tags: [category],
    suspicious: true,
    metadata
  });
}

module.exports = {
  AUDIT_LOG_PATH,
  ALERT_LOG_PATH,
  recordAuditEvent,
  recordSecurityIncident,
  redact
};
