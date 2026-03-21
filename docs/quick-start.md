# Quick Start

Get up and running with FlowLink in under 5 minutes.

## Install

```bash
npm install @flowlink/sdk
```

## Initialize the client

```ts
import { FlowLinkClient } from "@flowlink/sdk";

const flowlink = new FlowLinkClient({ apiKey: "fl_live_your_api_key" });
```

| Option       | Default                          | Description                          |
|-------------|----------------------------------|--------------------------------------|
| `apiKey`    | --                               | Your FlowLink API key (required)     |
| `baseUrl`   | `https://api.flowlink.io/v1`     | Override for self-hosted deployments |
| `timeoutMs` | `30000`                          | Request timeout in milliseconds      |
| `maxRetries`| `3`                              | Auto-retries on transient errors     |

---

## Screen an address

Check a wallet against OFAC, EU, UN, and HMT sanctions lists.

```ts
const result = await flowlink.screenAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68", "base");
console.log(result.matched); // false
```

---

## Run a full compliance check

Run sanctions screening, AML scoring, travel-rule transmission, and jurisdictional checks in one call.

```ts
const decision = await flowlink.checkCompliance({
  senderAddress: "0xAlice",
  recipientAddress: "0xBob",
  amount: 5000,
  currency: "USDC",
  chain: "base",
});
console.log(decision.status);    // "APPROVED"
console.log(decision.riskScore); // 12
```

---

## Create an invoice

Generate a compliance-stamped invoice for agent-to-agent services.

```ts
const invoice = await flowlink.createInvoice({
  seller: {
    walletAddress: "0xAlice",
    agentId: "did:flowlink:agent:data-processor",
    legalName: "DataCo AI",
  },
  buyer: {
    walletAddress: "0xBob",
    legalName: "Acme Corp",
  },
  lineItems: [
    {
      description: "Data analysis - 10k records",
      quantity: 1,
      unitPrice: 250,
      total: 250,
      serviceCategory: "analysis",
    },
  ],
  currency: "USDC",
  totalAmount: 250,
  paymentProtocol: "x402",
});
console.log(invoice.id);    // "a1b2c3d4-..."
console.log(invoice.state); // "DRAFT"
```

---

## Full flow: screen, check compliance, invoice, and settle

End-to-end example: verify the counterparty, run compliance, create an invoice, and transition it through settlement.

```ts
import { FlowLinkClient } from "@flowlink/sdk";

const flowlink = new FlowLinkClient({ apiKey: process.env.FLOWLINK_API_KEY! });

// 1. Screen the recipient
const screen = await flowlink.screenAddress("0xBob", "base");
if (screen.matched) {
  throw new Error(`Recipient sanctioned: ${JSON.stringify(screen.matchDetails)}`);
}

// 2. Verify the agent (if counterparty is an AI agent)
const verification = await flowlink.verifyAgent("did:flowlink:agent:bob-bot");
if (!verification.verified) {
  throw new Error("Agent KYA verification failed");
}

// 3. Run full compliance check
const decision = await flowlink.checkCompliance({
  senderAddress: "0xAlice",
  recipientAddress: "0xBob",
  amount: 5000,
  currency: "USDC",
  chain: "base",
});
if (decision.status === "REJECTED") {
  throw new Error(`Compliance rejected: risk score ${decision.riskScore}`);
}

// 4. Create the invoice
const invoice = await flowlink.createInvoice({
  seller: { walletAddress: "0xAlice", agentId: "did:flowlink:agent:alice-bot" },
  buyer: { walletAddress: "0xBob", agentId: "did:flowlink:agent:bob-bot" },
  lineItems: [
    { description: "GPU compute - 2 hours", quantity: 2, unitPrice: 2500, total: 5000, serviceCategory: "compute" },
  ],
  currency: "USDC",
  totalAmount: 5000,
  paymentProtocol: "x402",
});

// 5. Issue -> Pay -> Settle
await flowlink.updateInvoiceState(invoice.id, "ISSUED");
// ... execute payment via x402 ...
await flowlink.updateInvoiceState(invoice.id, "PAID");
await flowlink.updateInvoiceState(invoice.id, "SETTLED");

// 6. Retrieve the compliance receipt
const receipt = await flowlink.getReceipt(decision.receiptId);
console.log("ProofLink hash:", receipt.receiptHash);
```

---

## Next steps

- [API Reference](./api-reference.md) -- every endpoint, field, and error code
- [x402 Integration](./x402-integration.md) -- add compliance to x402 payment servers
- [MCP Integration](./mcp-integration.md) -- give Claude and LangChain agents compliance tools
- [Request Finance Integration](./request-finance-integration.md) -- bridge to Request Network invoicing
