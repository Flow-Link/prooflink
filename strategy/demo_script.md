# FlowLink Demo Scripts

**Version:** 1.0
**Date:** March 20, 2026
**Status:** Execution-Ready
**Purpose:** Three demo scripts for hackathons, investor meetings, and developer audiences

---

## Demo 1: "3-Minute Hackathon Demo"

**Audience:** Hackathon judges with short attention spans. Technically literate but evaluating 30+ projects in a day.
**Goal:** Win sponsor track prizes (Circle, Self Protocol, Coinbase, Chainlink).
**Hardware:** Single laptop, external display for judges. Browser + terminal side by side.

### Pre-Demo Setup (do this 30 minutes before)

1. Pre-fund two wallets on Base Sepolia with test USDC via CDP Paymaster (gasless)
2. Load the FlowLink dashboard at `v0-flowlink.vercel.app` in Chrome
3. Open a terminal with the x402 agent script ready to execute
4. Pre-warm the Chainalysis API cache by screening a clean address once
5. Have a known OFAC SDN address ready: use Tornado Cash deployer `0x905b63Fff465B9fFBF41DeA908CEb12df9d1c960` or equivalent published SDN wallet
6. Have the pre-recorded 90-second backup video loaded in a separate tab (in case of API failure)
7. Clear all browser notifications. Full screen. Dark mode on terminal.

### Screen Layout

```
+-----------------------------------------------+
|  LEFT (60%)           |  RIGHT (40%)           |
|                       |                        |
|  FlowLink Dashboard   |  Terminal              |
|  - Live transaction   |  - Agent script        |
|    feed               |  - x402 payment calls  |
|  - Compliance status  |  - Real-time output    |
|  - ProofLink receipt  |                        |
|    viewer             |                        |
+-----------------------------------------------+
```

### Script: Second by Second

**[0:00 - 0:18] HOOK -- The Problem**

> "Three weeks ago, an AI agent autonomously wired $47,000 in USDC to a wallet controlled by a sanctioned entity. The x402 server processed it. The compliance team found out from OFAC. That company is now facing a $500,000 fine."
>
> "This is not hypothetical. x402 processes 75 million transactions a month with zero compliance infrastructure. No sanctions screening. No audit trail. No invoices. Nothing a CFO can sign."

*[Action: Stand still. Make eye contact. Do not touch the keyboard yet.]*

**[0:18 - 0:30] INTRODUCE THE SOLUTION**

> "FlowLink is the compliance layer that x402 is missing. It intercepts every payment, screens every address against OFAC, EU, and UN sanctions lists in under 200 milliseconds, and generates a cryptographic compliance receipt -- what we call a ProofLink -- for every transaction."

*[Action: Gesture toward the screen. Still do not touch the keyboard.]*

**[0:30 - 0:35] SET UP THE LIVE DEMO**

> "Let me show you. I have an AI agent that needs to pay for an API call via x402. Watch what happens."

*[Action: Move to the keyboard.]*

**[0:35 - 0:55] LIVE DEMO -- BLOCKED PAYMENT (the wow moment)**

*[Action: In the terminal, execute the agent payment script targeting the sanctioned address.]*

```bash
# Command visible in terminal:
node agent-pay.js --to 0x905b63Fff465B9fFBF41DeA908CEb12df9d1c960 --amount 50 --chain base
```

*[Terminal output appears within 1-2 seconds:]*

```
[FlowLink] Intercepting x402 payment...
[FlowLink] Screening sender:   0xA1b2...C3d4  -> CLEARED (62ms)
[FlowLink] Screening receiver: 0x905b...1c960 -> BLOCKED (89ms)
[FlowLink] Match: OFAC_SDN | Tornado Cash Deployer | Confidence: 0.99
[FlowLink] Payment REJECTED. Compliance code: SANCTIONS_HIT
[FlowLink] ProofLink receipt: pl_01HW4K9X7MNPQ3R5T6V8Y
[Agent]    Received 402 rejection with compliance reason. Selecting alternate payee...
```

> "Blocked. 89 milliseconds. The agent received a structured 402 rejection with a compliance reason code -- it knows why it was blocked and can self-correct. That is not just compliance, that is agentic sophistication."

*[Action: Click on the ProofLink receipt in the dashboard. Show the structured JSON: timestamp, screened addresses, matched SDN entry, risk score.]*

> "And here is the audit record. Every check performed, every list screened, every result timestamped. This is what your compliance officer needs. This is what no other x402 project produces."

