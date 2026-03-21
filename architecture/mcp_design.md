# FlowLink MCP Server Design
**Version:** 1.0
**Date:** March 20, 2026
**Status:** Architecture Design

---

## 1. Executive Summary

FlowLink should expose its ProofLink compliance engine as an MCP (Model Context Protocol)
server. This turns FlowLink from a product into infrastructure — any AI agent framework
(LangChain, OpenAI Agents SDK, Vercel AI SDK, Claude, Gemini) can call FlowLink's
compliance tools natively, with zero custom integration code.

The strategic insight: Coinbase's Payments MCP handles *payment execution* (wallets,
x402, onramps). There is no MCP server that handles *payment compliance* (sanctions
screening, KYA, travel rule, AML). FlowLink fills this gap.

---

## 2. Landscape: Existing MCP Payment Servers

### 2.1 Coinbase Payments MCP
**Source:** https://github.com/coinbase/payments-mcp

The most significant existing payment MCP. Install via `npx @coinbase/payments-mcp`.
Combines: embedded wallet management, x402 autonomous payment execution, and USDC
onramps. It handles the *send money* side of agentic commerce.

What it does NOT do:
- Sanctions screening (OFAC/EU/UN/HMT)
- KYA/KYC identity verification
- FATF Travel Rule data transmission
- AML transaction monitoring
- Compliance receipt generation
- Any regulatory audit trail

### 2.2 Coinbase x402 MCP Example
**Source:** https://docs.cdp.coinbase.com/x402/mcp-server

Exposes a single tool: `get-data-from-resource-server`. Acts as middleware that
intercepts HTTP 402 responses, auto-signs payment headers, and retries the request.
Useful for paying x402-gated APIs. No compliance layer.

### 2.3 Paytm Payment MCP
**Source:** https://github.com/paytm/payment-mcp-server

11 tools covering payment links, transactions, refunds, and settlements. Traditional
payment processor API exposed as MCP. India-focused. No crypto, no compliance.

### 2.4 Sanctions MCP (FlowHunt)
**Source:** https://www.flowhunt.io/mcp-servers/mcp-sanctions/

Single tool: screen an entity against OFAC SDN, UN, and OFSI lists. Uses OFAC API.
This is the closest existing analog to one FlowLink tool — but covers only one of
FlowLink's six compliance capabilities and has no payment integration.

### 2.5 Gap Analysis

| Capability | Coinbase MCP | Paytm MCP | Sanctions MCP | FlowLink MCP |
|------------|-------------|-----------|---------------|--------------|
| Payment execution | YES | YES | NO | YES (via x402) |
| Sanctions screening | NO | NO | Partial | YES (full lists) |
| KYA/agent identity | NO | NO | NO | YES (ERC-8004) |
| Travel Rule | NO | NO | NO | YES |
| AML monitoring | NO | NO | NO | YES |
| Compliance receipts | NO | NO | NO | YES |
| Crypto-native | YES | NO | NO | YES |

**FlowLink's MCP server is the compliance layer that Coinbase's MCP server is missing.**
The natural integration is: Coinbase Payments MCP (execution) + FlowLink MCP (compliance)
= a complete, enterprise-grade agentic payment stack.

---

## 3. MCP Specification Reference

### 3.1 Protocol Basics

MCP (Model Context Protocol, spec version 2025-11-25) is a JSON-RPC 2.0 protocol.
Servers declare a `tools` capability. Clients discover tools via `tools/list` and
invoke them via `tools/call`. The transport is either stdio (local subprocess) or
HTTP Streamable / SSE (remote).

**Tool structure:**

```json
{
  "name": "tool_name",
  "title": "Human-readable display name",
  "description": "What this tool does",
  "inputSchema": {
    "type": "object",
    "properties": { ... },
    "required": ["field1", "field2"]
  },
  "outputSchema": {
    "type": "object",
    "properties": { ... },
    "required": ["field1"]
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}
```

**Execution error (not a protocol error):**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [{ "type": "text", "text": "Sanctioned address detected: ..." }],
    "structuredContent": { "blocked": true, "reason": "OFAC_SDN_MATCH" },
    "isError": true
  }
}
```

The `isError: true` pattern is critical for compliance: it tells the LLM the tool ran
successfully but the compliance check failed — enabling the agent to self-correct
(cancel payment, notify user, escalate).

### 3.2 Security Requirements (from spec)

Servers MUST validate all inputs. For a compliance server, this is non-negotiable:
- Reject malformed addresses before hitting screening APIs
- Rate-limit per client to prevent enumeration attacks
- Log all tool invocations for audit (the spec recommends this for clients too)
- Require authentication headers (Bearer token per FlowLink API key)

---

## 4. FlowLink MCP Server: Tool Definitions

Server name: `flowlink-compliance`
Base URL: `https://mcp.flowlink.io/v1`
Auth: Bearer token in `Authorization` header (per FlowLink API key)

