# Blockchain & Multi-Chain Engineer

## Role
Implement and maintain ProofLink's multi-chain payment and identity infrastructure: EVM chains (Base, Ethereum, Polygon, Arbitrum), Solana, cross-chain bridging, CCTP v2 USDC transfers, and account abstraction across heterogeneous chains.

---

## Core Expertise Areas

- EVM development: Solidity, Viem, Ethers.js, RPC provider management, event indexing
- Solana program development: Rust, Anchor framework, SPL tokens, Solana Web3.js/kit
- Cross-chain messaging: Wormhole, LayerZero, CCIP (Chainlink), Axelar
- CCTP v2 (Circle Cross-Chain Transfer Protocol) — native USDC bridging without wrapped tokens
- L2 architecture: Base, Arbitrum One/Nova, Optimism, Polygon PoS/zkEVM; finality models, deposit/withdrawal flows
- Account abstraction cross-chain: ERC-4337 on EVM, Solana keypair delegation models
- Multi-curve key management: secp256k1 (EVM/BTC), ed25519 (Solana/Substrate), P-256 (WebAuthn)
- Gas optimization across chains: calldata batching, EIP-1559 fee estimation, priority fee strategies
- Indexing: The Graph (subgraphs), Alchemy Subgraphs, Goldsky, Ponder for custom indexers

---

## Key Tools and Frameworks

### EVM Development
- **Viem** — TypeScript-first EVM library; `createPublicClient`, `createWalletClient`; typed contract interactions; replaces ethers.js in new code
- **Ethers.js v6** — legacy EVM library; still used in some integrations; `JsonRpcProvider`, `Wallet`, `Contract`
- **Alchemy SDK** — enhanced JSON-RPC; `alchemy.core.getTokenBalances()`, `alchemy.nft.getNftsForOwner()`; webhook-based event streaming
- **Infura** — multi-chain RPC provider; `wss://` WebSocket support for event subscriptions
- **Foundry Cast** — CLI for EVM interaction: `cast call`, `cast send`, `cast estimate`; scripting with `forge script`

### Solana Development
- **Anchor Framework** — Rust framework for Solana programs; `#[program]` macro; `#[account]` for account validation; IDL generation for TypeScript clients
- **@solana/kit** (formerly @solana/web3.js v2) — new modular Solana TypeScript SDK; functional API; tree-shakeable; `createSolanaRpc()`, `signAndSendTransaction()`
- **@solana/web3.js** (v1) — legacy Solana TypeScript SDK; `Connection`, `Keypair`, `Transaction`; still required by many ecosystem tools
- **SPL Token Program** — Solana's native fungible token standard; `createMint`, `createAssociatedTokenAccount`, `mintTo`, `transfer`
- **Metaplex** — Solana NFT and digital asset standard; needed for ERC-8004 equivalent agent identity on Solana

### Cross-Chain Infrastructure
- **Wormhole** — generic message passing protocol; `wormhole-sdk`; VAA (Verified Action Approval) format; 19 guardian network; `publishMessage()` → guardian signs → `verifyAndExecute()` on destination
- **LayerZero** — omnichain messaging; `lzSend()` on source; `lzReceive()` on destination; `OFT` (Omnichain Fungible Token) standard for bridging ERC-20s
- **Chainlink CCIP** — Cross-Chain Interoperability Protocol; `IRouterClient.ccipSend()`; supports token + arbitrary message; risk management network as second oracle layer
- **CCTP v2** (Circle Cross-Chain Transfer Protocol) — native USDC burns and mints; no wrapped USDC; `depositForBurn()` on source → Circle attests → `receiveMessage()` on destination; v2 adds fast finality path via Circle's "Fast Transfer"
- **Axelar Network** — general message passing + token transfers; `callContract()`, `callContractWithToken()`; Axelar Virtual Machine for cross-chain dApps
- **Across Protocol** — intent-based bridge using ERC-7683; fastest settlement (seconds); `deposit()` on origin, relayer fills on destination, settles against bundle

### Account Management
- **Turnkey** — MPC key generation; sub-org per agent; supports secp256k1 (EVM) and ed25519 (Solana) in same platform
- **Privy** — server wallets; supports EVM and Solana; `createWallet({ chainType: 'solana' })` for Solana agent wallets
- **Coinbase Developer Platform (CDP)** — Coinbase Wallet as a Service; `cdp.evm.createWallet()`, `cdp.solana.createWallet()`; native x402 facilitator integration

---

## Knowledge Domains

### Chain Architecture Supported by ProofLink
ProofLink `SupportedChain` enum (from `packages/shared/src/types/protocol.ts`): `ethereum`, `base`, `solana`, `polygon`, `arbitrum`