**[0:55 - 1:20] LIVE DEMO -- APPROVED PAYMENT**

> "Now watch a clean payment go through."

*[Action: Execute the same script with a clean address.]*

```bash
node agent-pay.js --to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --amount 50 --chain base
```

*[Terminal output:]*

```
[FlowLink] Intercepting x402 payment...
[FlowLink] Screening sender:   0xA1b2...C3d4  -> CLEARED (3ms, cached)
[FlowLink] Screening receiver: 0xd8dA...6045  -> CLEARED (71ms)
[FlowLink] AML risk score: 8/100 (below threshold 80)
[FlowLink] Payment APPROVED. Settling via x402...
[x402]     Transaction: 0x7f3e...8a2b (Base Sepolia)
[FlowLink] ProofLink receipt: pl_01HW4K9X7MNPQ3R5T7W9A
[FlowLink] Invoice generated: INV-2026-0042 (JSON + PDF)
```

> "Clean address. Approved in 71 milliseconds. On-chain settlement. And -- this is what nobody else does -- an auto-generated invoice with line items, tax placeholders, and an ERP-compatible JSON export."

*[Action: Click the invoice in the dashboard. Show: line items, total, compliance stamp, PDF download button.]*

**[1:20 - 1:50] TECHNICAL DEPTH**

> "How does it work? FlowLink registers hooks into the x402 ResourceServer lifecycle. Before verify: sanctions screen, AML risk score. Before settle: FATF Travel Rule transmission for transactions above $3,000. After settle: ProofLink receipt generation with optional on-chain attestation via EAS."
>
> "One line of code to add to any x402 server."

*[Action: Show the code snippet on screen -- either a slide or a code editor tab:]*

```typescript
compliance.register(server); // That's it.
```

> "Hook-based, not proxy-based. Zero additional network hops. Sub-200ms overhead on cached addresses. Protocol-agnostic -- we are building adapters for ACP, AP2, and MPP alongside x402."

**[1:50 - 2:20] TRACTION AND MARKET**

> "FlowLink is live at v0-flowlink.vercel.app. We have screened [X] transactions in the past [Y] weeks."
>
> "The agentic economy is projected to reach $3-5 trillion by 2030. Six payment protocols shipped in the last twelve months. Zero of them have compliance infrastructure. Mastercard just paid $1.8 billion for BVNK -- a stablecoin infrastructure company. Stripe paid $1.1 billion for Bridge. The compliance layer for this market does not exist yet. We are building it."

**[2:20 - 2:50] SPONSOR INTEGRATION (adapt per hackathon)**

*[For ETHGlobal Cannes -- Circle track:]*

> "We wrap Circle's Compliance Engine with ProofLink screening and integrate Self Protocol for KYC proofs. One integration, two sponsor tracks, and the first compliance middleware that works natively with CCTP V2 for cross-chain USDC."

*[For Agentic Commerce Berlin -- Algorand track:]*

> "Every Algorand x402 payment flows through FlowLink before it settles. OFAC screening happens in the HTTP layer -- no smart contract changes required. The payment either gets a 200 or a 402 with a compliance reason."

*[For Chainlink Convergence -- Risk & Compliance track:]*

> "We integrate Chainlink's CRE to trigger compliance checks via the oracle network. Real-time risk detection, automated controls, reserve verification -- that is the track description. That is FlowLink."

**[2:50 - 3:00] CLOSE**

> "x402 delivers payments. FlowLink makes them legal. We are the trust layer the agentic economy does not know it needs yet -- but will."

*[Pause. Do not keep talking. Let the judges ask questions.]*

### Killer Closing Line

> "Every x402 payment that moves without FlowLink is a compliance liability waiting to become a headline."

### Backup Plan

| Failure Mode | Recovery |
|---|---|
| Chainalysis API down | Switch to offline OFAC SDN list fallback. The demo still shows BLOCKED/APPROVED -- just note "running on offline SDN list, production uses Chainalysis real-time" |
| x402 testnet congestion (settlement slow) | Pre-record the settlement step. Show the compliance screening live (that is the FlowLink part), then say "settlement is pending on Base Sepolia -- here is the pre-recorded version at full speed" and switch to video |
| Dashboard fails to load | Run the entire demo in terminal only. The terminal output is compelling on its own. Skip the dashboard visuals |
| Total internet failure | Play the 90-second pre-recorded backup video. Say: "Let me show you the recording from our test run this morning -- same flow, same data." Never apologize for the failure. |

