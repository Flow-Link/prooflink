import type {
  FlowLinkConfig,
  ResourceServerExtension,
  PaymentPayload,
  PaymentRequirements,
} from "./types.js";
import { payloadKey } from "./hooks/before-verify.js";

// ---------------------------------------------------------------------------
// FlowLink ResourceServerExtension
// ---------------------------------------------------------------------------

export interface FlowLinkExtensionDeps {
  config: FlowLinkConfig;
  settledProofLinks: Map<string, { hash: string; timestamp: number }>;
}

/**
 * Creates the FlowLink x402 ResourceServerExtension.
 *
 * - `enrichPaymentRequiredResponse()` — adds compliance policy info to 402 response headers
 * - `enrichSettlementResponse()` — adds ProofLink receipt hash to settlement response
 */
export function createFlowLinkExtension(deps: FlowLinkExtensionDeps): ResourceServerExtension {
  const { config, settledProofLinks } = deps;

  return {
    key: "flowlink",

    async enrichPaymentRequiredResponse(
      _declaration: Record<string, unknown>,
      _context: { requirements: PaymentRequirements },
    ): Promise<Record<string, unknown>> {
      return {
        complianceRequired: true,
        provider: "flowlink",
        version: "0.1.0",
        sanctionsLists: config.policy.sanctionsLists,
        travelRuleThresholdUsd: config.policy.travelRuleThresholdUsd,
        maxRiskScore: config.policy.maxRiskScore,
      };
    },

    async enrichSettlementResponse(
      _declaration: Record<string, unknown>,
      context: { paymentPayload: PaymentPayload; requirements: PaymentRequirements },
    ): Promise<Record<string, unknown>> {
      const key = payloadKey(context.paymentPayload);
      const entry = settledProofLinks.get(key);

      // Cleanup after consumption — one-time read
      if (entry) {
        settledProofLinks.delete(key);
      }

      return {
        complianceVerified: true,
        provider: "flowlink",
        proofLinkHash: entry?.hash ?? null,
      };
    },
  };
}
