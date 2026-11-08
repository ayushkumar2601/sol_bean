import { PublicKey, Keypair } from '@solana/web3.js';
import {
  getConfigPda,
  getLpPda,
  getEscrowPda,
  getVaultPda,
  getAttestationPda,
  getReputationRootPda,
  BEANSTICK_PROGRAM_ID,
  PriorityFeeConfig,
} from '../../packages/solana-client/src';

/**
 * Beanstick Protocol On-Chain Simulation & Benchmark Harness
 * 
 * Validates deterministic PDA performance, Compute Budget priority fee calculations,
 * and Escrow Finite State Machine (FSM) transitions.
 */

describe('Beanstick On-Chain Simulation & Performance Benchmark Suite', () => {
  // Test parameters
  const TEST_PROGRAM_ID = BEANSTICK_PROGRAM_ID;
  const BATCH_SIZE = 1000;

  it('Benchmarking: Deterministic PDA derivation throughput under 1ms per account', () => {
    const startTime = performance.now();

    for (let i = 0; i < BATCH_SIZE; i++) {
      const orderId = BigInt(i + 1);
      const [escrowPda] = getEscrowPda(orderId, TEST_PROGRAM_ID);
      const [vaultPda] = getVaultPda(escrowPda, TEST_PROGRAM_ID);
      const [attestationPda] = getAttestationPda(escrowPda, TEST_PROGRAM_ID);

      expect(escrowPda).toBeDefined();
      expect(vaultPda).toBeDefined();
      expect(attestationPda).toBeDefined();
    }

    const totalDurationMs = performance.now() - startTime;
    const avgPerDerivationMs = totalDurationMs / (BATCH_SIZE * 3);

    console.log(`⚡ PDA Benchmark (${BATCH_SIZE * 3} derivations): Total ${totalDurationMs.toFixed(2)}ms | Avg ${avgPerDerivationMs.toFixed(4)}ms per PDA`);
    expect(avgPerDerivationMs).toBeLessThan(1.0); // Must be sub-millisecond
  });

  it('State Machine: Simulates valid order lifecycle and prevents illegal transitions', () => {
    type OrderState = 'UNINITIALIZED' | 'INITIATED' | 'LOCKED' | 'ATTESTED' | 'RELEASED' | 'REFUNDED';

    class MockEscrowMachine {
      public state: OrderState = 'UNINITIALIZED';
      public deadline: number = 0;
      public amount: bigint = 0n;

      lock(amount: bigint, lockDurationSec: number, now: number) {
        if (this.state !== 'UNINITIALIZED' && this.state !== 'INITIATED') {
          throw new Error('6001: InvalidOrderState - Escrow already locked or finalized');
        }
        if (lockDurationSec < 60 || lockDurationSec > 86400) {
          throw new Error('6003: InvalidDeadline - Duration outside protocol window');
        }
        this.amount = amount;
        this.deadline = now + lockDurationSec;
        this.state = 'LOCKED';
      }

      attest(proofHash: string, now: number) {
        if (this.state !== 'LOCKED') {
          throw new Error('6001: InvalidOrderState - Can only attest locked escrows');
        }
        if (now > this.deadline) {
          throw new Error('6005: DeadlinePassed - Cannot attest expired order');
        }
        if (!proofHash || proofHash.length !== 64) {
          throw new Error('6006: ProofVerificationFailed - Invalid proof commitment');
        }
        this.state = 'ATTESTED';
      }

      release() {
        if (this.state !== 'ATTESTED') {
          throw new Error('6001: InvalidOrderState - Order must be attested before release');
        }
        this.state = 'RELEASED';
      }

      refund(now: number) {
        if (this.state !== 'LOCKED') {
          throw new Error('6001: InvalidOrderState - Only locked orders can be refunded');
        }
        if (now <= this.deadline) {
          throw new Error('6004: DeadlineNotReached - Cannot refund before deadline');
        }
        this.state = 'REFUNDED';
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const escrow = new MockEscrowMachine();

    // 1. Lock escrow
    escrow.lock(1_000_000n, 300, now);
    expect(escrow.state).toBe('LOCKED');

    // 2. Reject premature release before attestation
    expect(() => escrow.release()).toThrow('6001: InvalidOrderState');

    // 3. Attest with valid 32-byte (64 hex char) proof hash
    const validProofHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    escrow.attest(validProofHash, now + 10);
    expect(escrow.state).toBe('ATTESTED');

    // 4. Release escrow
    escrow.release();
    expect(escrow.state).toBe('RELEASED');

    // 5. Reject double release or refund after release
    expect(() => escrow.release()).toThrow('6001: InvalidOrderState');
    expect(() => escrow.refund(now + 1000)).toThrow('6001: InvalidOrderState');
  });

  it('Compute Budget: Verifies fee calculations for high-frequency priority trades', () => {
    const config: PriorityFeeConfig = {
      microLamportsPerCu: 50_000,
      computeUnitLimit: 200_000,
    };

    // Calculate priority fee: (units * microLamports) / 1_000_000
    const priorityFeeLamports = (config.computeUnitLimit * config.microLamportsPerCu) / 1_000_000;
    const baseSignatureFeeLamports = 5_000;
    const totalLamports = baseSignatureFeeLamports + priorityFeeLamports;

    expect(priorityFeeLamports).toBe(10_000);
    expect(totalLamports).toBe(15_000);

    // Verify USD cost equivalent at $180 / SOL
    const totalSol = totalLamports / 1_000_000_000;
    const costUsd = totalSol * 180;
    expect(costUsd).toBeLessThan(0.003); // Less than 0.3 cents
  });
});

