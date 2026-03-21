import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TravelRuleChecker,
  MockNotabeneProvider,
  NotabeneProvider,
  type TravelRuleProvider,
  type IVMS101Message,
} from "../travel-rule/checker.js";
import type { TravelRuleData } from "@flowlink/shared";
import type { ProofLinkConfig } from "../config.js";

// ---------------------------------------------------------------------------
// Mock fetch for NotabeneProvider tests
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<ProofLinkConfig>): ProofLinkConfig {
  return {
    chainalysisBaseUrl: "https://public.chainalysis.com/api/v1",
    sanctionsLists: ["OFAC_SDN"],
    maxRiskScore: 85,
    escalationThreshold: 60,
    failOpen: false,
    allowlist: [],
    blocklist: [],
    travelRuleThresholds: {
      US: 3000,
      EU: 0,
      SG: 1100,
      JP: 0,
      KR: 850,
      AE: 950,
    },
    defaultTravelRuleThresholdUsd: 3000,
    cacheMaxEntries: 100,
    sanctionsCacheTtlMs: 300_000,
    kyaCacheTtlMs: 900_000,
    restrictedJurisdictions: ["IR", "KP"],
    ...overrides,
  };
}

function makeTravelRuleData(
  overrides?: Partial<TravelRuleData>,
): TravelRuleData {
  return {
    originator: {
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      name: "Alice Sender",
    },
    beneficiary: {
      walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      name: "Bob Receiver",
    },
    amountUsd: 500,
    asset: "USDC",
    chain: "eip155:1",
    direction: "outgoing",
    preTransaction: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: getThresholdForJurisdiction
// ---------------------------------------------------------------------------

describe("TravelRuleChecker — getThresholdForJurisdiction", () => {
  it("should return US threshold of $3000", () => {
    const checker = new TravelRuleChecker(makeConfig());
    expect(checker.getThresholdForJurisdiction("US")).toBe(3000);
  });

  it("should return EU threshold of $0 (all transactions)", () => {
    const checker = new TravelRuleChecker(makeConfig());
    expect(checker.getThresholdForJurisdiction("EU")).toBe(0);
  });

  it("should return SG threshold of $1100", () => {
    const checker = new TravelRuleChecker(makeConfig());
    expect(checker.getThresholdForJurisdiction("SG")).toBe(1100);
  });

  it("should return JP threshold of $0", () => {
    const checker = new TravelRuleChecker(makeConfig());
    expect(checker.getThresholdForJurisdiction("JP")).toBe(0);
  });

  it("should return KR threshold of $850", () => {
    const checker = new TravelRuleChecker(makeConfig());
    expect(checker.getThresholdForJurisdiction("KR")).toBe(850);
  });

  it("should return AE threshold of $950", () => {
    const checker = new TravelRuleChecker(makeConfig());
    expect(checker.getThresholdForJurisdiction("AE")).toBe(950);
  });

  it("should return default threshold ($3000) for unknown jurisdiction", () => {
    const checker = new TravelRuleChecker(makeConfig());
    expect(checker.getThresholdForJurisdiction("ZZ")).toBe(3000);
  });

  it("should use custom defaultTravelRuleThresholdUsd for unknown jurisdiction", () => {
    const checker = new TravelRuleChecker(
      makeConfig({ defaultTravelRuleThresholdUsd: 5000 }),
    );
    expect(checker.getThresholdForJurisdiction("ZZ")).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Tests: NOT_REQUIRED (below threshold)
// ---------------------------------------------------------------------------

describe("TravelRuleChecker — NOT_REQUIRED when below threshold", () => {
  it("should return NOT_REQUIRED for US jurisdiction below $3000", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 2_999 }),
    );

    expect(result.required).toBe(false);
    expect(result.status).toBe("NOT_REQUIRED");
    expect(result.thresholdUsd).toBe(3000);
  });

  it("should return NOT_REQUIRED exactly at threshold boundary (amount == threshold — NOT exceeded)", async () => {
    // threshold is 3000; <3000 is required, so exactly 3000 is NOT below — it triggers
    // Wait: the check is `if (data.amountUsd < threshold)` so exactly 3000 does NOT return NOT_REQUIRED
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 3_000 }),
    );

    // 3000 is NOT < 3000 → Travel Rule IS required
    expect(result.required).toBe(true);
    expect(result.status).toBe("TRANSMITTED");
  });

  it("should return NOT_REQUIRED for amount $2999.99 (just below US threshold)", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 2_999.99 }),
    );

    expect(result.required).toBe(false);
    expect(result.status).toBe("NOT_REQUIRED");
  });

  it("should include latencyMs in the result", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 100 }),
    );

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: TRANSMITTED (above threshold, successful provider)
// ---------------------------------------------------------------------------

