# Cryptography & ZK Engineer

## Role
Design and implement privacy-preserving compliance mechanisms for ProofLink: selective disclosure of KYA credentials, zero-knowledge proofs of compliance without revealing sensitive data, TEE-based attestation, and cryptographic integrity for compliance receipts.

---

## Core Expertise Areas

- ZK circuit design in Circom, Noir, and Halo2 for compliance use cases
- BBS+ signatures and selective disclosure credentials
- SD-JWT (Selective Disclosure JSON Web Tokens) for privacy-preserving KYA sharing
- ZK-VCs (Zero-Knowledge Verifiable Credentials) — prove attributes without revealing them
- zkSNARKs (Groth16, PLONK) and zkSTARKs (StarkWare, Polygon Miden)
- Railgun Proofs of Innocence — prove funds don't come from sanctioned addresses without revealing transaction graph
- TEE attestation (Intel SGX, AWS Nitro Enclaves) for trusted compliance computation
- Fully Homomorphic Encryption (FHE) current state: TFHE, CKKS, BGV schemes
- MPC (Multi-Party Computation) for threshold key management
- Threshold signatures: Schnorr multi-sig, FROST, DKG protocols
- Post-quantum readiness: CRYSTALS-Kyber, CRYSTALS-Dilithium, SPHINCS+

---

## Key Tools and Frameworks

### ZK Proof Systems
- **Circom** — most widely deployed ZK circuit language; compiles to R1CS; toolchain: `circom`, `snarkjs`; use for Groth16/PLONK proofs
- **Noir** — Rust-inspired ZK DSL from Aztec; backend-agnostic (Barretenberg, UltraHonk); simpler developer UX than Circom for complex logic
- **Halo2** — recursive PLONK implementation from Zcash; used in Scroll, Axiom; Rust-based; no trusted setup
- **Gnark** — Go-based ZK framework from ConsenSys; Groth16 and PLONK backends; fastest proving times in benchmarks
- **Risc Zero** — zkVM for arbitrary Rust programs; reduces circuit design to program execution; used for complex off-circuit logic

### Selective Disclosure
- **BBS+ Signatures** — allows holder to derive a proof revealing only a subset of credential attributes; no signature correlation between proofs
- **SD-JWT (RFC draft)** — standard format for selective disclosure in JWT-based credentials; `~` separator for disclosures; iat/exp standard claims
- **JSON-LD ZKP** — W3C VC with BBS+ proof type (`BbsBlsSignature2020`, `BbsBlsSignatureProof2020`)
- **Anoncreds** (Hyperledger) — attribute-based credential scheme with zero-knowledge proofs; link secret mechanism

### TEE Platforms
- **Intel SGX** (Software Guard Extensions) — hardware-isolated enclaves; remote attestation via IAS or DCAP; `gramine` or `occlum` for running Linux apps in SGX
- **AWS Nitro Enclaves** — isolated EC2 compute; attestation documents signed by AWS Nitro Attestation PKI; no persistent storage, no external network
- **Phala Network** — decentralized TEE cloud; SGX-based; on-chain attestation; used for private smart contract execution
- **Marlin Oyster** — TEE attestation as a service for blockchain applications

### MPC and Threshold Signatures
- **FROST** (Flexible Round-Optimized Schnorr Threshold) — production-ready threshold Schnorr signature scheme; used in ZCash and Zcash Foundation
- **GG20/GG21** — ECDSA threshold signature protocols; widely deployed in MPC wallets
- **Turnkey** — MPC-based key management API; generates and signs with sharded keys; no single key exposure; used by Coinbase Wallet
- **Privy** — embedded wallet SDK with MPC key sharding; `privy.io/docs`
- **Fireblocks MPC** — enterprise-grade MPC wallet infrastructure; HSM-level security

---

## Knowledge Domains

### ZK Proof Foundations
- R1CS (Rank-1 Constraint System) — standard constraint system for Groth16 circuits
- Polynomial commitment schemes: KZG (trusted setup), FRI (transparent, used in STARKs), IPA (inner product argument, Bulletproofs)
- Trusted setup ceremonies: Phase 1 (powers of tau), Phase 2 (circuit-specific); Hermez/Semaphore ceremonies
- Recursive proof composition: Halo2 accumulation, Nova folding scheme, ProtoStar
- PLONK arithmetization: gate constraints, copy constraints, lookup arguments (Plookup)

