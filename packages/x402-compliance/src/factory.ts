import type { FlowLinkConfig } from "./types.js";
import { FlowLinkX402Compliance, type FlowLinkComplianceServices } from "./middleware.js";

/**
 * Create a FlowLink x402 compliance instance.
 *
 * @example
 * ```ts
 * const compliance = createFlowLinkCompliance({
 *   chainalysisApiKey: process.env.CHAINALYSIS_API_KEY!,
 *   policy: {
 *     sanctionsLists: ["OFAC_SDN", "EU", "UN"],
 *     maxRiskScore: 70,
 *     travelRuleThresholdUsd: 3000,
 *   },
 * });
 *
 * compliance.register(server);
 * ```
 */
export function createFlowLinkCompliance(
  config: FlowLinkConfig,
  services?: FlowLinkComplianceServices,
): FlowLinkX402Compliance {
  return new FlowLinkX402Compliance(config, services);
}