### 4.1 `check_sanctions`

Screen a blockchain address or entity name against global sanctions lists.

```json
{
  "name": "check_sanctions",
  "title": "Sanctions Screen",
  "description": "Screen a blockchain address or entity name against OFAC SDN, EU Consolidated, UN Consolidated, and HMT sanctions lists. Returns match status, risk score, and matched list entries. Call this before any payment to a new counterparty.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "address": {
        "type": "string",
        "description": "Blockchain wallet address to screen (e.g. 0x... for EVM, base58 for Solana). Mutually exclusive with entity_name."
      },
      "entity_name": {
        "type": "string",
        "description": "Legal name of person or company to screen. Mutually exclusive with address."
      },
      "chain": {
        "type": "string",
        "enum": ["ethereum", "base", "solana", "polygon", "arbitrum"],
        "description": "Blockchain network. Required when address is provided."
      },
      "include_indirect": {
        "type": "boolean",
        "default": false,
        "description": "If true, screen addresses one hop away (counterparty exposure analysis). Increases latency ~200ms."
      }
    },
    "oneOf": [
      { "required": ["address", "chain"] },
      { "required": ["entity_name"] }
    ],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "cleared": {
        "type": "boolean",
        "description": "True if no sanctions match found. False means DO NOT PROCEED with payment."
      },
      "risk_score": {
        "type": "number",
        "minimum": 0,
        "maximum": 100,
        "description": "0 = clean, 100 = direct sanctions match."
      },
      "matches": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "list": { "type": "string", "enum": ["OFAC_SDN", "EU_CONSOLIDATED", "UN_CONSOLIDATED", "HMT"] },
            "entry_id": { "type": "string" },
            "name": { "type": "string" },
            "match_confidence": { "type": "number" }
          }
        }
      },
      "screened_at": {
        "type": "string",
        "format": "date-time",
        "description": "ISO 8601 timestamp of the screening."
      },
      "receipt_id": {
        "type": "string",
        "description": "Unique ID for this screening result. Reference this in compliance_receipt calls."
      }
    },
    "required": ["cleared", "risk_score", "matches", "screened_at", "receipt_id"]
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}
```

**Example call:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_sanctions",
    "arguments": {
      "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "chain": "ethereum"
    }
  }
}
```

**Example response (cleared):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{"type": "text", "text": "Address cleared. Risk score: 2/100. No sanctions matches."}],
    "structuredContent": {
      "cleared": true,
      "risk_score": 2,
      "matches": [],
      "screened_at": "2026-03-20T14:23:01Z",
      "receipt_id": "scr_01HW4K9X7MNPQ3R5T6V8Y"
    },
    "isError": false
  }
}
```

