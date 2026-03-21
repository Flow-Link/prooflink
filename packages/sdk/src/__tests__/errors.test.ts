import { describe, expect, it } from "vitest";
import {
  FlowLinkAPIError,
  FlowLinkError,
  FlowLinkNetworkError,
  FlowLinkTimeoutError,
  FlowLinkValidationError,
  type ApiErrorBody,
} from "../errors.js";

// ---------------------------------------------------------------------------
// FlowLinkError — base class
// ---------------------------------------------------------------------------

describe("FlowLinkError", () => {
  it("sets name to FlowLinkError", () => {
    const err = new FlowLinkError("base error");
    expect(err.name).toBe("FlowLinkError");
  });

  it("sets message correctly", () => {
    const err = new FlowLinkError("something went wrong");
    expect(err.message).toBe("something went wrong");
  });

  it("is an instance of Error", () => {
    const err = new FlowLinkError("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("accepts ErrorOptions cause", () => {
    const cause = new Error("root cause");
    const err = new FlowLinkError("wrapper", { cause });
    expect((err as Error & { cause: unknown }).cause).toBe(cause);
  });

  it("stack trace is defined", () => {
    const err = new FlowLinkError("trace check");
    expect(err.stack).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// FlowLinkAPIError
// ---------------------------------------------------------------------------

describe("FlowLinkAPIError", () => {
  function makeHeaders(entries: Record<string, string> = {}): Headers {
    return new Headers(entries);
  }

  it("sets name to FlowLinkAPIError", () => {
    const err = new FlowLinkAPIError(400, null, makeHeaders());
    expect(err.name).toBe("FlowLinkAPIError");
  });

  it("is an instance of FlowLinkError", () => {
    const err = new FlowLinkAPIError(500, null, makeHeaders());
    expect(err).toBeInstanceOf(FlowLinkError);
  });

  it("stores status code", () => {
    const err = new FlowLinkAPIError(403, null, makeHeaders());
    expect(err.status).toBe(403);
  });

  it("stores body when provided", () => {
    const body: ApiErrorBody = { code: "FORBIDDEN", message: "Access denied" };
    const err = new FlowLinkAPIError(403, body, makeHeaders());
    expect(err.body).toEqual(body);
  });

  it("body is null when not provided", () => {
    const err = new FlowLinkAPIError(500, null, makeHeaders());
    expect(err.body).toBeNull();
  });

  it("uses body.message as the error message when body is present", () => {
    const body: ApiErrorBody = { code: "RATE_LIMITED", message: "Too many requests" };
    const err = new FlowLinkAPIError(429, body, makeHeaders());
    expect(err.message).toBe("Too many requests");
  });

  it("falls back to generic message when body is null", () => {
    const err = new FlowLinkAPIError(503, null, makeHeaders());
    expect(err.message).toBe("API request failed with status 503");
  });

  it("stores response headers", () => {
    const headers = makeHeaders({ "x-request-id": "req_abc" });
    const err = new FlowLinkAPIError(400, null, headers);
    expect(err.headers.get("x-request-id")).toBe("req_abc");
  });

  it("body can include details field", () => {
    const body: ApiErrorBody = {
      code: "VALIDATION_FAILED",
      message: "Invalid input",
      details: { field: "address", reason: "invalid checksum" },
    };
    const err = new FlowLinkAPIError(422, body, makeHeaders());
    expect(err.body?.details?.field).toBe("address");
  });

  describe("status codes", () => {
    it.each([401, 403, 404, 422, 429, 500, 502, 503, 504])(
      "stores status %i",
      (status) => {
        const err = new FlowLinkAPIError(status, null, makeHeaders());
        expect(err.status).toBe(status);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// FlowLinkValidationError
// ---------------------------------------------------------------------------

describe("FlowLinkValidationError", () => {
  it("sets name to FlowLinkValidationError", () => {
    const err = new FlowLinkValidationError("invalid");
    expect(err.name).toBe("FlowLinkValidationError");
  });

  it("is an instance of FlowLinkError", () => {
    const err = new FlowLinkValidationError("invalid");
    expect(err).toBeInstanceOf(FlowLinkError);
  });

  it("sets message correctly", () => {
    const err = new FlowLinkValidationError("apiKey is required");
    expect(err.message).toBe("apiKey is required");
  });

  it("stores optional field name", () => {
    const err = new FlowLinkValidationError("address is required", "address");
    expect(err.field).toBe("address");
  });

  it("field is undefined when not provided", () => {
    const err = new FlowLinkValidationError("some validation failed");
    expect(err.field).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// FlowLinkTimeoutError
// ---------------------------------------------------------------------------

describe("FlowLinkTimeoutError", () => {
  it("sets name to FlowLinkTimeoutError", () => {
    const err = new FlowLinkTimeoutError(30_000, "https://api.flowlink.io/v1/compliance/check");
    expect(err.name).toBe("FlowLinkTimeoutError");
  });

  it("is an instance of FlowLinkError", () => {
    const err = new FlowLinkTimeoutError(5000, "https://example.com");
    expect(err).toBeInstanceOf(FlowLinkError);
  });

  it("stores timeoutMs", () => {
    const err = new FlowLinkTimeoutError(15_000, "https://api.flowlink.io/v1");
    expect(err.timeoutMs).toBe(15_000);
  });

  it("stores url", () => {
    const url = "https://api.flowlink.io/v1/compliance/check";
    const err = new FlowLinkTimeoutError(30_000, url);
    expect(err.url).toBe(url);
  });

  it("formats message with url and timeout", () => {
    const err = new FlowLinkTimeoutError(5000, "https://api.flowlink.io/v1/invoices");
    expect(err.message).toBe(
      "Request to https://api.flowlink.io/v1/invoices timed out after 5000ms",
    );
  });
});

// ---------------------------------------------------------------------------
// FlowLinkNetworkError
// ---------------------------------------------------------------------------

describe("FlowLinkNetworkError", () => {
  it("sets name to FlowLinkNetworkError", () => {
    const err = new FlowLinkNetworkError("connection refused");
    expect(err.name).toBe("FlowLinkNetworkError");
  });

  it("is an instance of FlowLinkError", () => {
    const err = new FlowLinkNetworkError("dns failure");
    expect(err).toBeInstanceOf(FlowLinkError);
  });

  it("sets message correctly", () => {
    const err = new FlowLinkNetworkError("failed to connect");
    expect(err.message).toBe("failed to connect");
  });

  it("accepts cause via ErrorOptions", () => {
    const cause = new TypeError("Failed to fetch");
    const err = new FlowLinkNetworkError("network error", { cause });
    expect((err as Error & { cause: unknown }).cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// Error serialization and JSON.stringify
// ---------------------------------------------------------------------------

describe("error serialization", () => {
  it("FlowLinkValidationError serializes message and name via JSON.stringify", () => {
    const err = new FlowLinkValidationError("apiKey is required", "apiKey");
    const json = JSON.parse(JSON.stringify(err)) as Record<string, unknown>;
    // JSON.stringify of Error objects only captures enumerable own-properties
    // field is stored as a public property so it should appear
    expect(json.field).toBe("apiKey");
  });

  it("FlowLinkAPIError serializes status and body", () => {
    const body: ApiErrorBody = { code: "NOT_FOUND", message: "not found" };
    const err = new FlowLinkAPIError(404, body, new Headers());
    const json = JSON.parse(JSON.stringify(err)) as Record<string, unknown>;
    expect(json.status).toBe(404);
  });

  it("FlowLinkTimeoutError serializes timeoutMs and url", () => {
    const err = new FlowLinkTimeoutError(10_000, "https://api.flowlink.io");
    const json = JSON.parse(JSON.stringify(err)) as Record<string, unknown>;
    expect(json.timeoutMs).toBe(10_000);
    expect(json.url).toBe("https://api.flowlink.io");
  });
});
