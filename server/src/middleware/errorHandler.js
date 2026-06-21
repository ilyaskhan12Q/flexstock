/**
 * AppError — structured, intentional errors thrown by controllers/services.
 *
 * Usage:
 *   throw new AppError('Product not found', 404, 'NOT_FOUND');
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details; // optional field-level validation errors, etc.
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Prisma error code → HTTP mapping ──────────────────────────────────────────
// Covers the most common Prisma Client Known Request Errors
const PRISMA_ERROR_MAP = {
  P2000: { status: 400, message: 'The provided value is too long for this field.' },
  P2001: { status: 404, message: 'The requested record was not found.' },
  P2002: { status: 409, message: 'A record with this value already exists (duplicate entry).' },
  P2003: { status: 400, message: 'A related record was not found. Check your references.' },
  P2004: { status: 400, message: 'A database constraint was violated.' },
  P2005: { status: 400, message: 'The value provided is not valid for this field.' },
  P2006: { status: 400, message: 'The value provided is not valid for the field type.' },
  P2011: { status: 400, message: 'A required field is missing — it cannot be null.' },
  P2012: { status: 400, message: 'A required field value is missing.' },
  P2013: { status: 400, message: 'A required argument value is missing.' },
  P2014: { status: 400, message: 'The change would violate a required relation between records.' },
  P2015: { status: 404, message: 'A related record was not found.' },
  P2016: { status: 400, message: 'Query interpretation error.' },
  P2017: { status: 400, message: 'The records for this relation are not connected.' },
  P2018: { status: 404, message: 'The required connected records were not found.' },
  P2019: { status: 400, message: 'Input error in the request.' },
  P2020: { status: 400, message: 'The value is out of the allowed range for this field.' },
  P2021: { status: 500, message: 'A required database table does not exist. Please contact support.' },
  P2022: { status: 500, message: 'A required database column does not exist. Please contact support.' },
  P2025: { status: 404, message: 'The record to update or delete was not found.' },
  P2026: { status: 400, message: 'The database does not support this query feature.' },
};

/**
 * resolveError — maps any raw error to a structured { status, userMessage, code, details } object.
 * This is the single source of truth for translating technical errors into safe, user-facing language.
 */
function resolveError(err) {
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Our own structured errors — pass through as-is
  if (err.name === 'AppError') {
    return {
      status: err.statusCode,
      userMessage: err.message,
      code: err.code,
      details: err.details,
    };
  }

  // 2. Prisma Known Request Errors
  if (err.code && err.code.startsWith('P2')) {
    const mapped = PRISMA_ERROR_MAP[err.code];
    if (mapped) {
      return {
        status: mapped.status,
        userMessage: mapped.message,
        code: `DB_${err.code}`,
        details: null,
      };
    }
    // Unknown Prisma P2xxx — generic DB conflict
    return {
      status: 400,
      userMessage: 'A database constraint was violated. Please check your input.',
      code: `DB_${err.code}`,
      details: null,
    };
  }

  // Prisma Initialization / Connection errors
  if (err.code && err.code.startsWith('P1')) {
    return {
      status: 503,
      userMessage: 'Database is temporarily unavailable. Please try again in a moment.',
      code: 'DB_CONNECTION_ERROR',
      details: null,
    };
  }

  // 3. JWT errors
  if (err.name === 'JsonWebTokenError') {
    return { status: 401, userMessage: 'Invalid authentication token. Please log in again.', code: 'INVALID_TOKEN', details: null };
  }
  if (err.name === 'TokenExpiredError') {
    return { status: 401, userMessage: 'Your session has expired. Please log in again.', code: 'TOKEN_EXPIRED', details: null };
  }
  if (err.name === 'NotBeforeError') {
    return { status: 401, userMessage: 'Token is not yet valid. Please log in again.', code: 'TOKEN_NOT_ACTIVE', details: null };
  }

  // 4. Express body-parser / JSON parse error
  if (err.type === 'entity.too.large') {
    return { status: 413, userMessage: 'Request body is too large. Please reduce your payload size.', code: 'PAYLOAD_TOO_LARGE', details: null };
  }
  if (err.type === 'entity.parse.failed') {
    return { status: 400, userMessage: 'The request body contains invalid JSON. Please check your input.', code: 'INVALID_JSON', details: null };
  }

  // 5. Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, userMessage: 'The uploaded file is too large. Maximum allowed size is 5 MB.', code: 'FILE_TOO_LARGE', details: null };
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return { status: 400, userMessage: 'Unexpected file field in upload.', code: 'UNEXPECTED_FILE_FIELD', details: null };
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return { status: 400, userMessage: 'Too many files uploaded at once.', code: 'TOO_MANY_FILES', details: null };
  }

  // 6. CORS error (thrown in origin callback)
  if (err.message === 'Not allowed by CORS') {
    return { status: 403, userMessage: 'Cross-origin request blocked. Access denied.', code: 'CORS_BLOCKED', details: null };
  }

  // 7. Network / connection issues from external services
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return { status: 503, userMessage: 'A required service is currently unavailable. Please try again later.', code: 'SERVICE_UNAVAILABLE', details: null };
  }
  if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    return { status: 504, userMessage: 'The request timed out. Please try again.', code: 'TIMEOUT', details: null };
  }

  // 8. Validation errors (e.g. from a custom validator or express-validator)
  if (err.name === 'ValidationError') {
    return {
      status: 422,
      userMessage: err.message || 'Validation failed. Please check your input.',
      code: 'VALIDATION_ERROR',
      details: err.errors || null,
    };
  }

  // 9. Generic HTTP errors with a status already attached (e.g. from http-errors library)
  if (err.status && err.status < 500) {
    return {
      status: err.status,
      userMessage: err.message || 'Request could not be completed.',
      code: 'CLIENT_ERROR',
      details: null,
    };
  }

  // 10. Unknown / Internal Server Errors — never leak stack traces in production
  return {
    status: 500,
    userMessage: isProd
      ? 'Something went wrong on our end. Please try again later.'
      : err.message || 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    details: null,
  };
}

/**
 * globalErrorHandler — Express 4-arg error middleware.
 * Mount LAST in app.js, after all routes.
 */
const globalErrorHandler = (err, req, res, next) => {
  const { status, userMessage, code, details } = resolveError(err);

  // Always log server-side errors with full context (never in test env to keep output clean)
  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${status} ${code}`);
    console.error(err.stack || err.message);
  } else if (status >= 400 && process.env.NODE_ENV === 'development') {
    // Log 4xx errors in dev so devs can catch logic mistakes fast
    console.warn(`[WARN] ${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${status} ${code}: ${userMessage}`);
  }

  const body = {
    success: false,
    error: userMessage, // Backward compatibility: error is a string
    code,               // Flat code for easy access
    details,            // Flat details (e.g. for existing validation tests)
    errorDetails: {     // Rich structured error representation
      code,
      message: userMessage,
      ...(details && { details }),
    },
  };

  // Never include stack traces in responses — even in development
  res.status(status).json(body);
};

module.exports = { AppError, globalErrorHandler, resolveError };
