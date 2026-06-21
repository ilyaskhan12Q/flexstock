/**
 * useApiError — single-source-of-truth for turning any Axios/API error into
 * a human-readable message and an actionable hint.
 *
 * Usage:
 *   const { extractError } = useApiError();
 *   catch (err) { const { message, hint } = extractError(err); }
 */

/**
 * @typedef {Object} ParsedError
 * @property {string}  message   - Short, user-facing message (shown in toast title)
 * @property {string}  hint      - Actionable suggestion (shown in toast body)
 * @property {'error'|'warning'|'info'} severity - Controls toast colour
 * @property {string}  code      - Machine-readable code from server, if present
 * @property {number}  status    - HTTP status code (0 = network failure)
 */

/**
 * Maps server-returned error codes to user-friendly copy.
 * Keys match the `code` field in the server's error JSON: { success: false, error: { code, message } }
 */
const SERVER_CODE_MESSAGES = {
  // Auth
  TOKEN_MISSING:           { message: 'Session not found',         hint: 'Please log in to continue.',                           severity: 'warning' },
  TOKEN_EXPIRED:           { message: 'Session expired',           hint: 'Your session has expired. Please log in again.',        severity: 'warning' },
  INVALID_TOKEN:           { message: 'Invalid session',           hint: 'Your credentials are invalid. Please log in again.',    severity: 'warning' },
  TOKEN_NOT_ACTIVE:        { message: 'Token not yet valid',       hint: 'Please log in again to get a fresh token.',             severity: 'warning' },
  NOT_AUTHENTICATED:       { message: 'Not logged in',             hint: 'Please log in to access this page.',                   severity: 'warning' },
  USER_NOT_FOUND:          { message: 'Account not found',         hint: 'Your account may have been removed. Contact support.',  severity: 'error'   },
  ACCOUNT_DEACTIVATED:     { message: 'Account deactivated',       hint: 'Your account has been disabled. Contact an admin.',     severity: 'error'   },
  INSUFFICIENT_PERMISSIONS:{ message: 'Access denied',             hint: 'You don\'t have permission to perform this action.',    severity: 'error'   },

  // DB / Data
  DB_P2002:                { message: 'Duplicate entry',           hint: 'A record with this value already exists. Use a different value.', severity: 'error' },
  DB_P2025:                { message: 'Record not found',          hint: 'The item you\'re looking for no longer exists.',        severity: 'error'   },
  DB_P2003:                { message: 'Invalid reference',         hint: 'A linked record no longer exists. Refresh and try again.', severity: 'error' },
  DB_P2011:                { message: 'Missing required field',    hint: 'A required field is empty. Please fill in all required fields.', severity: 'error' },
  DB_CONNECTION_ERROR:     { message: 'Database unavailable',      hint: 'The database is temporarily down. Please try again in a moment.', severity: 'error' },

  // Request problems
  VALIDATION_ERROR:        { message: 'Validation failed',         hint: 'Some fields have invalid values. Please review your input.', severity: 'warning' },
  INVALID_JSON:            { message: 'Malformed request',         hint: 'Your request contained invalid data. Please try again.', severity: 'error'   },
  PAYLOAD_TOO_LARGE:       { message: 'Data too large',            hint: 'The data you\'re sending is too large. Please reduce it.', severity: 'error'  },
  FILE_TOO_LARGE:          { message: 'File too large',            hint: 'The file exceeds the 5 MB limit. Please use a smaller file.', severity: 'error' },
  TOO_MANY_FILES:          { message: 'Too many files',            hint: 'Please upload one file at a time.',                    severity: 'error'   },
  UNEXPECTED_FILE_FIELD:   { message: 'Unexpected file field',     hint: 'The file was sent to the wrong endpoint.',              severity: 'error'   },

  // Server/infra
  NOT_FOUND:               { message: 'Not found',                 hint: 'The page or resource doesn\'t exist.',                 severity: 'error'   },
  CORS_BLOCKED:            { message: 'Access blocked',            hint: 'Cross-origin access was denied. Contact support.',      severity: 'error'   },
  SERVICE_UNAVAILABLE:     { message: 'Service unavailable',       hint: 'A background service is down. Please try again later.', severity: 'error'  },
  TIMEOUT:                 { message: 'Request timed out',         hint: 'The server took too long to respond. Please try again.', severity: 'error'  },
  INTERNAL_ERROR:          { message: 'Server error',              hint: 'Something went wrong on our end. Please try again later.', severity: 'error' },
};