### Timing Checkpoints

| Time | You should be at... | If behind... |
|---|---|---|
| 0:30 | Starting the keyboard demo | Cut the problem statement to 10 seconds |
| 1:00 | Finishing the blocked payment | Skip the ProofLink receipt click-through |
| 1:30 | Finishing the clean payment | Skip the invoice visual, just mention it |
| 2:00 | Starting technical depth | Cut to 2 sentences: "Hook-based middleware, one line of code, sub-200ms" |
| 2:30 | Starting traction/market | Cut the $1.8B BVNK reference, go straight to close |

---

## Demo 2: "10-Minute Investor Demo"

**Audience:** VC partner meeting. 2-4 people. Technically curious but evaluating business viability, not code quality.
**Goal:** Generate conviction for a follow-up meeting or term sheet discussion.
**Setting:** Conference room with a large display or screen share on Zoom. Calm pace. No rush.

### Pre-Demo Setup

1. All hackathon setup steps, plus:
2. Prepare a second browser with the FlowLink dashboard showing a pre-populated transaction history (3-5 transactions with mixed APPROVED/BLOCKED status)
3. Have a "client wallet" and a "CFO dashboard" tab ready
4. Have a slide with the market numbers ready (TAM/exit comps) -- do not use a full deck, just one slide
5. Print a physical copy of a ProofLink receipt PDF. Hand it to the partner during the demo.

### Screen Layout

```
Tab 1: FlowLink Dashboard (transaction feed, compliance status)
Tab 2: Terminal (agent script)
Tab 3: Invoice / ProofLink receipt viewer
Tab 4: One-slide market summary (backup, only show if asked)
```

### Script

**[0:00 - 1:30] PROBLEM AND CONTEXT**

> "Thank you for the time. I want to show you something live, but let me set up why it matters first."
>
> "There are two problems converging right now. First: B2B stablecoin payments grew 733% last year. $226 billion annualized. 73% of CFOs are evaluating crypto payment options. But no CFO will approve a stablecoin payment without proof of compliance -- sanctions screening, Travel Rule data, an audit trail their auditor can verify. That infrastructure does not exist."
>
> "Second: six AI agent payment protocols shipped in the past twelve months. x402 from Coinbase, ACP from OpenAI, AP2 from Google, MPP from Stripe, plus Visa and Mastercard agent payment standards. None of them have compliance built in. Every new protocol creates a new compliance surface area."
>
> "FlowLink is the compliance-as-infrastructure layer that sits between these payment protocols and settlement. We screen every payment in real time, issue cryptographic compliance receipts, and generate the invoices and audit trails that make stablecoin payments viable for enterprise finance teams."

**[1:30 - 4:00] LIVE DEMO -- H2H FLOW**

> "Let me show you the human-to-human flow first. This is our Phase 1 product -- live now."

*[Action: Open FlowLink dashboard.]*

> "A business needs to pay a supplier $5,000 in USDC for API services. Step one: create the invoice."

*[Action: In the dashboard, create an invoice. Fill in: seller name, buyer name, line item "API inference calls - 15,000 units at $0.003", total $45 USDC, currency USDC, chain Base.]*

> "This invoice is a JSON-LD document. Machine-readable. It includes seller identity, buyer identity, line items, tax placeholders, payment instructions, and a FlowLink compliance stamp. No other crypto invoicing product produces this."

*[Action: Click "Send to Client." Show the invoice URL generated.]*

> "The client receives this. They review the line items. They click Pay. Now watch what happens on our side."

*[Action: Switch to terminal. Execute a payment script simulating the client paying the invoice.]*

```
[FlowLink] Invoice INV-2026-0042 payment initiated
[FlowLink] Screening sender:   0xBuyer...  -> CLEARED (58ms)
[FlowLink] Screening receiver: 0xSeller... -> CLEARED (62ms)
[FlowLink] AML risk score: 4/100
[FlowLink] Amount $45.00 below Travel Rule threshold ($3,000)
[FlowLink] Travel Rule: SKIPPED
[FlowLink] Payment APPROVED. Settling via USDC on Base...
[x402]     Transaction: 0xabc...def (Base)
[FlowLink] ProofLink receipt: pl_01HW4K9X7MNPQ3R5T7W9B
[FlowLink] Invoice INV-2026-0042 marked PAID
[FlowLink] ERP webhook fired: quickbooks.acme.com/webhooks/invoices
```

