# Request Finance Integration

FlowLink bridges the gap between AI agent payments and enterprise accounts payable by integrating with [Request Finance](https://www.request.finance/) and the [Request Network](https://request.network/). This guide covers how to add compliance checks to Request Network payments, convert between invoice formats, and set up the compliance bridge.

## How it works

```
AI Agent (x402/MCP)
      |
      v
  FlowLink API  ------>  Compliance Pipeline
      |                   (sanctions, AML, travel rule)
      v
  Invoice created  ---->  Request Network
      |                   (on-chain invoice)
      v
  Payment settled  ---->  Request Finance
                          (enterprise AP/AR dashboard)
```

FlowLink acts as a compliance layer between agent-initiated payments and Request Finance:

1. **Agent creates invoice** via FlowLink (SDK or MCP tool)
2. **FlowLink runs compliance** on both parties
3. **Invoice is published** to the Request Network in ERC-20 format
4. **Payment is executed** via x402 or direct transfer
5. **Settlement is recorded** on Request Finance for enterprise reporting

---

## Adding compliance to Request Network payments

### Install dependencies

```bash
npm install @flowlink/sdk @requestnetwork/request-client.js @requestnetwork/payment-processor
```

### Screen before creating a Request

```ts
import { FlowLinkClient } from "@flowlink/sdk";
import { RequestNetwork, Types } from "@requestnetwork/request-client.js";

const flowlink = new FlowLinkClient({ apiKey: process.env.FLOWLINK_API_KEY! });

// 1. Run compliance check before creating the request
const decision = await flowlink.checkCompliance({
  senderAddress: "0xBuyer",
  recipientAddress: "0xSeller",
  amount: 5000,
  currency: "USDC",
  chain: "base",
});

if (decision.status === "REJECTED") {
  throw new Error(`Compliance rejected: risk ${decision.riskScore}`);
}

// 2. Create invoice in FlowLink (with compliance receipt)
const invoice = await flowlink.createInvoice({
  seller: { walletAddress: "0xSeller", legalName: "DataCo AI" },
  buyer: { walletAddress: "0xBuyer", legalName: "Acme Corp" },
  lineItems: [
    { description: "API calls", quantity: 10000, unitPrice: 0.01, total: 100, serviceCategory: "api_call" },
  ],
  currency: "USDC",
  totalAmount: 100,
  paymentProtocol: "x402",
});

// 3. Create the corresponding Request Network invoice
const requestClient = new RequestNetwork({
  nodeConnectionConfig: { baseURL: "https://gnosis.gateway.request.network/" },
});

const request = await requestClient.createRequest({
  requestInfo: {
    currency: { type: Types.RequestLogic.CURRENCY.ERC20, value: "0xUSDC_ADDRESS", network: "base" },
    expectedAmount: "100000000", // 100 USDC (6 decimals)
    payee: { type: Types.Identity.TYPE.ETHEREUM_ADDRESS, value: "0xSeller" },
    payer: { type: Types.Identity.TYPE.ETHEREUM_ADDRESS, value: "0xBuyer" },
  },
  paymentNetwork: {
    id: Types.Extension.PAYMENT_NETWORK_ID.ERC20_FEE_PROXY_CONTRACT,
    parameters: { paymentAddress: "0xSeller" },
  },
  contentData: {
    reason: "API calls - 10k requests",
    flowlinkInvoiceId: invoice.id,
    flowlinkReceiptId: decision.receiptId,
    complianceStatus: decision.status,
  },
  signer: { type: Types.Identity.TYPE.ETHEREUM_ADDRESS, value: "0xBuyer" },
});
```

The `contentData.flowlinkInvoiceId` and `contentData.flowlinkReceiptId` fields link the Request Network invoice to the FlowLink compliance record, creating an auditable chain.

---

## Invoice format conversion

FlowLink invoices use a JSON structure optimized for agent-to-agent commerce. Convert between FlowLink and Request Network formats.

### FlowLink to Request Network

```ts
import type { CreateInvoiceParams } from "@flowlink/sdk";

function toRequestNetworkInvoice(flowlinkInvoice: {
  id: string;
  sellerWalletAddress: string;
  buyerWalletAddress: string;
  totalAmount: string;
  currency: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}) {
  return {
    requestInfo: {
      currency: {
        type: "ERC20" as const,
        value: getCurrencyAddress(flowlinkInvoice.currency),
        network: "base",
      },
      expectedAmount: toSmallestUnit(flowlinkInvoice.totalAmount, flowlinkInvoice.currency),
      payee: { type: "ethereumAddress" as const, value: flowlinkInvoice.sellerWalletAddress },
      payer: { type: "ethereumAddress" as const, value: flowlinkInvoice.buyerWalletAddress },
    },
    contentData: {
      invoiceItems: flowlinkInvoice.lineItems.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice * 1e8), // Request uses 8 decimals for content
        currency: flowlinkInvoice.currency,
        tax: { type: "percentage", amount: "0" },
      })),
      flowlinkInvoiceId: flowlinkInvoice.id,
      meta: { format: "rnf_invoice", version: "0.0.3" },
    },
  };
}

function getCurrencyAddress(symbol: string): string {
  const addresses: Record<string, string> = {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
    USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // Base USDT
  };
  return addresses[symbol] ?? "";
}

function toSmallestUnit(amount: string, currency: string): string {
  const decimals = ["USDC", "USDT"].includes(currency) ? 6 : 18;
  return String(Math.round(Number(amount) * 10 ** decimals));
}
```

### Request Network to FlowLink

```ts
function toFlowLinkInvoice(request: {
  requestId: string;
  payee: { value: string };
  payer: { value: string };
  expectedAmount: string;
  currency: { value: string };
  contentData?: { invoiceItems?: Array<{ name: string; quantity: number; unitPrice: string }> };
}) {
  const items = request.contentData?.invoiceItems ?? [];
  const currency = getSymbol(request.currency.value);

  return {
    seller: { walletAddress: request.payee.value },
    buyer: { walletAddress: request.payer.value },
    lineItems: items.map((item) => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice) / 1e8,
      total: item.quantity * (Number(item.unitPrice) / 1e8),
    })),
    currency,
    totalAmount: Number(request.expectedAmount) / 1e6,
  };
}

function getSymbol(address: string): string {
  const symbols: Record<string, string> = {
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "USDC",
    "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2": "USDT",
  };
  return symbols[address] ?? "USDC";
}
```

---

## Compliance bridge setup

The compliance bridge watches for new Request Network invoices and automatically runs FlowLink compliance checks.

```ts
import { FlowLinkClient } from "@flowlink/sdk";
import { RequestNetwork } from "@requestnetwork/request-client.js";

const flowlink = new FlowLinkClient({ apiKey: process.env.FLOWLINK_API_KEY! });
const requestClient = new RequestNetwork({
  nodeConnectionConfig: { baseURL: "https://gnosis.gateway.request.network/" },
});

async function processNewRequest(requestId: string) {
  const request = await requestClient.fromRequestId(requestId);
  const data = request.getData();

  // Skip if already compliance-checked
  if (data.contentData?.flowlinkReceiptId) {
    console.log(`Request ${requestId} already has compliance receipt`);
    return;
  }

  // Run compliance check
  const decision = await flowlink.checkCompliance({
    senderAddress: data.payer?.value ?? "",
    recipientAddress: data.payee?.value ?? "",
    amount: Number(data.expectedAmount) / 1e6, // assumes 6-decimal stablecoin
    currency: getSymbol(data.currency?.value ?? ""),
    chain: "base",
  });

  // Create mirror invoice in FlowLink
  const invoice = await flowlink.createInvoice({
    seller: { walletAddress: data.payee?.value ?? "" },
    buyer: { walletAddress: data.payer?.value ?? "" },
    lineItems: [
      {
        description: `Request Network invoice ${requestId}`,
        quantity: 1,
        unitPrice: Number(data.expectedAmount) / 1e6,
        total: Number(data.expectedAmount) / 1e6,
      },
    ],
    currency: "USDC",
    totalAmount: Number(data.expectedAmount) / 1e6,
  });

  console.log(`Compliance ${decision.status} for request ${requestId}`);
  console.log(`FlowLink invoice: ${invoice.id}, receipt: ${decision.receiptId}`);

  return { decision, invoice };
}
```

### Webhook integration

If you use Request Finance's webhook notifications, add FlowLink compliance as a middleware:

```ts
import express from "express";
import { FlowLinkClient } from "@flowlink/sdk";

const app = express();
const flowlink = new FlowLinkClient({ apiKey: process.env.FLOWLINK_API_KEY! });

app.post("/webhooks/request-finance", express.json(), async (req, res) => {
  const { requestId, event } = req.body;

  if (event === "payment.created") {
    const result = await processNewRequest(requestId);

    if (result?.decision.status === "REJECTED") {
      // Notify your AP team to hold payment
      await notifyAPTeam({
        requestId,
        reason: `Compliance rejected: risk score ${result.decision.riskScore}`,
      });
      return res.json({ action: "hold" });
    }
  }

  res.json({ action: "proceed" });
});
```

---

## Architecture overview

```
                      +-------------------+
                      | Request Finance   |
                      | (Enterprise UI)   |
                      +--------+----------+
                               |
                      +--------v----------+
                      | Request Network   |
                      | (On-chain invoice) |
                      +--------+----------+
                               |
                      +--------v----------+
                      | Compliance Bridge  |
                      | (your server)      |
                      +--------+----------+
                               |
              +----------------+----------------+
              |                                 |
     +--------v----------+           +----------v--------+
     | FlowLink API      |           | x402 Payments     |
     | - Sanctions        |           | - Stablecoin      |
     | - AML scoring      |           |   settlement      |
     | - Travel rule      |           | - ProofLink       |
     | - KYA verification |           |   receipts        |
     +--------------------+           +-------------------+
```

---

## Next steps

- [API Reference](./api-reference.md) -- full REST API documentation
- [x402 Integration](./x402-integration.md) -- compliance middleware for x402 servers
- [Quick Start](./quick-start.md) -- SDK setup and basic usage
- [MCP Integration](./mcp-integration.md) -- give AI agents compliance tools
