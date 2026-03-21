// ---------------------------------------------------------------------------
// Error hierarchy
// ---------------------------------------------------------------------------

/**
 * Base error class for all FlowLink SDK errors.
 *
 * Consumers can catch `FlowLinkError` to handle any SDK-originated error.
 */
export class FlowLinkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FlowLinkError";
  }
}

/** Structured error body returned by the FlowLink API. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Thrown when the FlowLink API returns a non-2xx HTTP response.
 *
 * Includes the parsed error body when the response was valid JSON.
 */
export class FlowLinkAPIError extends FlowLinkError {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | null,
    public readonly headers: Headers,
  ) {
    const msg = body?.message ?? `API request failed with status ${status}`;
    super(msg);
    this.name = "FlowLinkAPIError";
  }
}

/**
 * Thrown when request parameters fail client-side validation
 * before a network call is made.
 */
export class FlowLinkValidationError extends FlowLinkError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "FlowLinkValidationError";
  }
}

/**
 * Thrown when a request exceeds the configured timeout.
 */
export class FlowLinkTimeoutError extends FlowLinkError {
  constructor(
    public readonly timeoutMs: number,
    public readonly url: string,
  ) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "FlowLinkTimeoutError";
  }
}

/**
 * Thrown on network-level failures (DNS resolution, connection refused, etc.)
 * after all retry attempts are exhausted.
 */
export class FlowLinkNetworkError extends FlowLinkError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FlowLinkNetworkError";
  }
}