/**
 * Maps HTTP status codes to fallback copy when the server doesn't return a structured code.
 */
const HTTP_STATUS_MESSAGES = {
  0:   { message: 'No connection',             hint: 'Check your internet connection and try again.',          severity: 'error'   },
  400: { message: 'Bad request',               hint: 'Your request contained invalid data. Please check your input.', severity: 'warning' },
  401: { message: 'Session expired',           hint: 'Please log in again to continue.',                       severity: 'warning' },
  403: { message: 'Access denied',             hint: 'You don\'t have permission to perform this action.',     severity: 'error'   },
  404: { message: 'Not found',                 hint: 'The item you\'re looking for doesn\'t exist.',           severity: 'error'   },
  408: { message: 'Request timeout',           hint: 'The request took too long. Please try again.',           severity: 'error'   },
  409: { message: 'Conflict',                  hint: 'This record already exists or conflicts with another one.', severity: 'warning' },
  413: { message: 'Data too large',            hint: 'The file or data you\'re sending is too large.',         severity: 'error'   },
  422: { message: 'Invalid input',             hint: 'Some fields failed validation. Please review your input.', severity: 'warning' },
  429: { message: 'Too many requests',         hint: 'You\'re doing that too fast. Please wait a moment and try again.', severity: 'warning' },
  500: { message: 'Server error',              hint: 'Something went wrong on our end. Please try again later.', severity: 'error'  },
  502: { message: 'Service error',             hint: 'The server is temporarily unreachable. Please try again later.', severity: 'error' },
  503: { message: 'Service unavailable',       hint: 'The server is down for maintenance. Please try again soon.', severity: 'error' },
  504: { message: 'Gateway timeout',           hint: 'The server took too long to respond. Please try again.', severity: 'error'   },
};

/**
 * extractError — pure function that parses any error thrown by Axios.
 *
 * @param {unknown} error - The raw error from a catch block
 * @param {string}  [fallbackMessage] - Optional fallback if all else fails
 * @returns {ParsedError}
 */
export function extractError(error, fallbackMessage = 'An unexpected error occurred.') {
  // 1. Network error — no response at all (offline, DNS failure, server down)
  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return {
      ...(HTTP_STATUS_MESSAGES[0]),
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }

  const status = error.response?.status ?? 0;
  const serverBody = error.response?.data;

  // 2. Server returned a structured { success: false, error: { code, message } } response
  if (serverBody?.error?.code) {
    const code = serverBody.error.code;
    const knownCode = SERVER_CODE_MESSAGES[code];

    if (knownCode) {
      return { ...knownCode, code, status };
    }

    // Structured but unknown code — use server message if present, fallback to generic
    return {
      message: serverBody.error.message || `Error (${status})`,
      hint: 'Please try again. If this persists, contact support.',
      severity: status >= 500 ? 'error' : 'warning',
      code,
      status,
    };
  }

  // 3. Server returned an old-style { error: "string message" } response
  if (serverBody?.error && typeof serverBody.error === 'string') {
    const knownStatus = HTTP_STATUS_MESSAGES[status];
    return {
      message: knownStatus?.message || `Error (${status})`,
      hint: serverBody.error, // show the server string as the hint
      severity: knownStatus?.severity || 'error',
      code: `HTTP_${status}`,
      status,
    };
  }

  // 4. Known HTTP status code — standard fallback copy
  if (HTTP_STATUS_MESSAGES[status]) {
    return {
      ...HTTP_STATUS_MESSAGES[status],
      code: `HTTP_${status}`,
      status,
    };
  }

  // 5. Absolute last resort
  return {
    message: fallbackMessage,
    hint: 'Please try again. If this persists, contact support.',
    severity: 'error',
    code: 'UNKNOWN_ERROR',
    status,
  };
}

/**
 * useApiError — React hook wrapper around extractError.
 * Makes it easy to use inside components without importing the pure function directly.
 */
export function useApiError() {
  return { extractError };
}