**Example response (blocked):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{"type": "text", "text": "BLOCKED: Address matches OFAC SDN list entry #12847. Do not proceed with payment."}],
    "structuredContent": {
      "cleared": false,
      "risk_score": 98,
      "matches": [{"list": "OFAC_SDN", "entry_id": "12847", "name": "ENTITY XYZ", "match_confidence": 0.97}],
      "screened_at": "2026-03-20T14:23:05Z",
      "receipt_id": "scr_01HW4K9X7MNPQ3R5T6W9Z"
    },
    "isError": true
  }
}
```

---

### 4.2 `verify_kya`

Verify an AI agent's identity and compliance standing via ERC-8004 registry.

```json
{
  "name": "verify_kya",
  "title": "Know Your Agent Verification",
  "description": "Verify an AI agent's identity, authorization, and compliance standing. Resolves ERC-8004 registry data, checks operator identity, spending authorization scope, and FlowLink validation score. Use before accepting payment from or delegating tasks to an unknown agent.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agent_id": {
        "type": "string",
        "description": "ERC-8004 agent identifier in format {namespace}:{chainId}:{identityRegistry} or raw tokenId."
      },
      "agent_wallet": {
        "type": "string",
        "description": "Agent's on-chain wallet address. Used to cross-verify against ERC-8004 agentWallet field."
      },
      "operator_did": {
        "type": "string",
        "description": "DID of the human or org operating this agent. Optional — enables operator screening."
      },
      "check_spending_limits": {
        "type": "boolean",
        "default": true,
        "description": "If true, retrieve and return the agent's authorized spending limits from ERC-8004 registration."
      }
    },
    "required": ["agent_id"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "verified": {
        "type": "boolean",
        "description": "True if agent passes FlowLink KYA verification."
      },
      "trust_score": {
        "type": "number",
        "minimum": 0,
        "maximum": 100,
        "description": "Composite trust score from ERC-8004 Reputation + FlowLink Validation Registry."
      },
      "agent_metadata": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "type": { "type": "string", "enum": ["autonomous", "semi-autonomous", "human-supervised"] },
          "operator": { "type": "string" },
          "registered_at": { "type": "string", "format": "date-time" },
          "x402_support": { "type": "boolean" }
        }
      },
      "operator_status": {
        "type": "object",
        "properties": {
          "sanctions_cleared": { "type": "boolean" },
          "kyc_verified": { "type": "boolean" }
        }
      },
      "spending_limits": {
        "type": "object",
        "properties": {
          "per_transaction_usd": { "type": "number" },
          "daily_usd": { "type": "number" },
          "allowed_chains": { "type": "array", "items": { "type": "string" } },
          "allowed_currencies": { "type": "array", "items": { "type": "string" } }
        }
      },
      "validation_evidence": {
        "type": "string",
        "description": "URI to ERC-8004 Validation Registry evidence (TEE attestation, auditor report, etc.)."
      },
      "receipt_id": { "type": "string" }
    },
    "required": ["verified", "trust_score", "agent_metadata", "receipt_id"]
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}
```

---

### 4.3 `create_compliant_invoice`

Generate a structured, compliance-stamped invoice for agent-rendered services.

```json
{
  "name": "create_compliant_invoice",
  "title": "Create Compliant Invoice",
  "description": "Generate a machine-readable, compliance-stamped invoice for services rendered by or to an AI agent. Produces a JSON-LD invoice anchored on-chain with a FlowLink compliance stamp. Required for enterprise AP integration and regulatory audit trails. This is the missing link between x402 payment receipts and enterprise accounting systems.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "seller": {
        "type": "object",
        "description": "Service provider (may be an AI agent).",
        "properties": {
          "agent_id": { "type": "string", "description": "ERC-8004 agent ID, if seller is an agent." },
          "wallet_address": { "type": "string" },
          "legal_name": { "type": "string" },
          "tax_id": { "type": "string", "description": "VAT/EIN/TIN for fiat invoicing." }
        },
        "required": ["wallet_address"]
      },
      "buyer": {
        "type": "object",
        "description": "Payment recipient (may be an AI agent or human/org).",
        "properties": {
          "agent_id": { "type": "string" },
          "wallet_address": { "type": "string" },
          "legal_name": { "type": "string" },
          "tax_id": { "type": "string" }
        },
        "required": ["wallet_address"]
      },
      "line_items": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "object",
          "properties": {
            "description": { "type": "string" },
            "quantity": { "type": "number" },
            "unit_price_usd": { "type": "number" },
            "service_category": {
              "type": "string",
              "enum": ["compute", "data", "api_call", "content_generation", "analysis", "transaction_fee", "other"]
            }
          },
          "required": ["description", "quantity", "unit_price_usd"]
        }
      },
      "currency": {
        "type": "string",
        "enum": ["USDC", "USDT", "USD", "EUR", "GBP"],
        "default": "USDC"
      },
      "payment_protocol": {
        "type": "string",
        "enum": ["x402", "mpp", "ap2", "acp", "direct"],
        "description": "Which payment protocol will be used to settle this invoice."
      },
      "work_proof": {
        "type": "string",
        "description": "Optional: URI or hash proving service was delivered (ERC-8183 evaluator attestation, IPFS CID, etc.)."
      },
      "due_date": {
        "type": "string",
        "format": "date-time",
        "description": "Payment due date. Omit for immediate payment."
      },
      "anchor_on_chain": {
        "type": "boolean",
        "default": true,
        "description": "If true, anchors invoice hash on Base via Ethereum Attestation Service."
      }
    },
    "required": ["seller", "buyer", "line_items", "currency"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "invoice_id": { "type": "string" },
      "invoice_url": { "type": "string", "format": "uri", "description": "IPFS/Arweave URI for the full JSON-LD invoice." },
      "total_amount": { "type": "number" },
      "currency": { "type": "string" },
      "compliance_stamp": {
        "type": "object",
        "properties": {
          "seller_cleared": { "type": "boolean" },
          "buyer_cleared": { "type": "boolean" },
          "travel_rule_required": { "type": "boolean" },
          "eas_attestation_uid": { "type": "string", "description": "Ethereum Attestation Service UID if anchored." }
        }
      },
      "payment_instructions": {
        "type": "object",
        "properties": {
          "x402_endpoint": { "type": "string" },
          "wallet_address": { "type": "string" },
          "memo": { "type": "string" }
        }
      },
      "receipt_id": { "type": "string" }
    },
    "required": ["invoice_id", "invoice_url", "total_amount", "currency", "compliance_stamp", "receipt_id"]
  }
}
```

---

### 4.4 `submit_travel_rule`

Transmit FATF Travel Rule data between VASPs for qualifying transactions.

```json
{
  "name": "submit_travel_rule",
  "title": "Submit Travel Rule Data",
  "description": "Transmit FATF Travel Rule originator/beneficiary information for transactions above the reporting threshold ($1,000 USD or local equivalent). Required for VASP-to-VASP transfers under GENIUS Act, MiCA, and FATF Recommendation 16. Integrates with Notabene and Sygna Bridge for VASP-to-VASP messaging.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "transaction": {
        "type": "object",
        "properties": {
          "tx_hash": { "type": "string", "description": "On-chain transaction hash (may be null for pre-transaction submission)." },
          "amount_usd": { "type": "number", "description": "USD value of the transfer." },
          "asset": { "type": "string", "description": "Token symbol (USDC, USDT, ETH, etc.)." },
          "chain": { "type": "string" },
          "direction": { "type": "string", "enum": ["outgoing", "incoming"] }
        },
        "required": ["amount_usd", "asset", "chain", "direction"]
      },
      "originator": {
        "type": "object",
        "description": "Sending party information.",
        "properties": {
          "name": { "type": "string" },
          "address": { "type": "string", "description": "Physical address." },
          "wallet_address": { "type": "string" },
          "account_number": { "type": "string" },
          "national_id": { "type": "string" },
          "agent_id": { "type": "string", "description": "ERC-8004 ID if originator is an AI agent." },
          "vasp_did": { "type": "string", "description": "VASP DID (FATF-compliant). Required for VASP originator." }
        },
        "required": ["wallet_address"]
      },
      "beneficiary": {
        "type": "object",
        "description": "Receiving party information.",
        "properties": {
          "name": { "type": "string" },
          "wallet_address": { "type": "string" },
          "agent_id": { "type": "string" },
          "vasp_did": { "type": "string" }
        },
        "required": ["wallet_address"]
      },
      "pre_transaction": {
        "type": "boolean",
        "default": false,
        "description": "If true, submit Travel Rule data BEFORE the transaction executes. Required by some jurisdictions."
      }
    },
    "required": ["transaction", "originator", "beneficiary"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "submitted": { "type": "boolean" },
      "travel_rule_id": { "type": "string", "description": "Unique ID for this Travel Rule transmission." },
      "counterparty_vasp_acknowledged": { "type": "boolean" },
      "threshold_exceeded": { "type": "boolean", "description": "True if this transaction required Travel Rule data." },
      "jurisdictions_covered": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of regulatory jurisdictions this submission satisfies."
      },
      "receipt_id": { "type": "string" }
    },
    "required": ["submitted", "travel_rule_id", "threshold_exceeded", "receipt_id"]
  }
}
```

---

### 4.5 `get_compliance_receipt`

Retrieve a cryptographically-signed compliance proof for a completed transaction.

```json
{
  "name": "get_compliance_receipt",
  "title": "Get Compliance Receipt",
  "description": "Retrieve a cryptographically-signed compliance proof for a completed transaction or screening event. Returns a ProofLink receipt containing all compliance checks performed, their results, and an EAS attestation UID for on-chain verification. Use for audit trails, dispute resolution, and enterprise reporting.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "tx_hash": {
        "type": "string",
        "description": "On-chain transaction hash. Provide either this or receipt_id."
      },
      "receipt_id": {
        "type": "string",
        "description": "FlowLink receipt ID from a prior check_sanctions, verify_kya, or create_compliant_invoice call."
      },
      "include_raw_evidence": {
        "type": "boolean",
        "default": false,
        "description": "If true, include full API responses from each compliance provider (Chainalysis, Notabene, etc.)."
      }
    },
    "oneOf": [
      { "required": ["tx_hash"] },
      { "required": ["receipt_id"] }
    ],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "receipt_id": { "type": "string" },
      "prooflink_version": { "type": "string" },
      "transaction": {
        "type": "object",
        "properties": {
          "tx_hash": { "type": "string" },
          "amount_usd": { "type": "number" },
          "timestamp": { "type": "string", "format": "date-time" }
        }
      },
      "checks_performed": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "check_type": {
              "type": "string",
              "enum": ["SANCTIONS_SCREENING", "KYA_VERIFICATION", "TRAVEL_RULE", "AML_MONITORING", "INVOICE_VALIDATION"]
            },
            "result": { "type": "string", "enum": ["PASSED", "FAILED", "SKIPPED"] },
            "performed_at": { "type": "string", "format": "date-time" },
            "provider": { "type": "string" }
          }
        }
      },
      "overall_status": {
        "type": "string",
        "enum": ["COMPLIANT", "BLOCKED", "REVIEW_REQUIRED"]
      },
      "eas_attestation_uid": {
        "type": "string",
        "description": "Ethereum Attestation Service UID. Verify at https://base.easscan.org/attestation/{uid}"
      },
      "receipt_signature": {
        "type": "string",
        "description": "EIP-712 signature of the receipt hash, signed by FlowLink's attestation key."
      },
      "ipfs_cid": {
        "type": "string",
        "description": "IPFS CID of the full compliance report JSON."
      }
    },
    "required": ["receipt_id", "checks_performed", "overall_status", "receipt_signature"]
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}
```

---

### 4.6 `pay_with_compliance`

End-to-end compliant payment: runs all checks, then executes payment via x402.

```json
{
  "name": "pay_with_compliance",
  "title": "Pay With Compliance",
  "description": "Execute an end-to-end compliant stablecoin payment. Automatically runs: (1) sanctions screening on recipient, (2) KYA verification if recipient is an agent, (3) Travel Rule submission if above threshold, (4) payment execution via x402 or specified protocol, (5) compliance receipt generation. This is the single tool for agents that need to pay compliantly without orchestrating the individual steps.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "recipient": {
        "type": "object",
        "properties": {
          "wallet_address": { "type": "string" },
          "agent_id": { "type": "string", "description": "ERC-8004 ID if recipient is an agent." },
          "legal_name": { "type": "string", "description": "Required for Travel Rule if above threshold." }
        },
        "required": ["wallet_address"]
      },
      "amount": {
        "type": "object",
        "properties": {
          "value": { "type": "number", "exclusiveMinimum": 0 },
          "currency": { "type": "string", "enum": ["USDC", "USDT"] }
        },
        "required": ["value", "currency"]
      },
      "chain": {
        "type": "string",
        "enum": ["base", "ethereum", "solana", "polygon"],
        "default": "base"
      },
      "payment_protocol": {
        "type": "string",
        "enum": ["x402", "direct"],
        "default": "x402",
        "description": "x402 is recommended for agent-to-service payments. direct sends to wallet address."
      },
      "memo": {
        "type": "string",
        "maxLength": 256,
        "description": "Payment memo / invoice reference."
      },
      "invoice_id": {
        "type": "string",
        "description": "FlowLink invoice ID from create_compliant_invoice. Links payment to invoice."
      },
      "require_kya": {
        "type": "boolean",
        "default": false,
        "description": "If true and recipient has no valid ERC-8004 registration, payment is blocked."
      },
      "dry_run": {
        "type": "boolean",
        "default": false,
        "description": "If true, run all compliance checks but do not execute the payment. Returns what would happen."
      }
    },
    "required": ["recipient", "amount", "chain"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["COMPLETED", "BLOCKED", "PENDING_REVIEW", "DRY_RUN_PASSED", "DRY_RUN_BLOCKED"]
      },
      "tx_hash": { "type": "string", "description": "On-chain transaction hash. Null if blocked or dry_run." },
      "compliance_summary": {
        "type": "object",
        "properties": {
          "sanctions_cleared": { "type": "boolean" },
          "kya_verified": { "type": "boolean" },
          "travel_rule_submitted": { "type": "boolean" },
          "travel_rule_required": { "type": "boolean" }
        }
      },
      "block_reason": {
        "type": "string",
        "description": "If status is BLOCKED, why the payment was rejected."
      },
      "receipt_id": { "type": "string" },
      "eas_attestation_uid": { "type": "string" }
    },
    "required": ["status", "compliance_summary", "receipt_id"]
  },
  "annotations": {
    "destructiveHint": true,
    "readOnlyHint": false
  }
}
```

---

## 5. Server Implementation

### 5.1 Server Manifest (tools/list response)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      { "name": "check_sanctions",          "title": "Sanctions Screen" },
      { "name": "verify_kya",               "title": "Know Your Agent Verification" },
      { "name": "create_compliant_invoice", "title": "Create Compliant Invoice" },
      { "name": "submit_travel_rule",       "title": "Submit Travel Rule Data" },
      { "name": "get_compliance_receipt",   "title": "Get Compliance Receipt" },
      { "name": "pay_with_compliance",      "title": "Pay With Compliance" }
    ]
  }
}
```

