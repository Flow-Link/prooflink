// ---------------------------------------------------------------------------
// Notabene — TravelRuleProvider implementation for @flowlink/core
// ---------------------------------------------------------------------------

import type { TravelRuleData } from "@flowlink/shared";
import type {
  IVMS101Message,
  TravelRuleProvider,
} from "@flowlink/core";
import { NotabeneClient, type HttpClient } from "./client.js";
import type { NotabeneConfig } from "./types.js";

/**
 * Production-grade Travel Rule provider backed by the Notabene Gateway API.
 *
 * Implements `TravelRuleProvider` from `@flowlink/core` so it can be injected
 * into `TravelRuleChecker` and `ProofLinkEngine`.
 *
 * Usage:
 * ```ts
 * import { NotabeneTravelRuleProvider } from "@flowlink/integrations/notabene";
 * import { ProofLinkEngine, loadConfig } from "@flowlink/core";
 *
 * const provider = new NotabeneTravelRuleProvider({
 *   apiKey: process.env.NOTABENE_API_KEY!,
 *   vaspDID: process.env.NOTABENE_VASP_DID!,
 * });
 * const engine = new ProofLinkEngine(loadConfig(), { travelRuleProvider: provider });
 * ```
 */
export class NotabeneTravelRuleProvider implements TravelRuleProvider {
  private readonly client: NotabeneClient;

  constructor(config: NotabeneConfig, http?: HttpClient) {
    this.client = new NotabeneClient(config, http);
  }

  /**
   * Transmit IVMS101 message via the Notabene Gateway API.
   *
   * Adapts the `@flowlink/core` IVMS101Message format to the Notabene
   * transfer payload and returns the reference ID on success.
   */
  async transmit(
    message: IVMS101Message,
  ): Promise<{ success: boolean; referenceId?: string; error?: string }> {
    try {
      // Convert IVMS101Message back to TravelRuleData shape for the client
      const data: TravelRuleData = {
        originator: {
          name:
            message.originator.originatorPersons[0]?.naturalPerson?.name ??
            message.originator.originatorPersons[0]?.legalPerson?.name ??
            "Unknown",
          walletAddress: message.originator.accountNumber[0] ?? "",
          physicalAddress:
            message.originator.originatorPersons[0]?.naturalPerson
              ?.geographicAddress,
          nationalId:
            message.originator.originatorPersons[0]?.naturalPerson?.nationalId,
        },
        beneficiary: {
          name:
            message.beneficiary.beneficiaryPersons[0]?.naturalPerson?.name ??
            message.beneficiary.beneficiaryPersons[0]?.legalPerson?.name ??
            "Unknown",
          walletAddress: message.beneficiary.accountNumber[0] ?? "",
        },
        amountUsd: Number.parseFloat(message.transactionAmount),
        asset: message.transactionAsset,
        chain: message.transactionChain,
        direction: "outgoing",
        preTransaction: false,
      };

      const response = await this.client.submitTransfer(data);

      return {
        success: true,
        referenceId: response.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Notabene transmission failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