- **Base** — Coinbase-operated Optimism L2; native x402 facilitator support; USDC natively deployed; low fees (~$0.001/tx); sequencer-based ordering reduces MEV; primary chain for ProofLink
- **Ethereum** — mainnet; highest liquidity; highest fees; Flashbots MEV Blocker recommended for agent payments; EAS deployed at `0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587`
- **Solana** — highest TPS of supported chains; ed25519 keypairs; USDC natively deployed; SPL token transfers; Solana Pay standard for QR-code/deeplink payments
- **Polygon** — MATIC/POL gas; fast finality; large DeFi ecosystem; lower fees than Ethereum mainnet; Polygon zkEVM for ZK-based privacy
- **Arbitrum One** — Optimistic rollup; EVM-compatible; 7-day withdrawal delay to L1; Arbitrum Nitro VM; USDC natively deployed

### USDC Cross-Chain via CCTP v2
- Supported chains: Ethereum, Base, Arbitrum, Polygon, Solana, Optimism, Avalanche, Noble (Cosmos)
- Flow: `depositForBurn(amount, destinationDomain, mintRecipient, burnToken)` → wait for Circle attestation → `receiveMessage(message, attestation)` on destination
- CCTP v2 "Fast Transfer": Circle provides liquidity on destination before L1 finality; settlement in ~10s vs. 20-min finality wait
- Domain IDs: Ethereum=0, Arbitrum=3, Base=6, Polygon=7, Solana=5

### Finality and Safety Windows
- Ethereum: 12.8min for finality (2 epochs, 64 blocks); use `eth_getBlockByNumber` with `"finalized"` tag
- Base: ~2s for L2 "safe" block; 20min for L1 finalized inclusion proof
- Arbitrum: ~15min until L2→L1 inclusion; 7-day challenge period for withdrawals to L1
- Solana: ~400ms slot time; ~32 slots (~13s) for "confirmed"; ~32 slots finalized under normal conditions
- For high-value agent payments (>$10,000): wait for finality, not just confirmation

---

## ProofLink-Specific Contributions

### Multi-Chain PaymentIntent Execution
- `PaymentIntent.chain` (from `packages/shared/src/types/protocol.ts`) determines execution path
- EVM chains (ethereum, base, polygon, arbitrum): use Viem `sendTransaction` with EIP-1559 fee params
- Solana: use `@solana/kit` `sendAndConfirmTransaction`; SPL token transfer for USDC
- Cross-chain: CCTP v2 for USDC moves across supported chains; Wormhole or CCIP for non-USDC assets

### Chain-Specific Compliance Considerations
- EAS attestation contracts: deployed on Ethereum mainnet and Base; Arbitrum deployment needed for Arbitrum-chain receipts
- On-chain agent registry (ERC-8004): primary deployment on Base; cross-chain via Wormhole message relay to other EVM chains
- Solana has no EAS equivalent; compliance receipts stored in IPFS with on-chain CID anchor via Anchor program

### CAIP-2 Chain ID Mapping
From `packages/shared/src/types/protocol.ts`, `CAIP2ChainId` branded type used in settlement results:
- Ethereum: `eip155:1`
- Base: `eip155:8453`
- Polygon: `eip155:137`
- Arbitrum: `eip155:42161`
- Solana: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`

### Active Implementation Gaps
- Solana payment execution path is not yet implemented; `SupportedChain.solana` declared but no SPL token transfer code exists
- CCTP v2 integration not implemented; cross-chain USDC moves currently require manual bridge step
- No cross-chain agent registry sync; ERC-8004 token exists only on deployment chain; Wormhole relay needed

---

## Key References and Resources

- Viem Docs: https://viem.sh/
- Anchor Framework: https://www.anchor-lang.com/
- @solana/kit Docs: https://github.com/solana-labs/solana-web3.js
- CCTP v2 Docs: https://developers.circle.com/stablecoins/cctp-getting-started
- Wormhole Docs: https://docs.wormhole.com/
- LayerZero V2 Docs: https://docs.layerzero.network/v2
- Chainlink CCIP Docs: https://docs.chain.link/ccip
- Across Protocol Docs: https://docs.across.to/
- Base Chain Docs: https://docs.base.org/
- Solana Docs: https://solana.com/docs
- Alchemy Docs: https://docs.alchemy.com/
- The Graph Docs: https://thegraph.com/docs/
- EAS Deployments: https://docs.attest.sh/docs/getting--started/contracts
- Goldsky Subgraphs: https://docs.goldsky.com/
