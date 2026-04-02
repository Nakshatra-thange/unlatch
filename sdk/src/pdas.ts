import { PublicKey } from "@solana/web3.js";
import {
  ESCROW_CORE_PROGRAM_ID,
  CONDITION_ORACLE_PROGRAM_ID,
  MULTISIG_GUARD_PROGRAM_ID,
} from "./utils.js";

export function deriveEscrowState(
  depositor: PublicKey,
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      depositor.toBuffer(),
      mint.toBuffer(),
    ],
    ESCROW_CORE_PROGRAM_ID()
  );
}

export function deriveVault(
  escrowState: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowState.toBuffer()],
    ESCROW_CORE_PROGRAM_ID()
  );
}

export function deriveConditionConfig(
  escrowState: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("condition"), escrowState.toBuffer()],
    CONDITION_ORACLE_PROGRAM_ID()
  );
}

export function deriveReleaseAuthority(
  conditionConfig: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("release"), conditionConfig.toBuffer()],
    CONDITION_ORACLE_PROGRAM_ID()
  );
}

export function deriveGuardState(
  conditionConfig: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("guard"), conditionConfig.toBuffer()],
    MULTISIG_GUARD_PROGRAM_ID()
  );
}

// returns all PDAs for a given depositor + mint in one call
// useful for the dashboard
export function deriveAllPDAs(depositor: PublicKey, mint: PublicKey) {
  const [escrowState, escrowBump]           = deriveEscrowState(depositor, mint);
  const [vault, vaultBump]                  = deriveVault(escrowState);
  const [conditionConfig, conditionBump]    = deriveConditionConfig(escrowState);
  const [releaseAuthority, releaseBump]     = deriveReleaseAuthority(conditionConfig);
  const [guardState, guardBump]             = deriveGuardState(conditionConfig);

  return {
    escrowState:      { address: escrowState,      bump: escrowBump },
    vault:            { address: vault,             bump: vaultBump },
    conditionConfig:  { address: conditionConfig,   bump: conditionBump },
    releaseAuthority: { address: releaseAuthority,  bump: releaseBump },
    guardState:       { address: guardState,        bump: guardBump },
  };
}
