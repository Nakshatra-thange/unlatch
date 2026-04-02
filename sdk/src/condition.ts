import { readFileSync } from "fs";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { ConditionOracle } from "./types/condition_oracle.js";
import type {
  PlugConditionParams,
  PlugConditionResult,
  TryReleaseParams,
} from "./types.js";
import { deriveConditionConfig, deriveReleaseAuthority } from "./pdas.js";
import { makeProvider, CONDITION_ORACLE_PROGRAM_ID, ESCROW_CORE_PROGRAM_ID } from "./utils.js";

const { Program, BN } = anchor;
const ConditionOracleIdl = JSON.parse(
  readFileSync(new URL("./idl/condition_oracle.json", import.meta.url), "utf-8")
);

export async function plugCondition(
  params: PlugConditionParams
): Promise<PlugConditionResult> {
  const { connection, wallet, escrowState, condition } = params;

  const provider = makeProvider(connection, wallet);
  const programId = CONDITION_ORACLE_PROGRAM_ID();
  const program  = new Program<ConditionOracle>(
    { ...ConditionOracleIdl, address: programId.toBase58() } as unknown as ConditionOracle,
    provider
  );

  const [conditionConfig]  = deriveConditionConfig(escrowState);
  const [releaseAuthority] = deriveReleaseAuthority(conditionConfig);

  const conditionParams = condition.type === "timestamp"
    ? {
        conditionType:    { timestampAfter: {} },
        targetTimestamp:  new BN(condition.targetTimestamp),
        resolveAuthority: wallet.publicKey,
      }
    : {
        conditionType:    { manualBool: {} },
        targetTimestamp:  new BN(0),
        resolveAuthority: condition.resolveAuthority,
      };

  const txSignature = await program.methods
    .initializeCondition(conditionParams)
    .accounts({
      payer:            wallet.publicKey,
      escrowState,
      conditionConfig,
      releaseAuthority,
      systemProgram:    SystemProgram.programId,
    }as any)
    .rpc();

  return { conditionConfig, releaseAuthority, txSignature };
}

export async function setResolved(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  conditionConfig: PublicKey
): Promise<string> {
  const provider = makeProvider(connection, wallet);
  const programId = CONDITION_ORACLE_PROGRAM_ID();
  const program  = new Program<ConditionOracle>(
    { ...ConditionOracleIdl, address: programId.toBase58() } as unknown as ConditionOracle,
    provider
  );

  return program.methods
    .setResolved()
    .accounts({
      resolveAuthority: wallet.publicKey,
      conditionConfig,
    }as any)
    .rpc();
}

export async function tryRelease(params: TryReleaseParams): Promise<string> {
  const {
    connection, wallet, conditionConfig, releaseAuthority,
    escrowState, vault, depositorAta,
  } = params;

  const provider = makeProvider(connection, wallet);
  const programId = CONDITION_ORACLE_PROGRAM_ID();
  const program  = new Program<ConditionOracle>(
    { ...ConditionOracleIdl, address: programId.toBase58() } as unknown as ConditionOracle,
    provider
  );

  return program.methods
    .tryRelease()
    .accounts({
      cranker:           wallet.publicKey,
      conditionConfig,
      releaseAuthority,
      escrowState,
      vault,
      depositorAta,
      escrowCoreProgram: ESCROW_CORE_PROGRAM_ID(),
      tokenProgram:      TOKEN_PROGRAM_ID,
    }as any)
    .rpc();
}

export async function fetchConditionConfig(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  conditionConfig: PublicKey
) {
  const provider = makeProvider(connection, wallet);
  const programId = CONDITION_ORACLE_PROGRAM_ID();
  const program  = new Program<ConditionOracle>(
    { ...ConditionOracleIdl, address: programId.toBase58() } as unknown as ConditionOracle,
    provider
  );
  return program.account.conditionConfig.fetch(conditionConfig);
}