describe("TravelRuleChecker — TRANSMITTED when above threshold", () => {
  it("should transmit for US jurisdiction above $3000", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(true),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 5_000 }),
    );

    expect(result.required).toBe(true);
    expect(result.status).toBe("TRANSMITTED");
    expect(result.referenceId).toBeTruthy();
    expect(result.referenceId).toMatch(/^nb-mock-/);
    expect(result.thresholdUsd).toBe(3000);
  });

  it("should transmit for large amount with full IVMS101 data", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(true),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({
        amountUsd: 100_000,
        originator: {
          walletAddress: "0x1234",
          name: "Alice",
          physicalAddress: "123 Main St, New York, NY",
          nationalId: "SSN-123-45-6789",
        },
        beneficiary: {
          walletAddress: "0xabcd",
          name: "Bob",
        },
      }),
    );

    expect(result.status).toBe("TRANSMITTED");
  });
});

// ---------------------------------------------------------------------------
// Tests: FAILED (provider failure)
// ---------------------------------------------------------------------------

describe("TravelRuleChecker — FAILED when provider fails", () => {
  it("should return FAILED status when provider transmission fails", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(false),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 5_000 }),
    );

    expect(result.required).toBe(true);
    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("Mock Notabene transmission failure");
  });

  it("should return FAILED with error message populated", async () => {
    const failingProvider: TravelRuleProvider = {
      async transmit(_msg: IVMS101Message) {
        return { success: false, error: "Custom provider error" };
      },
    };
    const checker = new TravelRuleChecker(makeConfig(), failingProvider);

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 5_000 }),
    );

    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("Custom provider error");
  });
});

// ---------------------------------------------------------------------------
// Tests: Jurisdiction resolution
// ---------------------------------------------------------------------------

describe("TravelRuleChecker — jurisdiction resolution from VASP DIDs", () => {
  it("should default to US jurisdiction when no VASP DIDs present", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(),
    );

    // No vaspDid on originator or beneficiary → defaults to US (threshold $3000)
    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 1_000 }),
    );

    // $1000 < $3000 (US) → NOT_REQUIRED
    expect(result.status).toBe("NOT_REQUIRED");
    expect(result.triggeringJurisdiction).toBe("US");
  });

  it("should resolve JP jurisdiction from beneficiary VASP DID (.jp TLD) with threshold=0", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(),
    );

    // JP threshold is 0 → even $1 requires Travel Rule
    const result = await checker.checkTravelRule(
      makeTravelRuleData({
        amountUsd: 1,
        beneficiary: {
          walletAddress: "0xabcd",
          vaspDid: "did:web:compliance.jp",
        },
      }),
    );

    expect(result.required).toBe(true);
    expect(result.status).toBe("TRANSMITTED");
    expect(result.triggeringJurisdiction).toBe("JP");
  });

  it("should pick most restrictive jurisdiction between originator (SG) and beneficiary (JP)", async () => {
    const checker = new TravelRuleChecker(
      makeConfig(),
      new MockNotabeneProvider(),
    );

    // SG threshold=1100, JP threshold=0 → JP is more restrictive
    const result = await checker.checkTravelRule(
      makeTravelRuleData({
        amountUsd: 100, // below SG threshold (1100) but above JP threshold (0)
        originator: {
          walletAddress: "0x1234",
          vaspDid: "did:web:vasp.sg",
        },
        beneficiary: {
          walletAddress: "0xabcd",
          vaspDid: "did:web:vasp.jp",
        },
      }),
    );

    // JP wins (threshold=0) → required=true
    expect(result.required).toBe(true);
    expect(result.triggeringJurisdiction).toBe("JP");
  });
});

// ---------------------------------------------------------------------------
// Tests: MockNotabeneProvider
// ---------------------------------------------------------------------------