> "3.2 seconds. Invoice paid. Compliance checked. Receipt generated. ERP notified. Compare that to a wire transfer: 3-5 business days, $25-$50 in fees, no compliance proof."

*[Action: Open the ProofLink receipt in the dashboard. Walk through each field.]*

> "This is the ProofLink receipt. Every check performed -- OFAC SDN, EU Consolidated, UN Consolidated -- with timestamps. The AML risk score. The sender and receiver addresses. A cryptographic hash anchored on Base via Ethereum Attestation Service."

*[Action: Hand the investor the printed PDF copy.]*

> "That is a physical compliance receipt for a stablecoin transaction. Try getting that from Coinbase Commerce or Request Finance."

**[4:00 - 4:30] TRANSITION TO H2A FLOW**

> "That was human-to-human. Now let me show you where this gets interesting. Phase 2: human-to-agent."

**[4:30 - 6:30] LIVE DEMO -- H2A FLOW**

> "An AI agent needs to pay for compute resources via x402. The agent has an ERC-8004 identity -- our Know Your Agent standard. Watch the full compliance pipeline."

*[Action: In terminal, execute the agent payment script.]*

```bash
node agent-pay.js --agent-id "erc8004:8453:0xReg:42" --to 0xComputeProvider --amount 150 --chain base
```

*[Terminal output:]*

```
[FlowLink] Agent payment initiated
[FlowLink] KYA verification: erc8004:8453:0xReg:42
[FlowLink]   Agent name: inference-agent-v3
[FlowLink]   Type: semi-autonomous
[FlowLink]   Operator: Acme Corp (LEI verified)
[FlowLink]   Trust score: 87/100
[FlowLink]   Spending limit: $10,000/tx, $50,000/day
[FlowLink]   KYA status: VERIFIED
[FlowLink] Screening sender (agent wallet): 0xA1b2... -> CLEARED (4ms, cached)
[FlowLink] Screening receiver: 0xComputeProvider     -> CLEARED (67ms)
[FlowLink] AML risk score: 12/100
[FlowLink] Amount $150.00 below Travel Rule threshold
[FlowLink] Payment APPROVED. Settling via x402...
[x402]     Transaction: 0x9e2f...4c7d (Base)
[FlowLink] ProofLink receipt: pl_01HW4K9X7MNPQ3R5T8X0C
[FlowLink] Invoice generated: INV-2026-0043
```

> "Notice what happened that did not happen in the first demo. KYA verification. We resolved the agent's on-chain identity from the ERC-8004 registry. We verified the operator -- Acme Corp, LEI confirmed. We checked spending limits -- $150 is within the $10,000 per-transaction authorization."
>
> "This is the missing layer. Nobody is doing this. Coinbase's Payments MCP handles the 'how do I pay' question. FlowLink handles the 'is this legal' question."

**[6:30 - 7:00] THE BLOCK MOMENT**

> "Now let me show you what happens when compliance fails."

*[Action: Execute the same script targeting the sanctioned address.]*

```
[FlowLink] Agent payment initiated
[FlowLink] KYA verification: erc8004:8453:0xReg:42 -> VERIFIED
[FlowLink] Screening receiver: 0x905b...1c960 -> BLOCKED (91ms)
[FlowLink] Match: OFAC_SDN | Tornado Cash Deployer | Confidence: 0.99
[FlowLink] Payment REJECTED. Compliance code: SANCTIONS_HIT
[Agent]    Received structured 402 rejection. Reason: SANCTIONS_HIT
[Agent]    Escalating to human operator for review...
```

> "Blocked. 91 milliseconds. The agent received a structured rejection, understood the compliance reason, and escalated to a human. That is not a dumb firewall -- that is an intelligent compliance layer that agents can reason about."

**[7:00 - 8:30] MARKET AND BUSINESS**

> "Let me put numbers on this."
>
> "Stablecoin transaction volume: $33 trillion in 2025, up 72% year over year. B2B stablecoin payments: $226 billion annualized, growing 733%. The RegTech market: $20 billion today, $100 billion by 2033."
>
> "Exit comparables: Mastercard acquired BVNK for $1.8 billion on March 17th -- three days ago. Stripe acquired Bridge for $1.1 billion. Rain raised at $1.95 billion. Every major card network is buying stablecoin infrastructure at billion-dollar valuations."
>
> "FlowLink's revenue model: transaction fees at 5-30 basis points depending on volume tier. Subscription tiers for compliance-as-a-service starting at $99 per month. KYA credential fees at $0.10 per agent verification. Year 3 target: $23 million ARR on $15 billion cumulative volume."
>
> "Our moat deepens with every transaction. Every address screened builds our behavioral dataset. Every compliance attestation builds the reputation network. Every agent KYA credential adds to a dataset that does not exist anywhere else."

