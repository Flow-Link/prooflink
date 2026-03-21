import { LRUCache } from "../cache.js";
import type { ProofLinkConfig } from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** W3C Verifiable Credential structure (simplified subset) */
export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  issuer: string | { id: string; name?: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws?: string;
    proofValue?: string;
  };
}

/** KYA credential specific subject data */
export interface KYACredentialSubject {
  id: string;
  controllingEntityLEI?: string;
  controllingEntityName?: string;
  delegationScope: DelegationScope;
  erc8004AgentId?: string;
  walletAddress: string;
}

/** Delegation scope defines what an agent is authorized to do */
export interface DelegationScope {
  maxTransactionAmount?: number;
  currency?: string;
  allowedJurisdictions?: string[];
  restrictedJurisdictions?: string[];
  expiresAt: string;
}

/** Result of KYA verification */
export interface KYAVerificationResult {
  verified: boolean;
  agentDid?: string;
  controllingEntity?: string;
  delegationScope?: DelegationScope;
  erc8004Registered: boolean;
  credentialExpired: boolean;
  delegationValid: boolean;
  errors: string[];
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// ERC-8004 ABI (minimal interface for identity lookup)
// ---------------------------------------------------------------------------

const ERC8004_REGISTRY_ABI = [
  {
    name: "getAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "wallet", type: "address" },
      { name: "metadataURI", type: "string" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ---------------------------------------------------------------------------
// KYAVerifier
// ---------------------------------------------------------------------------

/**
 * KYA (Know Your Agent) credential verification module.
 *
 * Verifies W3C Verifiable Credential structure, checks ERC-8004 registry
 * registration, and validates delegation scope (amount limits, jurisdiction
 * restrictions, expiry).
 *
 * Uses an LRU cache for verified credentials to avoid repeated on-chain lookups.
 */
export class KYAVerifier {
  private readonly config: ProofLinkConfig;
  private readonly cache: LRUCache<KYAVerificationResult>;

  /** Trusted credential issuers (DIDs or URLs) */
  private readonly trustedIssuers: Set<string>;

  constructor(config: ProofLinkConfig, trustedIssuers?: string[]) {
    this.config = config;
    this.cache = new LRUCache<KYAVerificationResult>(
      config.cacheMaxEntries,
      config.kyaCacheTtlMs,
    );
    this.trustedIssuers = new Set(
      trustedIssuers ?? [
        "did:web:flowlink.io",
        "did:web:jumio.com",
        "did:web:onfido.com",
        "did:web:sumsub.com",
      ],
    );
  }

  /**
   * Verify a KYA Verifiable Credential.
   *
   * Checks:
   * 1. W3C VC structure validity
   * 2. Issuer is in the trusted issuers list
   * 3. Credential is not expired
   * 4. Agent is registered in ERC-8004 registry (if configured)
   * 5. Delegation scope is valid for the transaction context
   *
   * @param credential - W3C Verifiable Credential to verify
   * @param transactionAmountUsd - Amount to check against delegation limits
   * @param jurisdiction - Jurisdiction to check against restrictions
   */
  async verifyCredential(
    credential: VerifiableCredential,
    transactionAmountUsd?: number,
    jurisdiction?: string,
  ): Promise<KYAVerificationResult> {
    const start = Date.now();
    const errors: string[] = [];
    const subjectId = credential.credentialSubject.id;

    // Check cache only when no tx-specific parameters are present
    // (tx-specific results must not be cached as they depend on variable inputs)
    const hasTxSpecificParams =
      transactionAmountUsd !== undefined || jurisdiction !== undefined;
    const cacheKey = `kya:${subjectId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && !hasTxSpecificParams) {
      return { ...cached, latencyMs: Date.now() - start };
    }

    // Step 1: Validate VC structure
    const structureErrors = this.validateVCStructure(credential);
    errors.push(...structureErrors);

    // Step 2: Check issuer trust
    const issuerDid =
      typeof credential.issuer === "string"
        ? credential.issuer
        : credential.issuer.id;
    if (!this.trustedIssuers.has(issuerDid)) {
      errors.push(`Issuer ${issuerDid} is not in the trusted issuers list`);
    }

    // Step 3: Check expiration
    const credentialExpired = this.isCredentialExpired(credential);
    if (credentialExpired) {
      errors.push(
        `Credential expired at ${credential.expirationDate ?? "unknown"}`,
      );
    }

    // Step 4: Extract KYA subject data
    const subject = credential.credentialSubject as unknown as KYACredentialSubject;
    const delegationScope = subject.delegationScope;

    // Step 5: Check ERC-8004 registration
    let erc8004Registered = false;
    if (this.config.erc8004RegistryAddress && this.config.rpcUrl) {
      try {
        erc8004Registered = await this.checkERC8004Registration(
          subject.walletAddress ?? subjectId,
        );
      } catch (error) {
        errors.push(
          `ERC-8004 registry check failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      // Skip ERC-8004 check if not configured
      erc8004Registered = true;
    }

    // Step 6: Validate delegation scope
    let delegationValid = true;
    if (delegationScope) {
      // Check delegation expiry
      if (new Date(delegationScope.expiresAt) < new Date()) {
        delegationValid = false;
        errors.push(`Delegation expired at ${delegationScope.expiresAt}`);
      }

      // Check amount limit
      if (
        transactionAmountUsd !== undefined &&
        delegationScope.maxTransactionAmount !== undefined &&
        transactionAmountUsd > delegationScope.maxTransactionAmount
      ) {
        delegationValid = false;
        errors.push(
          `Transaction amount $${transactionAmountUsd} exceeds delegation limit $${delegationScope.maxTransactionAmount}`,
        );
      }

      // Check jurisdiction restrictions
      if (jurisdiction && delegationScope.restrictedJurisdictions) {
        if (delegationScope.restrictedJurisdictions.includes(jurisdiction)) {
          delegationValid = false;
          errors.push(
            `Jurisdiction ${jurisdiction} is restricted by delegation scope`,
          );
        }
      }
      if (jurisdiction && delegationScope.allowedJurisdictions) {
        if (!delegationScope.allowedJurisdictions.includes(jurisdiction)) {
          delegationValid = false;
          errors.push(
            `Jurisdiction ${jurisdiction} is not in allowed jurisdictions`,
          );
        }
      }
    }

    const result: KYAVerificationResult = {
      verified: errors.length === 0 && erc8004Registered && delegationValid,
      agentDid: subjectId,
      controllingEntity:
        subject.controllingEntityName ?? subject.controllingEntityLEI,
      delegationScope,
      erc8004Registered,
      credentialExpired,
      delegationValid,
      errors,
      latencyMs: Date.now() - start,
    };

    // Cache successful verifications only when no tx-specific params were used
    if (result.verified && !hasTxSpecificParams) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Check if a wallet address is registered in the ERC-8004 Identity Registry.
   * Makes an eth_call to the registry contract.
   */
  async checkERC8004Registration(walletAddress: string): Promise<boolean> {
    if (!this.config.rpcUrl || !this.config.erc8004RegistryAddress) {
      return false;
    }

    // Use viem for the RPC call
    const { createPublicClient, http } = await import("viem");
    const { mainnet } = await import("viem/chains");

    const client = createPublicClient({
      chain: mainnet,
      transport: http(this.config.rpcUrl, { timeout: 4_000 }),
    });

    try {
      const result = await client.readContract({
        address: this.config.erc8004RegistryAddress as `0x${string}`,
        abi: ERC8004_REGISTRY_ABI,
        functionName: "isRegistered",
        args: [walletAddress as `0x${string}`],
      });
      return result as boolean;
    } catch (error) {
      throw new Error(
        `ERC-8004 registry call failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Clear the KYA verification cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private validateVCStructure(vc: VerifiableCredential): string[] {
    const errors: string[] = [];

    if (
      !vc["@context"] ||
      !Array.isArray(vc["@context"]) ||
      !vc["@context"].includes("https://www.w3.org/2018/credentials/v1")
    ) {
      errors.push("Missing required W3C VC context");
    }

    if (
      !vc.type ||
      !Array.isArray(vc.type) ||
      !vc.type.includes("VerifiableCredential")
    ) {
      errors.push('Missing "VerifiableCredential" type');
    }

    if (!vc.issuer) {
      errors.push("Missing issuer");
    }

    if (!vc.issuanceDate) {
      errors.push("Missing issuanceDate");
    }

    if (!vc.credentialSubject?.id) {
      errors.push("Missing credentialSubject.id");
    }

    return errors;
  }

  private isCredentialExpired(vc: VerifiableCredential): boolean {
    if (!vc.expirationDate) return false;
    return new Date(vc.expirationDate) < new Date();
  }
}
