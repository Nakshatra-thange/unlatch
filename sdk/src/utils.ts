import { PublicKey, Connection, Commitment } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import type { AnchorProvider as AnchorProviderType, Wallet } from "@coral-xyz/anchor";
import type { UnlatchCluster, UnlatchConfig } from "./types.js";

const { AnchorProvider } = anchor;

const BUILTIN_PROGRAM_IDS: Record<UnlatchCluster, UnlatchConfig> = {
  devnet: {
    escrowCoreProgram:      new PublicKey("3BXJUR36foqaXawy5dQCPx1amq5yPzQSfPygjx4GSk3s"),
    conditionOracleProgram: new PublicKey("3crHL5VNeSDvFgpCYEEMUYCfUhrQHu2KBauAaU9qfbMG"),
    multisigGuardProgram:   new PublicKey("BweWEmsS5txchdCRTgPLi31UNeS19rf4DpQnTDsubVLY"),
},
  localnet: {
    escrowCoreProgram: new PublicKey("3BXJUR36foqaXawy5dQCPx1amq5yPzQSfPygjx4GSk3s"),
    conditionOracleProgram: new PublicKey("3crHL5VNeSDvFgpCYEEMUYCfUhrQHu2KBauAaU9qfbMG"),
    multisigGuardProgram: new PublicKey("BweWEmsS5txchdCRTgPLi31UNeS19rf4DpQnTDsubVLY"),
  },
};

function envProgramIds(): Partial<UnlatchConfig> {
  const {
    UNLATCH_ESCROW_CORE_PROGRAM_ID,
    UNLATCH_CONDITION_ORACLE_PROGRAM_ID,
    UNLATCH_MULTISIG_GUARD_PROGRAM_ID,
  } = process.env;

  return {
    escrowCoreProgram: UNLATCH_ESCROW_CORE_PROGRAM_ID
      ? new PublicKey(UNLATCH_ESCROW_CORE_PROGRAM_ID)
      : undefined,
    conditionOracleProgram: UNLATCH_CONDITION_ORACLE_PROGRAM_ID
      ? new PublicKey(UNLATCH_CONDITION_ORACLE_PROGRAM_ID)
      : undefined,
    multisigGuardProgram: UNLATCH_MULTISIG_GUARD_PROGRAM_ID
      ? new PublicKey(UNLATCH_MULTISIG_GUARD_PROGRAM_ID)
      : undefined,
  };
}

function resolveProgramIds(cluster: UnlatchCluster): UnlatchConfig {
  const base = BUILTIN_PROGRAM_IDS[cluster];
  const env = envProgramIds();

  return {
    escrowCoreProgram: env.escrowCoreProgram ?? base.escrowCoreProgram,
    conditionOracleProgram: env.conditionOracleProgram ?? base.conditionOracleProgram,
    multisigGuardProgram: env.multisigGuardProgram ?? base.multisigGuardProgram,
  };
}

let activeProgramIds: UnlatchConfig = resolveProgramIds(
  (process.env.UNLATCH_CLUSTER as UnlatchCluster | undefined) ?? "devnet"
);

export function getBuiltinProgramIds(cluster: UnlatchCluster): UnlatchConfig {
  return BUILTIN_PROGRAM_IDS[cluster];
}

export function setProgramIds(config: UnlatchConfig): void {
  activeProgramIds = config;
}

export function getProgramIds(): UnlatchConfig {
  return activeProgramIds;
}

export function useClusterProgramIds(cluster: UnlatchCluster): UnlatchConfig {
  const config = resolveProgramIds(cluster);
  setProgramIds(config);
  return config;
}

export const ESCROW_CORE_PROGRAM_ID = () => getProgramIds().escrowCoreProgram;
export const CONDITION_ORACLE_PROGRAM_ID = () => getProgramIds().conditionOracleProgram;
export const MULTISIG_GUARD_PROGRAM_ID = () => getProgramIds().multisigGuardProgram;

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

export function makeProvider(
  connection: Connection,
  wallet: Wallet,
  commitment: Commitment = "confirmed"
): AnchorProviderType {
  return new AnchorProvider(connection, wallet, { commitment });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// returns the associated token account address for owner + mint
export async function getAta(
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");
  return getAssociatedTokenAddress(mint, owner);
}