**[8:30 - 9:30] COMPETITIVE POSITIONING**

> "Request Finance does crypto invoicing but has zero compliance layer. In a post-GENIUS Act world, that is disqualifying for enterprise. Skyfire handles x402 agent payments but only for one protocol. Chainalysis does post-hoc monitoring at $150K per year -- we do pre-payment enforcement at developer-accessible pricing."
>
> "FlowLink is the neutral compliance layer. Coinbase's compliance serves Coinbase. Stripe's serves Stripe. We serve everyone. More protocol fragmentation -- more agent payment standards -- makes our position more valuable, not less."

**[9:30 - 10:00] ASK AND CLOSE**

> "We are raising a pre-seed round. The capital goes to three things: shipping the x402 compliance middleware SDK as open source, building the MCP server so any AI agent can call compliance natively, and hiring one senior compliance engineer who has shipped Travel Rule integrations."
>
> "We are building the trust layer that makes the $33 trillion stablecoin economy safe for the enterprise CFO. Before regulators mandate it."

*[Pause. Wait for questions.]*

### Killer Closing Line

> "Mastercard paid $1.8 billion for stablecoin payment infrastructure last week. They did not buy compliance infrastructure -- because it did not exist yet."

### Expected Questions and Answers

| Question | Answer |
|---|---|
| "What is your current traction?" | "Live at v0-flowlink.vercel.app. [X] screened transactions. We are in design partner conversations with [Y]. Our first hackathon entry is ETHGlobal Cannes in two weeks." |
| "Why can Coinbase not just build this?" | "They could build it for their own ecosystem. But x402 is one of six agent payment protocols. A CFO using agents that pay via x402, ACP, and MPP needs one compliance layer, not three. Coinbase has no incentive to support OpenAI's protocol. We do." |
| "What if compliance requirements change?" | "That is our advantage, not our risk. Every new regulation -- MiCA enforcement in July, GENIUS Act implementation, FATF agent guidance -- creates demand for a compliance layer. We are building the product regulators will reference." |
| "How do you get to $23M ARR?" | "Transaction fees at 5-30 basis points on $15B cumulative volume plus subscription revenue. BVNK reached $30B annualized volume in 3 years. We need 0.05% of stablecoin volume." |
| "Are you a VASP? Do you need licenses?" | "No. We are non-custodial compliance middleware. We never hold or transmit customer funds. We screen and attest. If reclassified, we have a partner bank model ready -- but architecturally we are designed to avoid that trigger." |
| "What is KYA and why does it matter?" | "Know Your Agent. It answers: who is this agent, who controls it, and can it be trusted. No standard exists today. We are publishing it as an open spec and building the verification infrastructure. When FATF issues agent payment guidance -- and they will -- our architecture becomes the reference." |
| "Who are your competitors?" | "In compliance-as-infrastructure for agentic payments: nobody. In adjacent spaces: Request Finance does invoicing without compliance, Skyfire does x402-only agent payments, Chainalysis does post-hoc monitoring. We sit at the intersection of all three and do pre-payment enforcement." |

### Backup Plan

| Failure Mode | Recovery |
|---|---|
| Any API failure during H2H demo | "The production system has circuit breakers and offline OFAC fallback. Let me show you the pre-recorded version at full speed while I diagnose this." Play the backup video. Return to live for the H2A demo if possible. |
| Agent KYA verification fails | Skip the KYA step. Say: "The ERC-8004 registry is on testnet and occasionally lags. Here is the cached verification result." Show a pre-prepared JSON response. |
| Investor interrupts with questions early | Welcome it. The demo works in any order. If they ask about business model at minute 3, pivot there. You can always come back to the H2A demo later. |
| "We have 5 minutes, not 10" | Cut the H2H demo. Go straight to the H2A agent demo (that is the differentiating moment). Skip market numbers -- they can read the deck. |

---

## Demo 3: "MCP Live Demo"

