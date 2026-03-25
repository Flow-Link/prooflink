# GAP-H7 / GAP-A14: Payment-Aware Saga Orchestration for Multi-Agent Systems

**Research Date:** March 2026
**Covers:** Temporal.io sagas, Conductor/Orkes, LangGraph 2PC, ERC-8183 escrow hooks, MAST failure taxonomy, SHIELDA exception framework, arXiv:2601.04583 trust boundary analysis, Dapper Labs production case study
**FlowLink Gap IDs:** H7 (No Transaction Rollback / Saga Pattern), A14 (Payment-Execution Atomicity Broken), A2 (No Refund/Chargeback), A15 (Protocol Fragmentation)
**Severity:** Critical
**Relevance:** High

---

## 1. Problem Statement

Multi-step agent payment workflows fail without any compensating mechanism. When Agent A pays Agent B to orchestrate Agents C and D, and step 3 of 5 fails, the current state across every FlowLink-supported protocol (x402, ACP, AP2, MPP) is:

- Funds already disbursed at step 2 are permanently stranded
- No compensating transaction path exists at the protocol layer
- No audit trail links which sub-steps completed to which payments were made
- The orchestrating agent has no durable workflow state to resume from

The MAST taxonomy (arXiv:2503.13657, UC Berkeley) confirms this is the dominant failure mode: **coordination breakdowns account for 36.9% of all multi-agent LLM system failures**, with inter-agent misalignment failures observed at rates of 41%–86.7% across 7 production MAS frameworks on 1,642 annotated traces.

SHIELDA (arXiv:2508.07935) adds a complementary view: across 12 agent artifacts and 36 exception types, **Task Flow failures (error propagation, missing information, task dependency exceptions) and Other Agent failures (protocol mismatch, agent conflict, communication exceptions) are exactly the exception classes that fire when payment steps fail in a chain**. These are not edge cases — they are the dominant runtime failure mode of any agent system doing real work across service boundaries.

The consequence for FlowLink: any production agent using FlowLink to orchestrate multi-step paid workflows will experience fund loss and unrecoverable state with no current remediation path.

---

## 2. Failure Taxonomy Applied to Payment Chains

### 2.1 MAST 14 Failure Modes — Payment Relevance Mapping

| MAST Failure Mode | Category | Maps to Payment Failure | Saga Mitigation |
|---|---|---|---|
| Step repetition (15.7%) | System Design | Double payment on retry | Idempotency keys per step |
| Reasoning-action mismatch (13.2%) | System Design | Wrong amount paid, wrong recipient | Pre-commit intent validation |
| Context loss | System Design | Agent forgets prior payment state | Durable workflow context |
| Conversation resets | Inter-Agent | Sub-agent loses payment flow context | Saga state externalised from LLM context |
| Failure to seek clarification | Inter-Agent | Agent proceeds with ambiguous payment params | Policy gate before commit |
| Task derailment | Inter-Agent | Payment chain diverts to unauthorized recipient | Spend policy enforcement |
| Information withholding | Inter-Agent | Sub-agent does not report payment failure | Mandatory result acks |
| Ignoring other agents' input | Inter-Agent | Compensation signal ignored | Signed compensation receipts |
| Premature termination | Task Verification | Workflow marked complete before settlement | On-chain settlement confirmation |
| Incomplete verification | Task Verification | Payment assumed received without confirmation | Receipt-gated next step |

### 2.2 SHIELDA Exception Classes Critical to Payment Sagas

From the 36-exception / 12-artifact taxonomy, these fire specifically during payment workflow execution:

**Task Flow Artifact (4 exceptions):**
- `TaskDependencyException` — downstream payment step fails because upstream escrow was not confirmed
- `ErrorPropagation` — a failed sanction check at step 2 cascades without triggering compensation at step 1
- `StoppingTooEarly` — saga marks itself complete when only the payment was sent, not the service delivered
- `MissingInformation` — payment confirmation not propagated from sub-agent to orchestrator

**Other Agent Artifact (4 exceptions):**
- `CommunicationException` — payment receipt message from sub-agent is ignored or lost
- `AgentConflict` — two agents attempt to submit the same compensation transaction
- `RoleViolation` — sub-agent initiates refund it was not authorized to execute
- `ProtocolMismatch` — compensation request uses stale x402 schema version

**SHIELDA's triadic handler pattern** (Local Handling + Flow Control + State Recovery) maps directly to saga compensation: retry → skip-failed-step → rollback. Their "Fallback Escalation" path (exhaust all recovery, escalate to human supervisor) is exactly what FlowLink needs as the final tier of its circuit breaker.

### 2.3 arXiv:2601.04583 — Cross-Protocol Trust Boundaries

"Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries" (Alqithami, 2026) provides the blockchain-specific failure surface:

**Intent-Execution Mismatch:** An agent formulates a payment intent that is valid at planning time but fails during execution due to MEV extraction, oracle manipulation, or state changes between simulation and broadcast. For FlowLink: a multi-step saga can have its step-3 payment front-run on-chain while the off-chain saga state believes the payment is in-flight.

