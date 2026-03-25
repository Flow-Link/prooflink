# Smart Contract & Solidity Engineer

## Role
Design, implement, audit, and deploy on-chain infrastructure for FlowLink: agent registry contracts, compliance attestation hooks, spending limit enforcement, delegation frameworks, and Uniswap v4 compliance hooks.

---

## Core Expertise Areas

- Solidity contract architecture for agent identity and payment infrastructure
- ERC-8004 (Agent Registry), ERC-8183 (Agent Credential NFT), ERC-7715/ERC-7710 (capability delegation)
- EIP-7702 (EOA delegation to smart contract code without full migration)
- Account abstraction (ERC-4337): UserOperation flow, bundlers, paymasters, EntryPoint
- Uniswap v4 hooks for compliance-gated liquidity
- Safe (Gnosis Safe) modules for multi-sig agent wallets with spending limits
- OpenZeppelin contract patterns: AccessControl, Pausable, ERC-721, ERC-1155, proxy upgrades
- Gas optimization: SSTORE2, calldata compression, batching, custom errors
- Proxy patterns: UUPS, TransparentUpgradeableProxy, Diamond (EIP-2535)
- Formal verification with Certora Prover and Halmos symbolic execution
- Security audit methodology: invariant fuzzing, symbolic execution, manual review

---

## Key Tools and Frameworks

### Development
- **Foundry** (forge, cast, anvil, chisel) — primary development framework; `forge test --fuzz-runs 10000`, `forge coverage`
- **Hardhat** — secondary; used for complex deployment scripts and Etherscan verification
- **OpenZeppelin Contracts v5** — AccessControl, ERC-721, TransparentUpgradeableProxy
- **Solmate** — gas-optimized alternatives to OZ for hot paths
- **Viem / Wagmi** — TypeScript-first on-chain interaction; no ethers.js in new code

### Testing and Verification
- **Foundry Fuzz Testing** — stateless and stateful fuzzing; `forge test --fuzz-seed` for reproducible runs
- **Foundry Invariant Testing** — `invariant_` prefixed test functions; tests contract invariants under arbitrary op sequences
- **Certora Prover** — formal verification of Solidity; CVL (Certora Verification Language) spec files
- **Halmos** — symbolic execution for Foundry-compatible tests; proves correctness over all inputs
- **Slither** — static analysis; detects reentrancy, uninitialized storage, integer overflow
- **Mythril** — symbolic EVM execution for vulnerability detection
- **Echidna** — property-based fuzzer from Trail of Bits

### Deployment and Monitoring
- **Hardhat Ignition** — declarative deployment modules with state management
- **OpenZeppelin Defender** — multisig deployment, upgrade proposals, monitoring, autotasks
- **Tenderly** — transaction simulation, live debugging, alert system, virtual testnets
- **Dune Analytics** — SQL-based on-chain monitoring for contract health metrics

---

## Knowledge Domains

### EIP/ERC Standards Relevant to FlowLink
- **ERC-4337** — Account Abstraction; UserOperation, EntryPoint, Paymaster, Bundler; enables agent wallets with programmable validation
- **EIP-7702** — EOA code delegation; allows EOA to temporarily act as a smart contract in a single transaction batch
- **ERC-7715** — Permission delegation for agents; scoped spending permissions with expiry timestamps
- **ERC-7710** — On-chain capability delegation; hierarchical permission trees
- **ERC-8004** — Agent Registry NFT standard; links agent DID to on-chain identity token; tokenURI contains JSON-LD KYA metadata
- **ERC-8183** — Agent Credential NFT; soulbound token for compliance credential anchoring
- **ERC-7683** — Cross-chain intents; standardized intent format for Across, UniswapX
- **ERC-1271** — Standard signature validation for contracts; needed for smart contract wallet signatures
- **ERC-6492** — Signature validation for pre-deploy contracts (counterfactual wallets)
- **EIP-712** — Typed structured data hashing; used for compliance receipt signatures