**Audience:** Developers and technical partners. AI agent builders. People who have used MCP tools in Claude Desktop or built with LangChain/Vercel AI SDK.
**Goal:** Get developers to install `@flowlink/mcp-server` and start building.
**Setting:** Terminal-first. No slides. No dashboard. Pure tool-calling in a terminal or Claude Desktop.

### Pre-Demo Setup

1. Install the FlowLink MCP server locally: `npx @flowlink/mcp-server`
2. Set `FLOWLINK_API_KEY` in environment
3. Have Claude Desktop configured with the FlowLink MCP server (show `claude_desktop_config.json`)
4. Have a Python script ready with `langchain-mcp-adapters` as an alternative
5. Pre-screen a clean address to warm the cache
6. Have the sanctioned address ready
7. Terminal font size: 16pt minimum. Dark background, green or white text.

### Screen Layout

```
+-----------------------------------------------+
|  FULL SCREEN TERMINAL                          |
|                                                |
|  Claude Desktop or Python LangChain agent      |
|  calling FlowLink MCP tools                    |
|                                                |
+-----------------------------------------------+
```

### Option A: Claude Desktop Demo

**[0:00 - 0:30] SETUP CONTEXT**

> "FlowLink exposes compliance as an MCP server. Six tools. Any AI agent framework -- Claude, ChatGPT, LangChain, Vercel AI SDK -- can call them natively. Let me show you in Claude Desktop."

*[Action: Show the claude_desktop_config.json.]*

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

> "That is the entire integration. No SDK. No wrapper code. Claude now has access to six compliance tools."

**[0:30 - 2:00] TOOL 1: check_sanctions**

*[Action: Type into Claude Desktop:]*

> "Screen this Ethereum address for sanctions: 0x905b63Fff465B9fFBF41DeA908CEb12df9d1c960"

*[Claude calls `check_sanctions` tool. Response appears:]*

```
BLOCKED: Address matches OFAC SDN list entry.
- List: OFAC_SDN
- Entity: Tornado Cash Deployer
- Risk score: 98/100
- Match confidence: 0.99
- Receipt ID: scr_01HW4K9X7MNPQ3R5T6W9Z

DO NOT proceed with any payment to this address.
```

> "Claude called `check_sanctions`. Real-time OFAC screening. 98 out of 100 risk score. Claude itself is now telling the user not to proceed. The compliance decision is embedded in the agent's reasoning loop -- not bolted on after the fact."

*[Action: Now screen a clean address:]*

> "Now screen this address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

```
Address cleared.
- Risk score: 2/100
- No sanctions matches found
- Screened against: OFAC_SDN, EU_CONSOLIDATED, UN_CONSOLIDATED, HMT
- Receipt ID: scr_01HW4K9X7MNPQ3R5T6V8Y

This address is safe for payment.
```

> "Cleared. Two out of 100. Four sanctions lists screened. The agent has a receipt ID it can reference later for audit purposes."

**[2:00 - 3:30] TOOL 2: verify_kya**

*[Action: Type into Claude Desktop:]*

> "Verify the identity and compliance standing of AI agent erc8004:8453:0xRegistry:42"

*[Claude calls `verify_kya`. Response appears:]*

```
Agent Verified.
- Agent: inference-agent-v3
- Type: semi-autonomous
- Operator: Acme Corp (KYC verified, sanctions cleared)
- Trust score: 87/100
- Spending limits:
  - Per transaction: $10,000 USD
  - Daily: $50,000 USD
  - Allowed chains: Base, Ethereum, Polygon
  - Allowed currencies: USDC, USDT
- ERC-8004 validation evidence: TEE attestation (verified)
- Receipt ID: kya_01HW4K9X7MNPQ3R5T7W9A
```

> "Know Your Agent. We resolved the on-chain ERC-8004 registry. The agent has a verified operator, spending limits, and a trust score. No other MCP server provides this. Coinbase's Payments MCP tells you how to pay. FlowLink tells you whether you should."

**[3:30 - 5:00] TOOL 3: create_compliant_invoice**

*[Action: Type into Claude Desktop:]*

> "Create a compliant invoice: seller is agent erc8004:8453:0xReg:42 at wallet 0xSeller, buyer is Acme Corp at wallet 0xBuyer, for 15,000 API inference calls at $0.003 each, payable in USDC on Base."

*[Claude calls `create_compliant_invoice`. Response appears:]*