### 5.2 Server Capabilities Declaration

```json
{
  "capabilities": {
    "tools": {
      "listChanged": false
    }
  },
  "serverInfo": {
    "name": "flowlink-compliance",
    "version": "1.0.0",
    "vendor": "FlowLink"
  }
}
```

### 5.3 Transport

Expose two transports:

1. **HTTP Streamable** (production) — `https://mcp.flowlink.io/v1`
   - Recommended for all remote integrations
   - Bearer token auth via `Authorization: Bearer fl_live_...` header
   - Rate limits: 100 req/min (free), 1000 req/min (paid), 10000 req/min (enterprise)

2. **stdio** (local dev / Claude Desktop) — run via `npx @flowlink/mcp-server`
   - Reads `FLOWLINK_API_KEY` from environment
   - Same tool surface, calls cloud API

### 5.4 Reference Implementation Stack

```
flowlink-mcp/
├── src/
│   ├── server.ts          # MCP server entrypoint (stdio + HTTP)
│   ├── tools/
│   │   ├── check-sanctions.ts
│   │   ├── verify-kya.ts
│   │   ├── create-invoice.ts
│   │   ├── submit-travel-rule.ts
│   │   ├── get-receipt.ts
│   │   └── pay-with-compliance.ts
│   ├── validators/        # Zod schemas matching inputSchema definitions
│   └── prooflink-client.ts  # HTTP client to FlowLink REST API
├── package.json
└── README.md
```