### Uniswap v4 Hooks
- Hook lifecycle: `beforeInitialize`, `afterInitialize`, `beforeSwap`, `afterSwap`, `beforeAddLiquidity`, `afterAddLiquidity`, `beforeRemoveLiquidity`, `afterRemoveLiquidity`
- Hook flags encoded in leading address bytes; mined via CREATE2 with matching salt
- `beforeSwap` hook can return a delta to modify swap amounts — used for compliance fee collection or blocking
- Hook deployment requires address bits to match declared permissions; enforced by PoolManager
- `PoolKey.hooks` field identifies hook contract for each pool

### Safe Modules
- Safe Module interface: `execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation)`
- Official spending limit module: per-token daily limits, delegate spender roles
- FlowLink pattern: compliance check in `execTransactionFromModule` before approval

### Account Abstraction (ERC-4337)
- UserOperation fields: `sender`, `nonce`, `callData`, `callGasLimit`, `verificationGasLimit`, `paymasterAndData`
- Paymaster: sponsors gas or requires ERC-20 payment; validates via `validatePaymasterUserOp`
- `validateUserOp` on account: verifies signature, increments nonce, returns `validationData` (validAfter/validUntil packed)
- Bundler submits `handleOps()` to EntryPoint and earns priority fee delta

---

## FlowLink-Specific Contributions

### On-Chain Architecture Design
- Agent Registry implementing ERC-8004: `registerAgent(did, walletAddress, metadataURI)` emits `AgentRegistered(tokenId, did, operator)`
- Spending limit enforcement via Safe module: pre-tx compliance hook blocks if risk score exceeds threshold or sanctions match
- EAS schema for compliance receipts: encodes `receiptId`, `paymentTxHash`, `chainId`, `payer`, `payee`, `amount`, `token`, `ipfsContentHash`, `riskScore`, `sanctionsFlags`, `travelRuleCompliant`, `flowType`, `agentIdHash`
- Uniswap v4 `beforeSwap` compliance hook: sanctions screening pre-swap; reverts if matched
- ERC-7715 delegation: operator signs scoped permission granting agent spending up to `maxTransactionValue` per tx and `dailyLimit` per day on `allowedChains` with `allowedCurrencies`

### Integration Points in Codebase
- `packages/integrations/src/eas/client.ts` — TypeScript EAS client; `signer.attest()` wraps on-chain EAS `attest()` function
- `packages/integrations/src/eas/schema.ts` — encodes ComplianceReceipt into ABI-encoded attestation data
- `packages/shared/src/types/identity.ts` — `erc8004RegistryAddress` and `erc8004TokenId` fields in KYACredentialSubject link off-chain credentials to on-chain registry

### Security Checklist for FlowLink Contracts
- Reentrancy: all state changes before external calls; use ReentrancyGuard on all fund-moving functions
- Access control: AccessControl roles (not raw Ownable) for multi-role admin; no tx.origin authentication
- Integer overflow: Solidity 0.8+ checked arithmetic; `unchecked {}` only in gas-critical loops with documented safety proof
- Oracle manipulation: TWAPs with minimum 30-minute window; no spot price for value decisions
- Sandwich attack protection on compliance hooks: commit-reveal pattern or minimum output amount checks
- Upgrade key management: 48-hour timelock minimum before any upgrade goes live

---

## Key References and Resources

- ERC-4337 Spec: https://eips.ethereum.org/EIPS/eip-4337
- EIP-7702 Spec: https://eips.ethereum.org/EIPS/eip-7702
- ERC-7715 Spec: https://eips.ethereum.org/EIPS/eip-7715
- ERC-7710 Spec: https://eips.ethereum.org/EIPS/eip-7710
- ERC-8004 Spec: https://eips.ethereum.org/EIPS/eip-8004
- Uniswap v4 Hook Docs: https://docs.uniswap.org/contracts/v4/concepts/hooks
- Foundry Book: https://book.getfoundry.sh/
- OpenZeppelin Contracts v5: https://docs.openzeppelin.com/contracts/5.x/
- Certora Prover: https://docs.certora.com/
- EAS (Ethereum Attestation Service): https://docs.attest.sh/
- Safe Modules: https://docs.safe.global/advanced/smart-account-modules
- Tenderly Docs: https://docs.tenderly.co/
- Trail of Bits Smart Contract Security: https://github.com/crytic/building-secure-contracts
- Alchemy Account Kit (ERC-4337): https://accountkit.alchemy.com/