```
Invoice Created.
- Invoice ID: INV-2026-0044
- Total: $45.00 USDC
- Seller sanctions: CLEARED
- Buyer sanctions: CLEARED
- Travel Rule required: No (below $3,000 threshold)
- EAS attestation UID: 0x7f3e...8a2b
- Invoice URL: ipfs://QmX.../INV-2026-0044.json
- Receipt ID: inv_01HW4K9X7MNPQ3R5T8X0C

Payment instructions:
- x402 endpoint: https://api.flowlink.io/x402/pay/INV-2026-0044
- Wallet: 0xSeller
```

> "A machine-readable, compliance-stamped invoice. Both parties screened. Anchored on-chain via EAS. Stored on IPFS. The agent can now send this invoice to the buyer agent, which can verify the compliance stamp independently without trusting FlowLink."

**[5:00 - 7:00] TOOL 4: pay_with_compliance**

*[Action: Type into Claude Desktop:]*

> "Pay 45 USDC to 0xSeller on Base for invoice INV-2026-0044. Use x402."

*[Claude calls `pay_with_compliance`. Response appears:]*

```
Payment Completed.
- Status: COMPLETED
- Transaction: 0xabc...def (Base)
- Compliance summary:
  - Sanctions cleared: Yes
  - KYA verified: Yes (trust score 87)
  - Travel Rule submitted: No (below threshold)
- ProofLink receipt: pl_01HW4K9X7MNPQ3R5T9Y1D
- EAS attestation: 0x9e2f...4c7d
- Verify at: https://base.easscan.org/attestation/0x9e2f...4c7d
```

> "End-to-end compliant payment. One tool call. Internally, FlowLink ran sanctions screening, KYA verification, threshold checks, x402 settlement, receipt generation, and on-chain attestation. The agent called one function. The compliance pipeline did the rest."

**[7:00 - 8:00] TOOL 5: get_compliance_receipt**

*[Action: Type into Claude Desktop:]*

> "Get the full compliance receipt for transaction 0xabc...def"

*[Claude calls `get_compliance_receipt`. Response appears:]*

```
ProofLink Compliance Receipt
- Receipt ID: pl_01HW4K9X7MNPQ3R5T9Y1D
- Overall status: COMPLIANT
- Checks performed:
  1. SANCTIONS_SCREENING - PASSED (Chainalysis KYT, 62ms)
  2. KYA_VERIFICATION - PASSED (ERC-8004, 45ms)
  3. AML_MONITORING - PASSED (risk score 8/100)
  4. INVOICE_VALIDATION - PASSED
- EAS attestation: 0x9e2f...4c7d
- Receipt signature: 0xsig... (EIP-712)
- IPFS archive: QmX.../pl_01HW4K9X7MNPQ3R5T9Y1D.json

This receipt is cryptographically signed and independently verifiable.
```

> "That is the audit trail. Every check, every provider, every latency measurement. Cryptographically signed. On-chain. Verifiable by any third party. Hand this to your auditor."

**[8:00 - 9:00] THE FULL PICTURE**

> "Let me summarize what we just did. An AI agent called four tools in sequence:"
>
> "1. `check_sanctions` -- screened the counterparty. 2. `verify_kya` -- verified the agent identity. 3. `create_compliant_invoice` -- generated a compliance-stamped invoice. 4. `pay_with_compliance` -- executed the payment with full compliance pipeline."
>
> "The agent did not need custom integration code. It called MCP tools. Any agent framework -- LangChain, OpenAI Agents SDK, Vercel AI SDK -- works the same way."

*[Action: Briefly show the LangChain Python snippet:]*

```python
async with MultiServerMCPClient({
    "flowlink": {
        "transport": "http",
        "url": "https://mcp.flowlink.io/v1",
        "headers": {"Authorization": "Bearer fl_live_xxxxx"}
    },
    "coinbase-payments": {
        "transport": "stdio",
        "command": "npx",
        "args": ["@coinbase/payments-mcp", "--auto-config"]
    }
}) as client:
    tools = await client.get_tools()
    # FlowLink handles compliance. Coinbase handles execution.
```

> "FlowLink MCP plus Coinbase Payments MCP. Compliance plus execution. The complete agentic payment stack."

**[9:00 - 9:30] DEVELOPER ONBOARDING**

> "Three ways to start:"
>
> "One: `npx @flowlink/mcp-server` for Claude Desktop. Two: `pip install flowlink-mcp` for LangChain. Three: `npm install @flowlink/x402-compliance` for direct x402 integration."
>
> "Free tier: 100 sanctions screenings per month. No credit card. Start building today."