Technology: TypeScript + `@modelcontextprotocol/sdk` (official SDK).

---

## 6. Framework Integration Patterns

### 6.1 LangChain (Python)

Uses `langchain-mcp-adapters` (`pip install langchain-mcp-adapters`).
MCP tools auto-convert to LangChain `BaseTool` objects — no manual wrapping.

```python
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_react_agent
from langchain_anthropic import ChatAnthropic

async def run_compliant_payment_agent():
    async with MultiServerMCPClient({
        "flowlink": {
            "transport": "http",
            "url": "https://mcp.flowlink.io/v1",
            "headers": {"Authorization": "Bearer fl_live_xxxxx"}
        },
        # Pair with Coinbase for execution
        "coinbase-payments": {
            "transport": "stdio",
            "command": "npx",
            "args": ["@coinbase/payments-mcp", "--auto-config"]
        }
    }) as client:
        tools = await client.get_tools()
        llm = ChatAnthropic(model="claude-sonnet-4-6")
        agent = create_react_agent(llm, tools)

        result = await agent.ainvoke({
            "messages": [{
                "role": "user",
                "content": "Pay 50 USDC to 0xAbCd... on Base for API services rendered."
            }]
        })
        print(result)

asyncio.run(run_compliant_payment_agent())
```

The agent will autonomously: call `check_sanctions`, then `pay_with_compliance`,
then `get_compliance_receipt` — without any hardcoded orchestration.

