import type { AgentInvoice, ComplianceStamp, InvoiceLineItem } from "@flowlink/shared/types";
import {
  type RequestNetworkInvoice,
  type RequestNetworkState,
  type RequestNetworkChain,
  FLOWLINK_TO_RN_CHAIN,
  RN_TO_FLOWLINK_CHAIN,
  STABLECOIN_ADDRESSES,
} from "./types.js";

// ---------------------------------------------------------------------------
// State Mapping
// ---------------------------------------------------------------------------

const FLOWLINK_TO_RN_STATE: Record<string, RequestNetworkState> = {
  DRAFT: "created",
  ISSUED: "created",
  PAID: "paid",
  SETTLED: "paid",
  DISPUTED: "created", // RN has no dispute state — stays created
  CANCELLED: "canceled",
};

const RN_TO_FLOWLINK_STATE: Record<RequestNetworkState, string> = {
  created: "ISSUED",
  accepted: "ISSUED",
  canceled: "CANCELLED",
  paid: "PAID",
  overpaid: "PAID",
  underpaid: "ISSUED", // not fully paid yet
};

// ---------------------------------------------------------------------------
// Adapter Errors
// ---------------------------------------------------------------------------

export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

// ---------------------------------------------------------------------------
// RequestFinanceAdapter
// ---------------------------------------------------------------------------

export class RequestFinanceAdapter {
  /**
   * Convert a FlowLink AgentInvoice to a Request Network invoice format.
   * Used when publishing a FlowLink invoice to Request Network.
   */
  toRequestNetwork(invoice: AgentInvoice): RequestNetworkInvoice {
    const chain = this.resolveRNChain(invoice);
    const currencyAddress = this.resolveCurrencyAddress(
      invoice.currency,
      chain,
    );

    const invoiceItems = invoice.lineItems.map((item) => ({
      name: item.description,
      quantity: item.quantity,
      unitPrice: String(Math.round(item.unitPrice * 100)), // cents
      currency: invoice.currency,
    }));

    const contentData: RequestNetworkInvoice["contentData"] = {
      reason: `FlowLink Invoice ${invoice.invoiceId}`,
      createdWith: "FlowLink",
      builderId: "flowlink-integration",
      invoiceNumber: invoice.invoiceId,
      invoiceItems,
      ...(invoice.dueDate ? { dueDate: invoice.dueDate } : {}),
    };

    // Attach seller info
    if (invoice.seller.legalName ?? invoice.seller.taxId) {
      contentData.sellerInfo = {
        ...(invoice.seller.legalName
          ? { businessName: invoice.seller.legalName }
          : {}),
        ...(invoice.seller.taxId
          ? { taxRegistration: invoice.seller.taxId }
          : {}),
      };
    }

    // Attach buyer info
    if (invoice.buyer.legalName ?? invoice.buyer.taxId) {
      contentData.buyerInfo = {
        ...(invoice.buyer.legalName
          ? { businessName: invoice.buyer.legalName }
          : {}),
        ...(invoice.buyer.taxId
          ? { taxRegistration: invoice.buyer.taxId }
          : {}),
      };
    }

    // Map compliance stamp to RN extension data
    if (invoice.complianceStamp) {
      contentData.flowlinkCompliance =
        this.complianceStampToExtension(invoice.complianceStamp);
    }

    // Amount in smallest unit (e.g. 6 decimals for USDC)
    const decimals = this.getDecimals(invoice.currency);
    const expectedAmount = String(
      Math.round(invoice.totalAmount * 10 ** decimals),
    );

    return {
      requestId: `fl-${invoice.invoiceId}`,
      version: "0.62.0",
      state: FLOWLINK_TO_RN_STATE[invoice.state] ?? "created",
      payee: {
        type: "ethereumAddress",
        value: invoice.seller.walletAddress,
      },
      payer: {
        type: "ethereumAddress",
        value: invoice.buyer.walletAddress,
      },
      currency: {
        type: currencyAddress ? "ERC20" : "ISO4217",
        value: currencyAddress ?? invoice.currency,
        network: chain,
        decimals,
      },
      expectedAmount,
      timestamp: Math.floor(new Date(invoice.createdAt).getTime() / 1000),
      creationDate: invoice.createdAt,
      paymentDueDate: invoice.dueDate,
      contentData,
      ...(invoice.invoiceUrl ? { ipfsCid: invoice.invoiceUrl } : {}),
    };
  }