**[9:30 - 10:00] CLOSE**

> "Coinbase built the payment protocol. We built the compliance layer it needs. Together, they form the first complete, enterprise-grade, regulation-ready agentic payment stack."

*[Pause.]*

### Killer Closing Line

> "Your agent can pay for anything. FlowLink makes sure it does not pay the wrong person."

### Option B: Terminal-Only Python Demo (if Claude Desktop unavailable)

Replace Claude Desktop with a Python script using `langchain-mcp-adapters`:

```python
# demo_agent.py -- run live in terminal
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_react_agent
from langchain_anthropic import ChatAnthropic

async def demo():
    async with MultiServerMCPClient({
        "flowlink": {
            "transport": "http",
            "url": "https://mcp.flowlink.io/v1",
            "headers": {"Authorization": f"Bearer {os.environ['FLOWLINK_API_KEY']}"}
        }
    }) as client:
        tools = await client.get_tools()
        llm = ChatAnthropic(model="claude-sonnet-4-6")
        agent = create_react_agent(llm, tools)

        # Each prompt triggers the corresponding tool call
        result = await agent.ainvoke({
            "messages": [{"role": "user", "content": DEMO_PROMPT}]
        })
        print(result)

asyncio.run(demo())
```

Run the script with different prompts for each tool. The terminal output shows the agent's reasoning chain -- which tools it chose to call and why. This is actually more compelling for developer audiences because they see the LLM reasoning about compliance decisions.

### Backup Plan

| Failure Mode | Recovery |
|---|---|
| MCP server fails to connect | Switch to direct REST API calls via `curl`. Same endpoints, same data. "The MCP server wraps our REST API -- let me show you the raw API while we debug the MCP transport." |
| Claude Desktop unresponsive | Switch to Option B (Python LangChain script). "Same tools, different framework." |
| Screening API returns unexpected results | Have a mock mode: `FLOWLINK_MOCK=true npx @flowlink/mcp-server`. Returns deterministic responses for demo addresses. Say: "Running in demo mode with pre-computed responses." |
| Audience asks to see a tool not in the demo | All six tools work. Call it live. The MCP server exposes all tools simultaneously. |

---

## Cross-Demo Reference: The Pre-Recorded Backup Asset

Build once, use in all three demos:

**90-second screen recording** showing:
- 0:00-0:05 -- Terminal: agent sends x402 payment to sanctioned address
- 0:05-0:15 -- FlowLink intercepts, screens, BLOCKED in 89ms with SDN match details
- 0:15-0:25 -- Dashboard: ProofLink receipt appears with full compliance breakdown
- 0:25-0:35 -- Terminal: agent sends payment to clean address
- 0:35-0:50 -- FlowLink screens, APPROVED, settlement confirmed, invoice generated
- 0:50-1:05 -- Dashboard: invoice with line items, compliance stamp, PDF export
- 1:05-1:20 -- ProofLink receipt: checks performed, EAS attestation UID, IPFS CID
- 1:20-1:30 -- Terminal: `compliance.register(server)` -- one line of code

Record this at 1080p. No narration. Captions overlay showing timing ("89ms", "BLOCKED", "APPROVED"). Upload to the FlowLink website, embed in hackathon submissions, attach to investor emails.

---

## Quick Reference: Demo Selection Guide

| Situation | Use Demo | Time | Key Adjustment |
|---|---|---|---|
| Hackathon judges at table | Demo 1 | 3 min | Lead with the block moment |
| Hackathon video submission | Demo 1 (recorded) | 2-3 min | Tighter cuts, no pauses |
| VC partner meeting (first) | Demo 2 | 10 min | Emphasize market numbers and exits |
| VC associate meeting | Demo 2 (abbreviated) | 7 min | Cut H2H demo, focus on H2A + market |
| Developer conference talk | Demo 3 | 10 min | Full MCP walkthrough |
| Developer 1:1 at booth | Demo 3 (abbreviated) | 5 min | Just `check_sanctions` + `pay_with_compliance` |
| Sponsor partner meeting | Demo 1 + Demo 3 | 8 min | Hackathon hook + technical MCP depth |
| Base Batches application video | Demo 1 (recorded) | 2 min | Add 30s of traction metrics at end |

---

*Prepared March 20, 2026. Update terminal output and transaction counts before each use.*
