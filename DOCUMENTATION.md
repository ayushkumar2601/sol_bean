# Beanstick (BeanSol): Technical Architecture & Solana Reference

## 1. Introduction
Beanstick is a trustless, non-custodial fiat-to-crypto settlement network designed specifically for the Solana blockchain. By combining an autonomous **Agentic Swarm Protocol**, zero-knowledge proofs (**zkTLS**), and **Solana Program Derived Addresses (PDAs)**, Beanstick enables users to convert traditional fiat currencies (USD, INR, EUR) into cryptocurrency (SOL, SPL USDC, PYUSD) in under a second without custodians, centralized exchanges, or manual operators.

## 2. Core Solana Architecture
The protocol is engineered around Solana's high-speed, parallel execution runtime and composable account model:
- **Autonomous Agentic Swarm:** A distributed network of Liquidity Provider (LP) AI agents running lightweight Node.js instances connected to Web2 banking endpoints and Solana hot wallets.
- **Anchor On-Chain Program:** Native Rust smart contracts enforcing deterministic state transitions (`INITIATED` → `LOCKED` → `ATTESTED` → `RELEASED` or `REFUNDED`). Collateral is locked directly in program-owned PDA vaults.
- **zkTLS Verification Layer:** Multi-Party Computation (MPC) splits TLS session keys with Web2 banking servers (UPI, Venmo, Plaid), allowing Attestor agents to verify bank response payloads and submit concise ZK-SNARK proofs on-chain without exposing credentials.
- **Graph Reputation Engine (Neo4j AuraDB):** Routes order intents to high-trust LP agents using graph algorithms (`PageRank` and `Betweenness Centrality`) to guarantee sub-millisecond reverse-auction quotes.

## 3. Solana Escrow Lifecycle
1. **Intent & Auction:** Buyer specifies swap intent (e.g., "100 USD → SOL"). The swarm evaluates agent trust scores in Neo4j AuraDB and selects the optimal LP quote.
2. **PDA Escrow Funding:** The LP signs a `lock_escrow` instruction. The Solana program derives the canonical `[b"escrow", order_id]` PDA and `[b"escrow-vault", escrow_pda]` vault, depositing SPL tokens from the LP's ATA.
3. **Fiat Transfer:** The buyer sends fiat directly to the LP's payment rail (Venmo, UPI, Bank wire) using a unique transaction reference hash.
4. **zkTLS Attestation:** The Attestor agent verifies the bank's signed HTTPS receipt via MPC, generates a zero-knowledge attestation, and invokes `submit_zktls_attestation` on Solana.
5. **Trustless Release:** The program validates the attestation against the order's commitment hash and signs an automated transfer from the PDA vault directly to the buyer's Associated Token Account (ATA) in ~400ms.

## 4. Key Solana Advantages
- **Sub-Second Settlement:** Instant finality matches the speed of modern Web2 payment rails (like UPI or Venmo), eliminating the waiting periods of EVM rollups.
- **Predictable Micro-Fees:** Gas costs are under $0.001 per settlement, allowing micro-trades without disproportionate friction.
- **SPL Token-2022 Compatibility:** Full native support for modern SPL transfer hooks, confidential extensions, and standard SPL tokens.
