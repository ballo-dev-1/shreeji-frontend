/**
 * Maps HTTP status codes to user-friendly messages.
 * Never expose raw status codes or server internals to users.
 */
export function friendlyHttpError(status: number): string {
  if (status === 400) return 'Invalid request. Please check your input and try again.';
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return 'The requested item could not be found.';
  if (status === 409) return 'This conflicts with existing data. Please refresh the page and try again.';
  if (status === 413) return 'The file is too large. Please use a smaller file and try again.';
  if (status === 422) return 'Some information provided is invalid. Please check your input.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

const TECHNICAL_PATTERNS = [
  /\b(TypeError|ReferenceError|SyntaxError|NetworkError|AbortError)\b/,
  /\bAPI request failed\b/,
  /fetch failed/i,
  /Failed to fetch/i,
  /ERR_[A-Z_]+/,
  /\b[45]\d{2}\b/, // HTTP status codes (4xx / 5xx)
  /stack trace/i,
  /at Object\./,
  /Cannot read propert/i,
];

/**
 * Returns a safe, user-friendly message from an unknown error.
 * Falls back to `fallback` if the error looks technical.
 */
export function friendlyError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? (error.message ?? '') : String(error ?? '');
  if (!msg) return fallback;
  if (TECHNICAL_PATTERNS.some((re) => re.test(msg))) return fallback;
  return msg;
}