**Policy Enforcement Breakdown (Class 3):** Middleware-layer compliance checks (FlowLink's before-settle hook) become disconnected from actual chain execution under adversarial conditions. A saga orchestrator must treat each settlement as potentially having diverged from the compliance-cleared intent.

**Multi-Agent Collusion (Class 7):** In a payment chain A→B→C→D, agents B and C could collude to falsely report step completion, triggering full saga payment without actual service delivery. Saga design must include independent verification gates, not just agent-reported status.

**Key design constraint from this paper:** "Layer 4: Execution Controls and Circuit Breakers" — rollback mechanisms are required but not formalized in any existing blockchain agent standard. FlowLink has an opportunity to define this primitive.

---

## 3. Orchestration Approaches: Deep Technical Analysis

### 3.1 Temporal.io — Durable Execution Sagas

**How compensating transactions work:**

Temporal's saga model is code-first: the workflow function IS the state machine. Compensations are registered as deferred functions before each forward activity executes. On any failure, Temporal replays the workflow history (event-sourced) and executes deferred compensations in reverse order.

Critical implementation rule — register compensation BEFORE executing the forward step:
```go
// CORRECT: compensation registered before action
saga.AddCompensation(cancelEscrowActivity)
err = workflow.ExecuteActivity(ctx, fundEscrowActivity, params).Get(ctx, nil)

// WRONG: compensation registered after action — gap if action succeeds but registration fails
err = workflow.ExecuteActivity(ctx, fundEscrowActivity, params).Get(ctx, nil)
saga.AddCompensation(cancelEscrowActivity) // never reached if crash here
```

Production Go pattern for a 5-step payment saga:
```go
func PaymentSagaWorkflow(ctx workflow.Context, intent PaymentSagaIntent) error {
    retryPolicy := &temporal.RetryPolicy{
        InitialInterval:    time.Second,
        BackoffCoefficient: 2.0,
        MaximumInterval:    30 * time.Second,
        MaximumAttempts:    3,
    }
    ao := workflow.ActivityOptions{
        StartToCloseTimeout: 2 * time.Minute,
        RetryPolicy:         retryPolicy,
    }
    ctx = workflow.WithActivityOptions(ctx, ao)

    var compensations []func(workflow.Context)

    defer func() {
        if err := recover(); err != nil {
            // execute in reverse order
            for i := len(compensations) - 1; i >= 0; i-- {
                compensations[i](ctx)
            }
        }
    }()

    // Step 1: Lock compliance clearance
    var clearanceID string
    compensations = append(compensations, func(c workflow.Context) {
        _ = workflow.ExecuteActivity(c, ReleaseClearanceActivity, clearanceID).Get(c, nil)
    })
    if err := workflow.ExecuteActivity(ctx, AcquireComplianceClearanceActivity, intent).
        Get(ctx, &clearanceID); err != nil {
        return err
    }

    // Step 2: Fund escrow (ERC-8183 Job creation + fund())
    var jobID string
    compensations = append(compensations, func(c workflow.Context) {
        _ = workflow.ExecuteActivity(c, RejectEscrowJobActivity, jobID).Get(c, nil)
    })
    if err := workflow.ExecuteActivity(ctx, CreateAndFundEscrowJobActivity, intent, clearanceID).
        Get(ctx, &jobID); err != nil {
        return err
    }

    // Step 3: Dispatch sub-agent task
    var taskRef string
    compensations = append(compensations, func(c workflow.Context) {
        _ = workflow.ExecuteActivity(c, CancelSubAgentTaskActivity, taskRef).Get(c, nil)
    })
    if err := workflow.ExecuteActivity(ctx, DispatchSubAgentActivity, intent, jobID).
        Get(ctx, &taskRef); err != nil {
        return err
    }

    // Step 4: Wait for deliverable + verify (signals from sub-agent)
    var deliverable DeliverableResult
    if err := workflow.ExecuteActivity(ctx, WaitAndVerifyDeliverableActivity, taskRef).
        Get(ctx, &deliverable); err != nil {
        return err
    }

    // Step 5: Complete escrow (ERC-8183 complete() — irreversible)
    return workflow.ExecuteActivity(ctx, CompleteEscrowJobActivity, jobID, deliverable).
        Get(ctx, nil)
}
```

**Payment rollback handling:**
- Steps 1–4 are reversible; step 5 (`complete()`) is terminal and irreversible
- Compensation for step 2 calls ERC-8183 `reject()` which returns funds to client with no fees deducted
- Compensation for step 3 sends a cancellation signal to the sub-agent's own Temporal workflow
- Temporal guarantees at-least-once execution of compensations through workflow replay

**Idempotency requirements:**
- Every activity that touches on-chain state MUST be idempotent
- Use deterministic workflow IDs (`workflowID = "saga-" + paymentIntentHash`) to prevent duplicate starts
- Activities use idempotency keys derived from `(workflowID, activityType, attemptNumber)` passed to on-chain calls

**Latency characteristics:**
- Temporal workflow overhead per step: ~5–20ms (in-cluster, same AZ)
- Activity round-trip including Temporal server: ~10–50ms
- Total saga overhead for a 5-step chain: ~50–250ms additional latency on top of underlying service calls
- Dapper Labs case: replaced custom event-sourcing engine, achieved 50–60% developer velocity improvement, 30–40% code reduction, demonstrated reliable handling of NBA Top Shot reservation queues with extended timeout periods
- For blockchain steps (on-chain ERC-8183 calls): dominant latency is block confirmation time (Base: ~2s, Ethereum: ~12s), not Temporal overhead

**Constraints for FlowLink:**
- Workflow-level timeouts (`WorkflowExecutionTimeout`) must NOT be set — they block `defer` compensation execution
- `Terminate` and `Reset` operations bypass `defer` — expose these only to admin roles with explicit confirmation
- All activity functions must be deterministic (no `time.Now()`, no random UUIDs inside activity bodies — derive these from workflow inputs)

**Applicability to agent-to-agent payment chains:** Direct. Temporal workflows can represent an entire agent payment chain as a single durable execution. Sub-agent calls become child workflows or activities. The orchestrating Temporal server survives crashes, network partitions, and deployments — the saga resumes exactly where it left off.

---

### 3.2 Netflix Conductor / Orkes — Agent-Native Orchestration

**How compensating transactions work:**

Conductor OSS (the successor to Netflix Conductor) is the only open-source workflow engine with native LLM task types for 14+ providers. It handles saga-like patterns through:

1. **Compensation workflows** — a separate workflow definition that runs when the primary workflow fails; each task definition can specify a `compensationWorkflow` reference
2. **Event-driven compensation** — a failed task publishes a failure event; compensation tasks subscribe and execute inverse operations
3. **Sub-workflow rollback** — nested workflows can signal cancellation up the parent chain

Native AI task types relevant to FlowLink:
- `LLM_TEXT_COMPLETE` / `LLM_CHAT_COMPLETE` — for agent reasoning steps within a payment saga
- `LIST_MCP_TOOLS` / `CALL_MCP_TOOL` — for MCP-exposed FlowLink tool invocations (create-invoice, screen, etc.)
- `HTTP` — for calling FlowLink API payment endpoints

**Key Conductor advantage over Temporal:** JSON-defined workflows (not code-first). This means a FlowLink customer can define their agent payment saga in JSON without writing Go/TypeScript workflow code. The tradeoff is less expressive compensation logic — Conductor does not have native `defer`-stack-style reverse compensation; it requires explicit compensation task configuration per step.

**Saga applicability rating for FlowLink:** Medium. Conductor is better suited for deterministic workflows where the saga steps and their compensations are known at design time. For emergent agent workflows where compensation logic depends on runtime state, Temporal is stronger.

**Latency:** Similar to Temporal — workflow engine overhead of 10–50ms per task transition. LLM task types add the underlying model's inference latency on top.

---

### 3.3 LangGraph — Transactional Agentic Patterns

**Two-phase commit in LangGraph:**

LangGraph's checkpointing + graph interrupt system enables a 2PC-like pattern:

```
Phase 1 (Prepare): Agent stages reversible changes, validates invariants,
                   pauses at interrupt() node for human/supervisor approval
Phase 2 (Commit):  On approval signal, commit node executes irreversible actions
                   On rejection signal, rollback node executes compensations
```

Implementation uses `interrupt()` to pause graph execution at any node and `Command(resume=value)` to continue with a decision:

```python
from langgraph.graph import StateGraph, START
from langgraph.types import interrupt, Command
from typing import TypedDict, Annotated
import operator

class PaymentSagaState(TypedDict):
    intent: PaymentIntent
    clearance_id: str | None
    escrow_job_id: str | None
    sub_agent_task_ref: str | None
    deliverable: dict | None
    compensation_log: Annotated[list[str], operator.add]
    phase: str  # "prepare" | "commit" | "compensate"

def acquire_clearance(state: PaymentSagaState) -> PaymentSagaState:
    clearance_id = flowlink_client.acquire_compliance_clearance(state["intent"])
    return {"clearance_id": clearance_id, "phase": "clearance_acquired"}

def fund_escrow(state: PaymentSagaState) -> PaymentSagaState:
    job_id = erc8183_client.create_and_fund(state["intent"], state["clearance_id"])
    return {"escrow_job_id": job_id, "phase": "escrow_funded"}

def approval_gate(state: PaymentSagaState):
    # Pauses graph; waits for external signal (human, supervisor agent, SLA verifier)
    decision = interrupt({"state": state, "awaiting": "payment_approval"})
    if decision != "approve":
        return Command(goto="compensate_from_escrow")
    return Command(goto="dispatch_sub_agent")

def compensate_from_escrow(state: PaymentSagaState) -> PaymentSagaState:
    erc8183_client.reject(state["escrow_job_id"], reason="saga_compensation")
    flowlink_client.release_clearance(state["clearance_id"])
    return {"compensation_log": ["escrow_rejected", "clearance_released"], "phase": "compensated"}
```

**Rollback mechanics:**
- LangGraph checkpointer (Postgres, Redis, or in-memory) persists state at every node transition
- On failure, the graph can be replayed from any checkpoint to re-execute from a known-good state
- Compensation nodes are explicit graph nodes, not deferred functions — this means they appear in the visual graph and are auditable

**Critical limitation for payment chains:** LangGraph's state is Python in-memory (or persisted to a configured checkpointer). Unlike Temporal, it does NOT provide:
- Built-in retry with exponential backoff at the activity level
- Automatic worker crash recovery (you must implement this yourself with your checkpointer)
- Distributed execution across multiple processes without additional infrastructure (LangGraph Platform / LangGraph Cloud addresses this but adds dependency)

**Applicability to FlowLink:** Good for agent-reasoning-heavy workflows where the LLM itself participates in deciding whether to commit or compensate. Poor for high-throughput payment pipelines (thousands of concurrent sagas) where Temporal's worker pool model outperforms.

---

### 3.4 ERC-8183 — On-Chain Escrow as Saga Primitive

**State machine as saga backbone:**

ERC-8183 provides a 6-state escrow primitive that maps directly to a payment saga step:

```
Open → Funded → Submitted → Completed   (happy path, funds released)
                          → Rejected    (compensation: full refund to client, no fees)
         → Expired                      (timeout compensation: permissionless claimRefund)
```

The key insight: **ERC-8183 is itself a saga compensating transaction primitive**. The `reject()` function IS the compensation for `fund()`. The `claimRefund()` function is the timeout-based fallback compensation that cannot be blocked by any hook.

**Hook system for saga orchestration:**

```solidity
interface IACPHook is IERC165 {
    function beforeAction(uint256 jobId, bytes4 selector, bytes calldata data) external;
    function afterAction(uint256 jobId, bytes4 selector, bytes calldata data) external;
}
```

Before-hooks fire before state changes — use for:
- Validating FlowLink compliance clearance exists before `fund()` executes
- Checking sub-agent reputation score before `setProvider()` executes
- Enforcing budget caps before `setBudget()` executes

After-hooks fire after state changes, within the same transaction — use for:
- Emitting saga coordination events atomically with the state change
- Updating a parent job's state when a sub-job completes
- Triggering the next step in a chained saga

**Atomicity guarantee:** If an after-hook reverts, the ENTIRE transaction rolls back including the core ERC-8183 state change. This enables atomic multi-step flows: `fund()` + "register in saga coordinator" must both succeed or both revert.

**Chaining ERC-8183 jobs for a multi-agent saga:**

```
Parent Job (Client A → Orchestrator Agent B):
  JobID=1: Client A funds 100 USDC → Orchestrator B

  After fund() hook fires → Orchestrator B creates:
    Sub-Job 2 (Orchestrator B → Specialist Agent C): 40 USDC
    Sub-Job 3 (Orchestrator B → Specialist Agent D): 40 USDC
    (20 USDC retained by Orchestrator B as coordination fee)

  When Sub-Job 2 completes → after-hook fires → decrements Parent Job pending counter
  When Sub-Job 3 completes → after-hook fires → decrements counter → triggers Parent Job complete()

Compensation chain:
  If Sub-Job 2 is rejected → after-hook fires reject() on Sub-Job 3
  → after-hook fires reject() on Parent Job (refund to Client A)
```

**Non-hookable refund as saga safety net:** `claimRefund()` is intentionally excluded from the hook system. This means a stuck saga (hook permanently reverting, agent offline) cannot permanently strand funds — any party can call `claimRefund()` after `expiredAt` passes. **This is the most important safety property for FlowLink**: even if the saga orchestrator crashes and never recovers, client funds return automatically.

**Payment rollback latency for ERC-8183:**
- `reject()` on Base: ~2 second block time + gas (negligible on Base, ~$0.001)
- `claimRefund()` after expiry: same block time, permissionless, gas paid by caller
- For multi-hop chains: each hop adds one transaction's worth of latency; 5-hop chain ≈ 10 seconds end-to-end for full compensation cascade on Base

**Applicability to FlowLink:** ERC-8183 should be FlowLink's on-chain saga primitive for all EVM payment flows. Its hook system is the integration point for FlowLink's compliance layer (before-hooks) and saga coordination logic (after-hooks). The timeout-based `claimRefund()` eliminates the "stranded funds" failure mode entirely.

---

## 4. Comparative Analysis

| Dimension | Temporal | Conductor/Orkes | LangGraph | ERC-8183 |
|---|---|---|---|---|
| **Compensation model** | Deferred function stack (reverse order) | Explicit compensation workflow per task | Explicit compensation nodes in graph | `reject()` + `claimRefund()` on-chain |
| **Payment rollback** | Activity calls on-chain revert/cancel endpoints | HTTP task calls rollback APIs | Node calls rollback services | Atomic on-chain state revert with full refund |
| **Durability** | Event-sourced, survives worker crashes | Event-sourced, similar durability | Checkpointer-dependent (Postgres/Redis required) | Immutable blockchain state |
| **Latency (saga overhead)** | 5–50ms per step | 10–50ms per step | 1–10ms (in-memory) / 10–100ms (checkpointed) | 2–12s per step (block time) |
| **LLM/Agent native** | No (requires wrappers) | Yes (14+ LLM providers native) | Yes (built for LangChain agents) | No (smart contract only) |
| **Idempotency** | Workflow-ID-scoped, built-in | Task-ID-scoped, built-in | Manual (checkpointer handles state, not retries) | Transaction-level (on-chain state is authoritative) |
| **Timeout handling** | `ScheduleToCloseTimeout` + retry policy | Task timeout + retry count | `interrupt()` timeout + graph expiry | `expiredAt` timestamp + permissionless `claimRefund()` |
| **Compensation atomicity** | Sequential by default, `setParallelCompensation()` for parallel | Sequential | Sequential | Single transaction atomic (within Ethereum block) |
| **Failure visibility** | Temporal UI + event history | Conductor UI + task execution history | LangSmith trace + checkpointer state | On-chain event logs (immutable, public) |
| **Multi-protocol** | Any (activities are arbitrary code) | Any (HTTP + native AI tasks) | Any (nodes are arbitrary Python) | EVM-only |
| **Stranded funds risk** | Low (workflow resumes after crash) | Low | Medium (requires checkpointer availability) | None (`claimRefund()` is unconditional after expiry) |

**For agent-to-agent payment chains specifically:**

The optimal architecture is a layered combination:
1. **Temporal** as the off-chain saga orchestrator (durable state, retry policies, compensation stack)
2. **ERC-8183** as the on-chain escrow primitive per saga step (atomic fund lock/release)
3. **FlowLink's before/after-settle hooks** as the compliance gate within each Temporal activity
4. **SHIELDA's triadic handler patterns** as the exception classification and escalation framework when a saga step fires an unexpected exception class

---

## 5. FlowLink Implementation Design

### 5.1 Architecture: `SagaOrchestrator` Service

```
FlowLink SagaOrchestrator
├── Temporal Worker Pool
│   ├── PaymentSagaWorkflow        (orchestrates steps, owns compensation stack)
│   ├── ComplianceClearanceActivity (acquires/releases FlowLink compliance lock)
│   ├── EscrowJobActivity           (ERC-8183 create + fund + reject/complete)
│   ├── SubAgentDispatchActivity    (A2A/ACP/x402 dispatch with signed receipts)
│   ├── DeliverableVerifyActivity   (waits for deliverable hash, verifies against EAS)
│   └── SagaCircuitBreakerActivity  (SHIELDA escalation: retry → skip → abort → human)
├── ERC-8183 Hook Contracts
│   ├── FlowLinkBeforeHook          (compliance gate on fund(), setProvider())
│   └── FlowLinkAfterHook           (saga event emission, parent job coordination)
└── Saga State API
    ├── GET  /saga/:id               (current step, compensation log, ERC-8183 job IDs)
    ├── POST /saga/:id/signal        (inject external signal: approval, rejection, timeout)
    └── GET  /saga/:id/audit-trail   (full event history + on-chain tx hashes)
```

### 5.2 Core TypeScript Interface

```typescript
// packages/core/src/saga/types.ts

export type SagaStepStatus =
  | "pending"
  | "executing"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

export interface SagaStep {
  id: string;
  name: string;
  status: SagaStepStatus;
  // Forward action
  execute: () => Promise<SagaStepResult>;
  // Compensating action — MUST be idempotent
  compensate: () => Promise<void>;
  // Timeout after which compensation fires automatically (ms)
  timeoutMs: number;
  // ERC-8183 job ID if this step has an on-chain escrow
  escrowJobId?: string;
}

export interface SagaStepResult {
  success: boolean;
  data?: Record<string, unknown>;
  // If this step created an on-chain escrow job, record it
  escrowJobId?: string;
  txHash?: string;
  // SHIELDA exception class if this step failed
  exceptionClass?: SHIELDAExceptionClass;
}

export type SHIELDAExceptionClass =
  | "TaskDependencyException"
  | "ErrorPropagation"
  | "StoppingTooEarly"
  | "MissingInformation"
  | "CommunicationException"
  | "AgentConflict"
  | "RoleViolation"
  | "ProtocolMismatch"
  | "ToolInvocationException"
  | "APIInvocationException"
  | "ExternalAttack";

export interface PaymentSagaIntent {
  sagaId: string; // deterministic: sha256(clientDID + receiverDID + amount + nonce)
  clientDID: string;
  steps: SagaStepDefinition[];
  totalBudgetUsdc: string;
  timeoutMs: number;
  complianceClearanceRequired: boolean;
  // ERC-8183 escrow params
  escrowExpiredAt: number; // Unix timestamp — must be > saga timeout
  evaluatorAddress: string; // FlowLink's evaluator contract or client's address
}
```

### 5.3 Compensation Registration Pattern (TypeScript)

```typescript
// packages/core/src/saga/orchestrator.ts

export class PaymentSagaOrchestrator {
  private compensations: Array<() => Promise<void>> = [];

  async execute(intent: PaymentSagaIntent): Promise<SagaResult> {
    try {
      return await this.runSteps(intent);
    } catch (err) {
      await this.runCompensations();
      throw err;
    }
  }

  private async runSteps(intent: PaymentSagaIntent): Promise<SagaResult> {
    const results: SagaStepResult[] = [];

    for (const stepDef of intent.steps) {
      // Register compensation BEFORE executing — critical ordering
      this.compensations.push(stepDef.compensate);

      const result = await this.executeWithClassification(stepDef);
      results.push(result);

      if (!result.success) {
        // SHIELDA: classify exception and determine handler pattern
        const handler = this.exceptionRegistry.getHandler(result.exceptionClass);
        const handled = await handler.handle(result, stepDef);

        if (!handled) {
          // Exhaust local handling → escalate
          await this.escalate(intent.sagaId, result);
          throw new SagaStepError(stepDef.name, result);
        }
      }
    }

    return { status: "completed", steps: results };
  }

  private async runCompensations(): Promise<void> {
    // Execute in reverse order — LIFO
    for (let i = this.compensations.length - 1; i >= 0; i--) {
      try {
        await this.compensations[i]();
      } catch (compensationErr) {
        // Log but continue — partial compensation is better than none
        // Emit saga:compensation:failed event for monitoring
        this.emitCompensationFailure(i, compensationErr);
      }
    }
  }

  private async executeWithClassification(
    step: SagaStepDefinition
  ): Promise<SagaStepResult> {
    try {
      return await Promise.race([
        step.execute(),
        this.timeoutPromise(step.timeoutMs, step.name),
      ]);
    } catch (err) {
      return {
        success: false,
        exceptionClass: this.classifyException(err),
      };
    }
  }
}
```

### 5.4 ERC-8183 Escrow Activity

```typescript
// packages/core/src/saga/activities/escrow-job.activity.ts

export interface EscrowJobActivity {
  // Forward: create ERC-8183 job and fund it; returns jobId
  createAndFund(intent: PaymentSagaIntent): Promise<{ jobId: bigint; txHash: string }>;

  // Compensation: call reject() — full refund to client, no fees
  reject(jobId: bigint, reason: string): Promise<{ txHash: string }>;

  // Terminal (irreversible): call complete() — funds released to provider
  complete(jobId: bigint, deliverableHash: `0x${string}`): Promise<{ txHash: string }>;

  // Timeout fallback: permissionless after expiredAt — cannot be blocked
  claimRefund(jobId: bigint): Promise<{ txHash: string }>;
}
```

### 5.5 FlowLink Hook Contract (ERC-8183 Integration)

```solidity
// contracts/FlowLinkSagaHook.sol

interface IACPHook {
    function beforeAction(uint256 jobId, bytes4 selector, bytes calldata data) external;
    function afterAction(uint256 jobId, bytes4 selector, bytes calldata data) external;
}

contract FlowLinkSagaHook is IACPHook, IERC165 {
    // FlowLink compliance oracle — gates fund() calls
    IFlowLinkComplianceOracle public immutable oracle;
    // Saga coordinator — receives after-action events
    IFlowLinkSagaCoordinator public immutable coordinator;

    bytes4 constant FUND_SELECTOR = bytes4(keccak256("fund(uint256,bytes)"));
    bytes4 constant SET_PROVIDER_SELECTOR = bytes4(keccak256("setProvider(uint256,address)"));
    bytes4 constant COMPLETE_SELECTOR = bytes4(keccak256("complete(uint256,bytes32,bytes)"));
    bytes4 constant REJECT_SELECTOR = bytes4(keccak256("reject(uint256,bytes32,bytes)"));

    function beforeAction(uint256 jobId, bytes4 selector, bytes calldata data) external {
        if (selector == FUND_SELECTOR) {
            // Require compliance clearance exists for this job
            require(
                oracle.hasClearance(jobId),
                "FlowLink: compliance clearance required before funding"
            );
        }
        if (selector == SET_PROVIDER_SELECTOR) {
            (address provider,) = abi.decode(data, (address, bytes));
            // Require provider has ERC-8004 registry entry (KYA check)
            require(
                oracle.isRegisteredAgent(provider),
                "FlowLink: provider must be a registered agent"
            );
        }
    }

    function afterAction(uint256 jobId, bytes4 selector, bytes calldata data) external {
        // Emit to saga coordinator — atomic with the core state change
        // If this reverts, the entire transaction (including fund/complete/reject) rolls back
        coordinator.onJobStateChange(jobId, selector, data);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IACPHook).interfaceId
            || interfaceId == type(IERC165).interfaceId;
    }
}
```

### 5.6 SHIELDA Exception Handler Registry

```typescript
// packages/core/src/saga/exception-registry.ts

export class SHIELDAExceptionRegistry {
  private handlers: Map<SHIELDAExceptionClass, ExceptionHandler> = new Map([
    // Tool/API failures: retry with backoff (Pattern P018)
    ["ToolInvocationException", new RetryWithBackoffHandler({ maxAttempts: 3, baseDelayMs: 1000 })],
    ["APIInvocationException", new RetryWithBackoffHandler({ maxAttempts: 3, baseDelayMs: 1000 })],
    // Protocol mismatch: skip step + log (Pattern P024)
    ["ProtocolMismatch", new SkipAndLogHandler()],
    // Task dependency failure: abort + compensate (Pattern P031)
    ["TaskDependencyException", new AbortAndCompensateHandler()],
    // Error propagation: compensate immediately, do not propagate further (Pattern P033)
    ["ErrorPropagation", new AbortAndCompensateHandler()],
    // Agent conflict: idempotency check + deduplicate (Pattern P041)
    ["AgentConflict", new IdempotencyDeduplicateHandler()],
    // Communication exception: retry with different channel (Pattern P016)
    ["CommunicationException", new AlternateChannelRetryHandler()],
    // Role violation: escalate to human supervisor immediately (Pattern P048)
    ["RoleViolation", new ImmediateEscalationHandler()],
    // External attack: circuit break + escalate (Pattern P048)
    ["ExternalAttack", new CircuitBreakAndEscalateHandler()],
    // Missing information: request from sub-agent before proceeding (Pattern P019)
    ["MissingInformation", new RequestMissingInfoHandler({ timeoutMs: 30_000 })],
    // Stopping too early: verify completion before marking done (Pattern P027)
    ["StoppingTooEarly", new VerifyCompletionHandler()],
  ]);

  getHandler(cls: SHIELDAExceptionClass | undefined): ExceptionHandler {
    if (!cls) return this.handlers.get("ErrorPropagation")!;
    return this.handlers.get(cls) ?? new AbortAndCompensateHandler();
  }
}
```

### 5.7 Saga State Machine (State Transitions)

```
[INIT]
  → compliance_clearance_acquire → [CLEARANCE_ACQUIRED]
      compensate: release_clearance
  → escrow_create_and_fund → [ESCROW_FUNDED]
      compensate: escrow_reject (ERC-8183 reject() → full refund)
  → sub_agent_dispatch → [TASK_DISPATCHED]
      compensate: sub_agent_cancel
  → deliverable_verify → [DELIVERABLE_VERIFIED]
      compensate: deliverable_invalidate (no on-chain action, just state)
  → escrow_complete (IRREVERSIBLE) → [COMPLETED]

Timeout path (any step):
  → [TIMED_OUT]
  → compensations execute in reverse
  → ERC-8183 claimRefund() available after expiredAt (permissionless)

Failure path:
  → SHIELDA handler: retry / skip / abort
  → if abort: compensations execute in reverse → [COMPENSATED]
  → if escalate: → [PENDING_HUMAN_REVIEW]
```

---

## 6. Failure Propagation Analysis for Payment Chains

### 6.1 Cascading Failure Scenarios and Mitigations

**Scenario 1: Sub-agent crashes mid-execution**
- Detection: `SubAgentDispatchActivity` timeout fires
- SHIELDA class: `CommunicationException`
- Handler: retry 3x with alternate channel → on exhaustion: `AbortAndCompensateHandler`
- Compensation: cancel sub-agent task + reject ERC-8183 escrow → full refund to client
- ERC-8183 safety net: even if compensation fails, `claimRefund()` fires after `expiredAt`

**Scenario 2: On-chain transaction front-run (MEV)**
- Detection: `EscrowJobActivity.createAndFund()` returns success but `JobID` state is inconsistent with oracle
- SHIELDA class: `ExternalAttack`
- Handler: `CircuitBreakAndEscalateHandler` — suspend saga, alert human
- Compensation: attempt `reject()` on any funded jobs → if gas war: wait for `expiredAt` + `claimRefund()`
- Mitigation upstream: use Flashbots private mempool for all ERC-8183 transactions

**Scenario 3: Double compensation (AgentConflict)**
- Detection: Two workers both trigger compensation for the same step
- SHIELDA class: `AgentConflict`
- Handler: `IdempotencyDeduplicateHandler` — check ERC-8183 job status before calling `reject()`; if already `Rejected`, no-op
- ERC-8183 guarantee: `reject()` is idempotent — calling it on an already-rejected job reverts with no state change

**Scenario 4: Compliance hook reverts after fund()**
- ERC-8183 behavior: if `afterAction` hook reverts, the entire `fund()` transaction is rolled back atomically — funds never leave client
- SHIELDA class: `APIInvocationException` (compliance oracle unreachable)
- Handler: `RetryWithBackoffHandler` → if oracle remains unavailable → saga cannot proceed → `claimRefund()` path

**Scenario 5: Temporal worker crash mid-compensation**
- Temporal durability: workflow event history is persisted; worker restart replays from last checkpoint
- The saga resumes compensation from the point of failure — deferred compensations not yet executed are re-run
- At-least-once guarantee means compensations must be idempotent (`reject()` on an already-rejected ERC-8183 job is safe)

**Scenario 6: Nested saga (A → B → C → D) partial failure**
- MAST inter-agent misalignment (36.9% of failures): Agent C fails but does not propagate failure to B
- Detection: Parent Temporal workflow's `WaitAndVerifyDeliverableActivity` times out
- SHIELDA: `MissingInformation` at the Task Flow level
- Compensation cascades: Temporal sends cancellation signal to B's child workflow → B compensates its sub-jobs → C's ERC-8183 escrow expires → `claimRefund()` available
- Key design rule: **every sub-agent job MUST have a shorter `expiredAt` than its parent job** to ensure compensation ordering is correct (innermost jobs expire and can be reclaimed before outer jobs)

---

## 7. Latency Budget for a 5-Step Payment Saga

Assuming Base L2 deployment:

| Step | Component | Latency |
|---|---|---|
| Compliance clearance | FlowLink AML + TRM/Chainalysis API | 100–500ms |
| ERC-8183 create + fund | Block confirmation on Base | ~2s |
| FlowLink before-hook validation | On-chain oracle call + gas | ~2s (same tx) |
| Sub-agent dispatch (A2A/ACP) | Network + agent reasoning | 500ms–5s |
| Deliverable verification | EAS attestation lookup | 200–500ms |
| ERC-8183 complete | Block confirmation on Base | ~2s |
| Temporal saga overhead | Per-step workflow processing | ~50–250ms total |
| **Total (happy path)** | | **~7–12 seconds** |
| **Total (with compensation, 3 steps)** | | **~4–6 additional seconds** |

**Comparison to current FlowLink x402 flow:** A single x402 payment with compliance is ~300–700ms. The saga adds 7–12s for a 5-step flow. This is acceptable for high-value, multi-step workflows (agent pipelines, B2B orchestration) but NOT suitable for sub-second micropayments. Saga orchestration is explicitly for complex multi-step flows; streaming micropayments remain a separate architecture.

---

## 8. What Doesn't Exist Yet (Gaps Within the Gap)

The research reveals several second-order gaps that FlowLink will need to solve:

1. **No saga-aware agent identity**: When an agent calls `reject()` on an ERC-8183 job as a compensation, there is no standard for proving that this agent was authorized to perform that compensation (vs. an attacker calling `reject()` to steal the refund). FlowLink needs a signed compensation authorization attached to each saga step.

2. **No cross-protocol saga correlation**: If step 2 uses x402 and step 4 uses ACP, the saga orchestrator must maintain a unified correlation ID that links both payment protocol flows. No existing standard provides this. FlowLink's `sagaId` (sha256 of intent params) is the proposed correlation primitive.

3. **No saga-level compliance receipt**: Current FlowLink `SettlementResult` covers a single payment. A multi-step saga needs a composite receipt that covers all steps with their individual compliance checks and the final compensation state. This is needed for VASP-to-VASP Travel Rule reporting.

4. **LangGraph 2PC without Temporal durability**: LangGraph's `interrupt()` mechanism provides the approval-gate primitive but lacks Temporal's crash recovery. A production FlowLink deployment should use LangGraph for the agent reasoning portions and Temporal for the durable execution backbone — not one or the other exclusively.

5. **MAST coordination failures are not caught by ERC-8183**: On-chain escrow protects funds. It does NOT protect against the 36.9% MAST coordination failure rate where agents fail to communicate properly. The saga orchestrator must treat every sub-agent result as potentially erroneous and verify independently (e.g., EAS attestation of deliverable hash, not just agent self-report).

---

## 9. Implementation Roadmap for FlowLink

### Phase 1 — Foundation (Weeks 1–4)
- [ ] Define `PaymentSagaIntent` schema in `packages/shared/src/types/`
- [ ] Implement `SagaOrchestrator` class with compensation stack in `packages/core/src/saga/`
- [ ] Build `EscrowJobActivity` wrapping ERC-8183 `createAndFund()`, `reject()`, `complete()`, `claimRefund()`
- [ ] Implement `SHIELDAExceptionRegistry` with 11 handler patterns covering payment-relevant exception classes
- [ ] Add `SagaResult` to `SettlementResult` type (backward-compatible extension)

### Phase 2 — Temporal Integration (Weeks 5–8)
- [ ] Stand up Temporal cluster (self-hosted or Temporal Cloud)
- [ ] Wrap `PaymentSagaOrchestrator` as a Temporal Workflow with proper Activity definitions
- [ ] Implement idempotency keys for all blockchain-touching activities
- [ ] Build Saga State API (`GET /saga/:id`, `POST /saga/:id/signal`, `GET /saga/:id/audit-trail`)
- [ ] Temporal worker pool config: separate task queues for compliance, escrow, and sub-agent activities

### Phase 3 — On-Chain Hooks (Weeks 9–12)
- [ ] Deploy `FlowLinkSagaHook` contract implementing `IACPHook`
- [ ] Integrate compliance oracle contract (reads FlowLink off-chain clearance into on-chain state)
- [ ] Deploy `FlowLinkSagaCoordinator` contract that receives after-action events
- [ ] Audit hook contracts: verify reentrancy protection, non-hookable `claimRefund()`, idempotent `reject()`
- [ ] Test nested saga with 3-level job chain (parent → orchestrator → 2 specialists)

### Phase 4 — Observability and Testing (Weeks 13–16)
- [ ] Instrument saga steps with OpenTelemetry spans (align with GenAI semantic conventions draft)
- [ ] Emit `saga:step:executed`, `saga:compensation:fired`, `saga:completed`, `saga:failed` webhook events
- [ ] Build chaos test suite: worker crash mid-step, ERC-8183 hook revert, sub-agent silent failure, MEV front-run simulation
- [ ] Integrate MAST-Data annotated failure traces as test fixtures for saga exception classification

---

## 10. Key Design Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| Off-chain saga engine | Temporal over Conductor | Temporal's code-first compensation stack is more expressive for dynamic payment chains than Conductor's JSON-defined compensation workflows |
| On-chain escrow primitive | ERC-8183 exclusively for EVM | Most mature spec with strongest atomicity guarantees; `claimRefund()` as unconditional timeout safety net is critical |
| Agent reasoning integration | LangGraph for reasoning nodes, Temporal for execution | LangGraph's `interrupt()` for human-in-the-loop gates; Temporal for durable execution backbone |
| Exception classification | SHIELDA taxonomy as canonical | 36 exception types across 12 artifacts covers all payment saga failure modes; provides structured escalation pathways |
| Compensation ordering | LIFO (reverse registration order) | Standard saga pattern; innermost steps compensated first ensures no resource contention |
| Idempotency | Deterministic `sagaId` derived from intent hash | Prevents duplicate saga starts; all activities use `(sagaId, stepIndex)` as idempotency key |
| Compensation atomicity | Sequential with logged partial failures | Partial compensation is always better than halting; each compensation failure is logged but does not block subsequent compensations |
| Funds safety net | ERC-8183 `expiredAt` < saga timeout | Even if all software fails, funds return to client after expiry |

---

## Sources

- [Temporal Saga Compensating Transactions](https://temporal.io/blog/compensating-actions-part-of-a-complete-breakfast-with-sagas)
- [Temporal Saga Pattern Mastery Guide](https://temporal.io/blog/mastering-saga-patterns-for-distributed-transactions-in-microservices)
- [Temporal Saga Pattern Made Easy](https://temporal.io/blog/saga-pattern-made-easy)
- [SAGA Pattern with Orchestration and Temporal.io (DEV)](https://dev.to/federico_bevione/transactions-in-microservices-part-3-saga-pattern-with-orchestration-and-temporalio-3e17)
- [Dapper Labs Optimizes Blockchain Payments with Temporal](https://temporal.io/resources/case-studies/dapperlabs-story)
- [Orkes Conductor AI Orchestration](https://orkes.io/content/ai-orchestration)
- [Conductor OSS — Event Driven Agentic Orchestration](https://conductor-oss.github.io/conductor/index.html)
- [ERC-8183: Agentic Commerce (EIP)](https://eips.ethereum.org/EIPS/eip-8183)
- [ERC-8183 Explained: The Commerce Layer for AI Agents (Dwellir)](https://www.dwellir.com/blog/erc-8183-agentic-commerce-explained)
- [MAST: Why Do Multi-Agent LLM Systems Fail? (arXiv:2503.13657)](https://arxiv.org/abs/2503.13657)
- [MAST UC Berkeley Sky Computing Lab](https://sky.cs.berkeley.edu/project/mast/)
- [SHIELDA: Structured Handling of Exceptions in LLM-Driven Agentic Workflows (arXiv:2508.07935)](https://arxiv.org/abs/2508.07935)
- [Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries (arXiv:2601.04583)](https://arxiv.org/abs/2601.04583)
- [A Novel Hierarchical Multi-Agent System for Payments Using LLMs (arXiv:2602.24068)](https://arxiv.org/abs/2602.24068)
- [Saga Orchestration Patterns — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/saga-orchestration-patterns.html)
- [LangGraph Transactional Agentic Systems with Two-Phase Commit (MarkTechPost)](https://www.marktechpost.com/2025/12/31/how-to-design-transactional-agentic-ai-systems-with-langgraph-using-two-phase-commit-human-interrupts-and-safe-rollbacks/)
- [BNBAgent SDK: First Live ERC-8183 Implementation](https://www.bnbchain.org/en/blog/bnbagent-sdk-the-first-live-erc-8183-implementation-for-onchain-ai-agents)
- [Implementing Distributed Transactions: Choreography vs Orchestration](https://www.youngju.dev/blog/architecture/2026-03-03-saga-pattern-distributed-transactions.en)
- [ZIO Temporal Sagas](https://zio-temporal.vhonta.dev/docs/resilience/sagas)