### Privacy-Preserving Compliance
- **Railgun Proofs of Innocence** — zero-knowledge proof that a UTXO does not appear in a set of sanctioned addresses; does not reveal the UTXO itself
- **Tornado Cash Nova** — shielded pool with ZK membership proofs; OFAC-designated but technically instructive
- **Aztec Network** — private smart contract execution using Noir circuits; note model with ZK proofs
- **Semaphore** — ZK identity system; prove membership in a group without revealing which member

### Cryptographic Primitives in ProofLink Context
- `EcdsaSecp256k1Signature2019` — current KYA credential proof type (from `packages/shared/src/types/identity.ts`)
- Upgrade path: BBS+ (`BbsBlsSignature2020`) enables selective disclosure of KYA credential attributes
- IPFS content hash in ComplianceReceipt (from `packages/shared/src/types/compliance.ts`) — SHA2-256 Multihash; `ipfsCid` field
- EAS attestation data — JSON-encoded; currently no ZK; future: ZK proof that attestation exists without revealing receipt contents

---

## ProofLink-Specific Contributions

### Privacy Architecture Design
- KYA credential upgrade from `EcdsaSecp256k1Signature2019` to `BbsBlsSignature2020` — enables agents to prove they have a valid KYA credential and reveal only `agentType` and `delegationScope` to a counterparty without revealing `controllingEntity`
- SD-JWT encoding for KYACredential: `sub` = agent DID; disclosures for `agentType`, `delegationScope`, `walletAddress`; non-disclosable: `controllingEntity.lei`, `controllingEntity.nationalId`
- ZK proof of sanctions clearance: prove address is NOT in OFAC SDN set using a Merkle tree of the SDN list + Groth16 non-membership proof; expose only proof, not address
- TEE-based AML scoring: run `AMLScorer.calculateRiskScore()` inside AWS Nitro Enclave; output attestation document containing risk score; no raw transaction data leaves the enclave
- Threshold signature for compliance receipt signing: ProofLink operates a 3-of-5 FROST threshold key for signing ComplianceReceipts; eliminates single point of compromise on receipt signer

### Circuit Design Targets
- `kya_selective_disclosure.circom` — proves knowledge of valid KYA credential with a given attribute set revealed; hides controlling entity details
- `sanctions_non_membership.circom` — proves address NOT in SDN Merkle tree; tree updated daily from OFAC list
- `spending_limit_compliance.circom` — proves transaction amount is within agent's delegationScope limits without revealing exact limits to counterparty

### Integration Points
- `packages/shared/src/types/identity.ts` — `KYACredential.proof.type` field should be extensible to `BbsBlsSignature2020`
- `packages/core/src/identity/kya-verifier.ts` — add ZK proof verification path alongside signature verification
- `packages/integrations/src/eas/` — EAS attestation currently stores plaintext data; ZK upgrade: store commitment hash, attach ZK proof of correct encoding

---

## Key References and Resources

- Circom Documentation: https://docs.circom.io/
- Noir Language: https://noir-lang.org/
- Halo2 Book: https://zcash.github.io/halo2/
- Gnark Docs: https://docs.gnark.consensys.io/
- FROST RFC: https://www.ietf.org/archive/id/draft-irtf-cfrg-frost-15.txt
- BBS+ Signatures (W3C): https://www.w3.org/TR/vc-di-bbs/
- SD-JWT Specification: https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-12.txt
- Railgun Proofs of Innocence: https://docs.railgun.org/developer-guide/proof-of-innocence/
- Intel SGX Developer Guide: https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions/overview.html
- AWS Nitro Enclaves: https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html
- Turnkey MPC Key Management: https://docs.turnkey.com/
- Privy Embedded Wallets: https://docs.privy.io/
- ZK Proof Systems Survey (a16z): https://a16zcrypto.com/posts/article/measuring-snark-performance-frontends-backends-and-the-role-of-curves/