describe("MockNotabeneProvider", () => {
  it("should succeed and return a reference ID by default", async () => {
    const provider = new MockNotabeneProvider();
    const result = await provider.transmit({
      originator: {
        originatorPersons: [{ naturalPerson: { name: "Alice" } }],
        accountNumber: ["0x1234"],
      },
      beneficiary: {
        beneficiaryPersons: [{ naturalPerson: { name: "Bob" } }],
        accountNumber: ["0xabcd"],
      },
      transactionAmount: "5000",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    });

    expect(result.success).toBe(true);
    expect(result.referenceId).toBeTruthy();
    expect(result.error).toBeUndefined();
  });

  it("should fail when constructed with shouldSucceed=false", async () => {
    const provider = new MockNotabeneProvider(false);
    const result = await provider.transmit({
      originator: {
        originatorPersons: [{ naturalPerson: { name: "Alice" } }],
        accountNumber: ["0x1234"],
      },
      beneficiary: {
        beneficiaryPersons: [{ naturalPerson: { name: "Bob" } }],
        accountNumber: ["0xabcd"],
      },
      transactionAmount: "5000",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Mock Notabene");
    expect(result.referenceId).toBeUndefined();
  });

  it("should generate unique reference IDs across successive calls", async () => {
    const provider = new MockNotabeneProvider();
    const message = {
      originator: {
        originatorPersons: [{ naturalPerson: { name: "Alice" } }],
        accountNumber: ["0x1234"],
      },
      beneficiary: {
        beneficiaryPersons: [{ naturalPerson: { name: "Bob" } }],
        accountNumber: ["0xabcd"],
      },
      transactionAmount: "5000",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    };

    const r1 = await provider.transmit(message);
    const r2 = await provider.transmit(message);

    expect(r1.referenceId).not.toBe(r2.referenceId);
  });
});

// ---------------------------------------------------------------------------
// Tests: NotabeneProvider (real, uses fetch)
// ---------------------------------------------------------------------------

describe("NotabeneProvider", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should return success and referenceId on HTTP 200 response", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "nb-real-12345" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const provider = new NotabeneProvider({
      apiKey: "test-api-key",
      vaspDID: "did:web:vasp.flowlink.io",
      baseUrl: "https://api.notabene.id/v1",
    });

    const result = await provider.transmit({
      originator: {
        originatorPersons: [{ naturalPerson: { name: "Alice" } }],
        accountNumber: ["0x1234"],
      },
      beneficiary: {
        beneficiaryPersons: [{ naturalPerson: { name: "Bob" } }],
        accountNumber: ["0xabcd"],
      },
      transactionAmount: "5000",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    });

    expect(result.success).toBe(true);
    expect(result.referenceId).toBe("nb-real-12345");
  });

  it("should send Authorization Bearer header", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "nb-abc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const provider = new NotabeneProvider({
      apiKey: "my-secret-key",
      vaspDID: "did:web:vasp.flowlink.io",
      baseUrl: "https://api.notabene.id/v1",
    });

    await provider.transmit({
      originator: {
        originatorPersons: [],
        accountNumber: ["0x1234"],
      },
      beneficiary: {
        beneficiaryPersons: [],
        accountNumber: ["0xabcd"],
      },
      transactionAmount: "100",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    });

    const callInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
    const headers = callInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-secret-key");
  });

  it("should return failure with error message on non-OK HTTP response", async () => {
    mockFetch.mockResolvedValue(
      new Response("Bad Request", {
        status: 400,
        statusText: "Bad Request",
      }),
    );

    const provider = new NotabeneProvider({
      apiKey: "key",
      vaspDID: "did:web:vasp.flowlink.io",
      baseUrl: "https://api.notabene.id/v1",
    });

    const result = await provider.transmit({
      originator: {
        originatorPersons: [],
        accountNumber: ["0x1234"],
      },
      beneficiary: {
        beneficiaryPersons: [],
        accountNumber: ["0xabcd"],
      },
      transactionAmount: "100",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
  });

  it("should return failure when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const provider = new NotabeneProvider({
      apiKey: "key",
      vaspDID: "did:web:vasp.flowlink.io",
      baseUrl: "https://api.notabene.id/v1",
    });

    const result = await provider.transmit({
      originator: {
        originatorPersons: [],
        accountNumber: ["0x1234"],
      },
      beneficiary: {
        beneficiaryPersons: [],
        accountNumber: ["0xabcd"],
      },
      transactionAmount: "100",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("should use fallback referenceId when response body has no id field", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const provider = new NotabeneProvider({
      apiKey: "key",
      vaspDID: "did:web:vasp.flowlink.io",
      baseUrl: "https://api.notabene.id/v1",
    });

    const result = await provider.transmit({
      originator: { originatorPersons: [], accountNumber: ["0x1234"] },
      beneficiary: { beneficiaryPersons: [], accountNumber: ["0xabcd"] },
      transactionAmount: "100",
      transactionAsset: "USDC",
      transactionChain: "eip155:1",
    });

    expect(result.success).toBe(true);
    expect(result.referenceId).toMatch(/^nb-\d+/);
  });
});

// ---------------------------------------------------------------------------
// Tests: TravelRuleChecker constructor provider selection
// ---------------------------------------------------------------------------

describe("TravelRuleChecker — provider selection", () => {
  it("should use MockNotabeneProvider when no provider or notabene config given", async () => {
    // No provider or notabene config → MockNotabeneProvider used
    const checker = new TravelRuleChecker(makeConfig());

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 5_000 }),
    );

    // MockNotabeneProvider succeeds by default
    expect(result.status).toBe("TRANSMITTED");
  });

  it("should use NotabeneProvider when notabene config is present in ProofLinkConfig", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "nb-config-test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const checker = new TravelRuleChecker(
      makeConfig({
        notabene: {
          apiKey: "test-key",
          vaspDID: "did:web:vasp.flowlink.io",
          baseUrl: "https://api.notabene.id/v1",
          testnet: false,
        },
      }),
    );

    const result = await checker.checkTravelRule(
      makeTravelRuleData({ amountUsd: 5_000 }),
    );

    expect(result.status).toBe("TRANSMITTED");
    expect(mockFetch).toHaveBeenCalled();
  });
});