### 6.2 OpenAI Agents SDK (Python)

Native MCP support shipped in the OpenAI Agents SDK (March 2025).
Uses `MCPServerSse` for remote HTTP/SSE servers.

```python
from agents import Agent, Runner
from agents.mcp import MCPServerSse, create_static_tool_filter

async def main():
    async with MCPServerSse(
        name="FlowLink Compliance",
        params={
            "url": "https://mcp.flowlink.io/v1/sse",
            "headers": {"Authorization": "Bearer fl_live_xxxxx"}
        },
        cache_tools_list=True,
        # Restrict to non-payment tools for read-only agents
        tool_filter=create_static_tool_filter(
            allowed_tool_names=["check_sanctions", "verify_kya", "get_compliance_receipt"]
        )
    ) as flowlink:
        agent = Agent(
            name="Compliance Checker",
            instructions=(
                "You are a compliance agent. Before any payment is authorized, "
                "screen the counterparty for sanctions and verify agent identity if applicable. "
                "Always return a compliance receipt ID."
            ),
            mcp_servers=[flowlink],
            mcp_config={"convert_schemas_to_strict": True}
        )

        result = await Runner.run(
            agent,
            "Screen address 0xAbCd... on Ethereum and check if it's safe to pay."
        )
        print(result.final_output)
```

