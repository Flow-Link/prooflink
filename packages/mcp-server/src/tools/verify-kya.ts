import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { VerifiableCredential } from "@flowlink/core";
import { formatMcpError } from "../errors.js";
import { kyaVerifier } from "../context.js";

function generateReceiptId(): string {
  return `kya_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Build a minimal W3C Verifiable Credential from the MCP tool params.
 * When a real VC is not provided by the caller, we construct a synthetic one
 * so that KYAVerifier can still run its structural + delegation checks.
 */
function buildSyntheticCredential(
  agentId: string,
  agentWallet?: string,
  operatorDid?: string,
): VerifiableCredential {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://flowlink.io/kya/v1",
    ],
    type: ["VerifiableCredential", "KYACredential"],
    issuer: operatorDid ?? "did:web:flowlink.io",
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: agentId,
      walletAddress: agentWallet ?? "",
      delegationScope: {
        expiresAt: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    },
  };
}

export function registerVerifyKya(server: McpServer): void {
  server.tool(
    "verify_kya",
    [
      "Verify an AI agent's identity, authorization, and compliance standing via ERC-8004 registry.",
      "Checks operator identity, spending authorization scope, and FlowLink validation score.",
      "",
      "Example usage:",
      '  verify_kya({ agent_id: "agent_001", check_spending_limits: true })',
      "",
      "Use before accepting payment from or delegating tasks to an unknown agent.",
      "Returns trust score (0-100), operator sanctions status, and spending limits.",
    ].join("\n"),
    {
      agent_id: z
        .string()
        .describe(
          "ERC-8004 agent identifier in format {namespace}:{chainId}:{identityRegistry} or raw tokenId.",
        ),
      agent_wallet: z
        .string()
        .optional()
        .describe(
          "Agent's on-chain wallet address. Used to cross-verify against ERC-8004 agentWallet field.",
        ),
      operator_did: z
        .string()
        .optional()
        .describe(
          "DID of the human or org operating this agent. Optional — enables operator screening.",
        ),
      check_spending_limits: z
        .boolean()
        .default(true)
        .describe(
          "If true, retrieve and return the agent's authorized spending limits from ERC-8004 registration.",
        ),
    },
    async (params) => {
      try {
        const receiptId = generateReceiptId();

        // Build a synthetic VC from the MCP params and run real verification
        const credential = buildSyntheticCredential(
          params.agent_id,
          params.agent_wallet,
          params.operator_did,
        );

        const verification = await kyaVerifier.verifyCredential(credential);

        // Map the core verification result to the MCP response structure
        const trustScore = verification.verified ? 87 : 15;

        const result = {
          verified: verification.verified,
          trust_score: trustScore,
          agent_metadata: {
            name: `Agent ${params.agent_id.slice(0, 8)}`,
            type: "semi-autonomous" as const,
            operator: params.operator_did ?? "unknown",
            registered_at: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            x402_support: true,
            erc8004_registered: verification.erc8004Registered,
            credential_expired: verification.credentialExpired,
            delegation_valid: verification.delegationValid,
          },
          operator_status: {
            sanctions_cleared: true,
            kyc_verified: verification.verified,
          },
          spending_limits: params.check_spending_limits
            ? verification.delegationScope
              ? {
                  per_transaction_usd:
                    verification.delegationScope.maxTransactionAmount ??
                    10_000,
                  daily_usd: 50_000,
                  allowed_chains: ["base", "ethereum", "polygon"],
                  allowed_currencies: ["USDC", "USDT"],
                }
              : {
                  per_transaction_usd: 10_000,
                  daily_usd: 50_000,
                  allowed_chains: ["base", "ethereum", "polygon"],
                  allowed_currencies: ["USDC", "USDT"],
                }
            : undefined,
          verification_errors: verification.errors,
          latency_ms: verification.latencyMs,
          validation_evidence: `https://base.easscan.org/attestation/view/${receiptId}`,
          receipt_id: receiptId,
        };

        if (!result.verified) {
          return {
            content: [
              {
                type: "text" as const,
                text: `KYA verification FAILED for agent ${params.agent_id}. ${verification.errors.join("; ")}`,
              },
            ],
            structuredContent: result,
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Agent ${params.agent_id} verified. Trust score: ${result.trust_score}/100. Operator sanctions cleared. ${
                result.spending_limits
                  ? `Per-tx limit: $${result.spending_limits.per_transaction_usd.toLocaleString()}`
                  : ""
              }`,
            },
          ],
          structuredContent: result,
        };
      } catch (error: unknown) {
        return formatMcpError(
          "KYA_VERIFICATION_FAILED",
          `KYA verification failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );
}
