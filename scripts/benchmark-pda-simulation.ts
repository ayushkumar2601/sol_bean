import {
  getConfigPda,
  getLpPda,
  getEscrowPda,
  getVaultPda,
  getAttestationPda,
  getReputationRootPda,
  BEANSTICK_PROGRAM_ID,
} from '../packages/solana-client/src';

/**
 * Standalone Benchmark CLI Runner for Beanstick Solana PDA Derivation
 * Simulates high-throughput order routing and latency benchmarks.
 */
async function main() {
  console.log('===========================================================');
  console.log('🚀 Beanstick Solana PDA Derivation & Simulation Benchmark');
  console.log('===========================================================');
  console.log(`Program ID: ${BEANSTICK_PROGRAM_ID.toBase58()}\n`);

  const iterations = 5000;
  console.log(`Running ${iterations} iterations of canonical PDA derivations...`);

  const start = performance.now();
  let sampleEscrow = '';
  let sampleVault = '';
  let sampleAttestation = '';

  for (let i = 0; i < iterations; i++) {
    const orderId = BigInt(i + 1);
    const [escrow] = getEscrowPda(orderId, BEANSTICK_PROGRAM_ID);
    const [vault] = getVaultPda(escrow, BEANSTICK_PROGRAM_ID);
    const [attestation] = getAttestationPda(escrow, BEANSTICK_PROGRAM_ID);

    if (i === 0) {
      sampleEscrow = escrow.toBase58();
      sampleVault = vault.toBase58();
      sampleAttestation = attestation.toBase58();
    }
  }

  const durationMs = performance.now() - start;
  const totalDerivations = iterations * 3;
  const avgUs = (durationMs / totalDerivations) * 1000;
  const derivationsPerSec = (totalDerivations / (durationMs / 1000)).toFixed(0);

  console.log('\n✅ Benchmark Completed Successfully:');
  console.log(`- Total Derivations: ${totalDerivations.toLocaleString()} PDAs`);
  console.log(`- Total Duration:    ${durationMs.toFixed(2)} ms`);
  console.log(`- Average Latency:   ${avgUs.toFixed(2)} µs / PDA`);
  console.log(`- Throughput:        ${parseInt(derivationsPerSec, 10).toLocaleString()} PDAs/second`);
  console.log('\nSample Canonical PDAs Derived (Order #1):');
  console.log(`  Escrow PDA:      ${sampleEscrow}`);
  console.log(`  Vault PDA:       ${sampleVault}`);
  console.log(`  Attestation PDA: ${sampleAttestation}`);
  console.log('===========================================================');
}

main().catch(console.error);