### 6.3 Vercel AI SDK (TypeScript)

Uses `createMCPClient` (stable as of AI SDK 4.2, shipped as `@ai-sdk/mcp`).

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const flowlink = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://mcp.flowlink.io/v1',
      headers: { Authorization: `Bearer ${process.env.FLOWLINK_API_KEY}` }
    }
  });

  // Load only specific tools (schema-typed for strict TypeScript)
  const tools = await flowlink.tools({
    schemas: {
      check_sanctions: {
        inputSchema: z.object({
          address: z.string(),
          chain: z.enum(['ethereum', 'base', 'solana', 'polygon', 'arbitrum'])
        })
      },
      pay_with_compliance: {
        inputSchema: z.object({
          recipient: z.object({ wallet_address: z.string() }),
          amount: z.object({ value: z.number(), currency: z.enum(['USDC', 'USDT']) }),
          chain: z.enum(['base', 'ethereum', 'solana', 'polygon'])
        })
      }
    }
  });

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    messages,
    tools,
    onFinish: async () => {
      await flowlink.close();
    }
  });

  return result.toDataStreamResponse();
}
```

### 6.4 Claude Desktop (Direct MCP Config)

Zero-code integration for Claude Desktop users:

```json
{
  "mcpServers": {
    "flowlink-compliance": {
      "command": "npx",
      "args": ["@flowlink/mcp-server"],
      "env": {
        "FLOWLINK_API_KEY": "fl_live_xxxxx"
      }
    }
  }
}
```

After restart, Claude Desktop exposes all 6 FlowLink tools natively. A CFO can ask:
"Screen this wallet before we approve this vendor payment" — and Claude calls
`check_sanctions` automatically.

---

## 7. Payment Flow Architecture

### 7.1 Compliant Payment — Full Sequence

```
Agent/LLM
   │
   ├─► check_sanctions(recipient_address, chain)
   │      └─► Chainalysis API → OFAC/EU/UN/HMT lists
   │      └─► Returns: cleared=true, risk_score=3, receipt_id=scr_01...
   │
   ├─► verify_kya(agent_id) [if recipient is an agent]
   │      └─► ERC-8004 registry on-chain lookup
   │      └─► Returns: verified=true, trust_score=87, spending_limits
   │
   ├─► [if amount > $1000] submit_travel_rule(tx_data)
   │      └─► Notabene / Sygna Bridge → counterparty VASP
   │      └─► Returns: travel_rule_id, counterparty_acknowledged=true
   │
   ├─► pay_with_compliance(recipient, amount, chain="base")
   │      └─► x402 payment execution
   │      └─► Returns: tx_hash, status=COMPLETED, receipt_id
   │
   └─► get_compliance_receipt(tx_hash)
          └─► Returns: full ProofLink receipt
          └─► EAS attestation UID on Base
          └─► IPFS CID for audit archive
```

### 7.2 Compliant Payment via `pay_with_compliance` (orchestrated internally)

```
pay_with_compliance(recipient, amount, chain)
         │
         │  [FlowLink server orchestrates internally]
         │
         ├─► ProofLink Engine: sanctions_screen(recipient.wallet_address)
         ├─► [if recipient.agent_id] ProofLink Engine: kya_verify(agent_id)
         ├─► [if amount_usd > threshold] Travel Rule Engine: submit(originator, beneficiary)
         ├─► Payment Router: x402.execute(recipient, amount, chain)
         └─► Receipt Issuer: generate_prooflink_receipt() → EAS.attest()
```

### 7.3 Coinbase MCP + FlowLink MCP Integration Pattern

```
Agent Framework (LangChain / OpenAI SDK / Vercel AI)
        │
        ├─── FlowLink MCP ──────────────────────────────────────────────
        │    check_sanctions()    verify_kya()    get_compliance_receipt()
        │    create_compliant_invoice()    submit_travel_rule()
        │
        └─── Coinbase Payments MCP ─────────────────────────────────────
             wallet_balance()    send_x402_payment()    onramp_usdc()