  /**
   * Convert a Request Network invoice to a FlowLink AgentInvoice.
   * Used when ingesting an existing RN invoice into FlowLink for compliance.
   */
  fromRequestNetwork(rnInvoice: RequestNetworkInvoice): AgentInvoice {
    const currency = this.resolveFlowLinkCurrency(rnInvoice);
    const decimals = this.getDecimals(currency);
    const totalAmount = Number(rnInvoice.expectedAmount) / 10 ** decimals;

    const lineItems: InvoiceLineItem[] =
      rnInvoice.contentData?.invoiceItems?.map((item) => ({
        description: item.name,
        quantity: item.quantity,
        unit: "unit",
        unitPrice: Number(item.unitPrice) / 100,
        total: (item.quantity * Number(item.unitPrice)) / 100,
      })) ?? [
        {
          description:
            rnInvoice.contentData?.reason ?? "Request Network payment",
          quantity: 1,
          unit: "unit",
          unitPrice: totalAmount,
          total: totalAmount,
        },
      ];

    const now = new Date().toISOString();
    const createdAt = rnInvoice.creationDate ?? now;
    const state = RN_TO_FLOWLINK_STATE[rnInvoice.state] ?? "ISSUED";

    // Extract compliance data if FlowLink previously attached it
    const flCompliance = rnInvoice.contentData?.flowlinkCompliance;
    const complianceStamp = flCompliance
      ? this.extensionToComplianceStamp(flCompliance)
      : undefined;

    return {
      "@context": [
        "https://schema.org",
        "https://flowlink.io/invoices/v1",
      ],
      "@type": "Invoice",
      invoiceId: rnInvoice.contentData?.invoiceNumber ?? rnInvoice.requestId,
      state: state as AgentInvoice["state"],
      seller: {
        walletAddress: rnInvoice.payee.value,
        legalName: rnInvoice.contentData?.sellerInfo?.businessName,
        taxId: rnInvoice.contentData?.sellerInfo?.taxRegistration,
      },
      buyer: {
        walletAddress: rnInvoice.payer.value,
        legalName: rnInvoice.contentData?.buyerInfo?.businessName,
        taxId: rnInvoice.contentData?.buyerInfo?.taxRegistration,
      },
      lineItems,
      currency: currency as AgentInvoice["currency"],
      totalAmount,
      anchoredOnChain: true, // RN invoices are always on-chain (IPFS + Gnosis)
      ...(complianceStamp ? { complianceStamp } : {}),
      ...(rnInvoice.ipfsCid ? { invoiceUrl: rnInvoice.ipfsCid } : {}),
      ...(rnInvoice.paymentDueDate
        ? { dueDate: rnInvoice.paymentDueDate }
        : {}),
      createdAt,
      updatedAt: now,
    };
  }

  /**
   * Sync invoice state from Request Network to FlowLink.
   * Returns the updated FlowLink state and whether it changed.
   */
  syncState(
    currentFlowLinkState: string,
    rnState: RequestNetworkState,
  ): { newState: string; changed: boolean } {
    const mapped = RN_TO_FLOWLINK_STATE[rnState] ?? currentFlowLinkState;
    return {
      newState: mapped,
      changed: mapped !== currentFlowLinkState,
    };
  }

  /**
   * Map a FlowLink ComplianceStamp to Request Network content extension data.
   */
  complianceStampToExtension(
    stamp: ComplianceStamp,
  ): NonNullable<
    NonNullable<RequestNetworkInvoice["contentData"]>["flowlinkCompliance"]
  > {
    return {
      proofLinkReceiptId: stamp.proofLinkReceiptId,
      complianceStatus: "verified",
      sanctionsCleared: stamp.sanctionsCleared,
      travelRuleTransmitted: stamp.travelRuleTransmitted,
      amlRiskScore: stamp.amlRiskScore,
      easAttestationUid: stamp.easAttestationUid,
    };
  }

  /**
   * Map Request Network compliance extension back to FlowLink ComplianceStamp.
   */
  extensionToComplianceStamp(
    ext: NonNullable<
      NonNullable<RequestNetworkInvoice["contentData"]>["flowlinkCompliance"]
    >,
  ): ComplianceStamp | undefined {
    if (!ext.proofLinkReceiptId) return undefined;

    return {
      proofLinkReceiptId: ext.proofLinkReceiptId,
      sanctionsCleared: ext.sanctionsCleared ?? false,
      travelRuleTransmitted: ext.travelRuleTransmitted ?? false,
      amlRiskScore: ext.amlRiskScore,
      easAttestationUid: ext.easAttestationUid,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private resolveRNChain(invoice: AgentInvoice): RequestNetworkChain {
    // If payment proof has chain info, use it
    if (invoice.paymentProof?.chain) {
      const mapped =
        FLOWLINK_TO_RN_CHAIN[invoice.paymentProof.chain];
      if (mapped) return mapped;
    }
    // Default to mainnet
    return "mainnet";
  }

  private resolveCurrencyAddress(
    currency: string,
    chain: RequestNetworkChain,
  ): string | undefined {
    return STABLECOIN_ADDRESSES[chain]?.[currency];
  }

  private resolveFlowLinkCurrency(rnInvoice: RequestNetworkInvoice): string {
    if (rnInvoice.currency.type === "ISO4217") {
      return rnInvoice.currency.value; // USD, EUR, etc.
    }

    // Reverse-lookup ERC20 address to symbol
    const chainAddresses =
      STABLECOIN_ADDRESSES[rnInvoice.currency.network];
    if (chainAddresses) {
      for (const [symbol, address] of Object.entries(chainAddresses)) {
        if (address.toLowerCase() === rnInvoice.currency.value.toLowerCase()) {
          return symbol;
        }
      }
    }

    // Fallback: check invoiceItems currency
    const itemCurrency =
      rnInvoice.contentData?.invoiceItems?.[0]?.currency;
    if (itemCurrency) return itemCurrency;

    return "USDC"; // safe default for stablecoin-dominant ecosystem
  }

  private getDecimals(currency: string): number {
    switch (currency) {
      case "USDC":
      case "USDT":
      case "EURC":
        return 6;
      case "USD":
      case "EUR":
      case "GBP":
        return 2;
      default:
        return 18;
    }
  }
}