```

FlowLink handles the "is this legal?" question.
Coinbase handles the "how do I pay?" question.
Together they form a complete agentic payment stack.

---

## 8. Differentiation vs. Existing MCP Servers

| Feature | FlowLink MCP | Coinbase MCP | Sanctions MCP | Paytm MCP |
|---------|-------------|-------------|---------------|-----------|
| Sanctions screening (full 4 lists) | YES | NO | Partial | NO |
| KYA / ERC-8004 agent verification | YES | NO | NO | NO |
| FATF Travel Rule (VASP messaging) | YES | NO | NO | NO |
| Compliance receipt + EAS attestation | YES | NO | NO | NO |
| Compliant invoice (JSON-LD + on-chain) | YES | NO | NO | NO |
| End-to-end pay_with_compliance | YES | NO | NO | NO |
| x402 payment execution | Via Coinbase MCP | YES | NO | NO |
| Enterprise audit trail | YES | NO | NO | NO |
| Multi-framework support | YES | YES | NO | NO |

---

## 9. Monetization via MCP

### 9.1 Pricing Model

| Tier | Price | Included |
|------|-------|---------|
| Free | $0 | 100 tool calls/month, `check_sanctions` only |
| Startup | $299/mo | 10K calls/month, all tools |
| Growth | $999/mo | 100K calls/month, priority SLA |
| Enterprise | Custom | Unlimited, dedicated infra, SLAs |

Per-call pricing for pay-as-you-go:
- `check_sanctions`: $0.02/call
- `verify_kya`: $0.05/call
- `submit_travel_rule`: $0.25/call
- `create_compliant_invoice`: $0.10/call
- `get_compliance_receipt`: $0.01/call
- `pay_with_compliance`: $0.50/call (includes all sub-checks)

### 9.2 Distribution

1. **Claude Desktop users**: `npx @flowlink/mcp-server` — zero-friction adoption
2. **npm registry**: `@flowlink/mcp-server` — developer self-service
3. **Smithery / mcp.run / PulseMCP**: List in MCP marketplaces
4. **Coinbase CDP partnership**: Offer FlowLink as the recommended compliance layer
   alongside Payments MCP

---

## 10. Risks and Open Questions

### Technical Risks

1. **Latency budget**: Each MCP tool call adds network round-trip. Full compliance
   pipeline (sanctions + KYA + travel rule) could add 600-800ms to payment flow.
   Mitigation: `pay_with_compliance` runs checks in parallel server-side; cache KYA
   results per agent_id (TTL 24h).

2. **Schema strictness**: OpenAI Agents SDK's `convert_schemas_to_strict: true` flag
   requires all properties to have explicit types and no `additionalProperties`. The
   `oneOf` construct in `check_sanctions` and `get_compliance_receipt` may need to be
   flattened for strict-mode compatibility.

3. **Streaming vs. sync**: Long-running Travel Rule submissions (VASP acknowledgement
   can take seconds) should use MCP's task-augmented execution
   (`"taskSupport": "optional"`) rather than holding the connection open.

### Compliance Risks

4. **Liability for tool results**: If `check_sanctions` returns `cleared=true` and
   the payment is later flagged, FlowLink needs clear ToS limiting liability. The
   compliance receipt must document data source timestamps.

5. **Travel Rule pre-transaction requirement**: Some jurisdictions (EU under MiCA,
   Singapore) require Travel Rule data BEFORE the transaction executes. The
   `pre_transaction: true` flag on `submit_travel_rule` addresses this, but agents
   must be instructed to call it in the right sequence.

### Strategic Risks

6. **Coinbase builds compliance natively into Payments MCP**: If Coinbase adds
   sanctions screening to their MCP server, the positioning weakens. Mitigation:
   publish the KYA standard and ERC-8004 integration as open spec; own the standard,
   not just the product.

7. **MCP adoption**: MCP is the current standard but the ecosystem is moving fast
   (OpenAI adopted March 2025, but Google's ADK uses its own tool format). Build
   the compliance logic as a REST API first; MCP is a transport layer on top.

---

## Sources Consulted

- [MCP Tools Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [Coinbase Payments MCP](https://github.com/coinbase/payments-mcp)
- [Coinbase x402 MCP Server](https://docs.cdp.coinbase.com/x402/mcp-server)
- [Paytm Payment MCP Server](https://github.com/paytm/payment-mcp-server)
- [FlowHunt Sanctions MCP](https://www.flowhunt.io/mcp-servers/mcp-sanctions/)
- [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters)
- [LangChain MCP Docs](https://docs.langchain.com/oss/python/langchain/mcp)
- [OpenAI Agents SDK MCP](https://openai.github.io/openai-agents-python/mcp/)
- [Vercel AI SDK MCP Tools](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
- [Vercel AI SDK createMCPClient](https://ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client)
- [Coinbase Payments MCP Launch Blog](https://www.coinbase.com/developer-platform/discover/launches/payments-mcp)
- [FlowLink Agent Economy Research](/home/akash/PROJECTS/FLOW-LINK/research/agentic-payments/agent_economy.md)
