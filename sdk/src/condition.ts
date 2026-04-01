import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";

import { PlugConditionParams, PlugConditionResult } from "./types";
import { deriveConditionConfig, deriveReleaseAuthority } from "./pdas";
import { makeProvider, CONDITION_ORACLE_PROGRAM_ID } from "./utils";

import ConditionOracleIdl from "../../target/idl/condition_oracle.json";

export async function plugCondition(
  params: PlugConditionParams
): Promise<PlugConditionResult> {
  const { connection, wallet, escrowState, condition } = params;

  const provider = makeProvider(connection, wallet);
  const program  = new Program(
    ConditionOracleIdl as any,
    CONDITION_ORACLE_PROGRAM_ID,
    provider
  );

  const [conditionConfig]  = deriveConditionConfig(escrowState);
  const [releaseAuthority] = deriveReleaseAuthority(conditionConfig);

  // build the params object matching the on-chain struct
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
    })
    .rpc();

  return { conditionConfig, releaseAuthority, txSignature };
}

export async function setResolved(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  conditionConfig: PublicKey
) {
  const provider = makeProvider(connection, wallet);
  const program  = new Program(
    ConditionOracleIdl as any,
    CONDITION_ORACLE_PROGRAM_ID,
    provider
  );

  return program.methods
    .setResolved()
    .accounts({
      resolveAuthority: wallet.publicKey,
      conditionConfig,
    })
    .rpc();
}

export async function tryRelease(
  params: import("./types").TryReleaseParams
) {
  const {
    connection, wallet, conditionConfig, releaseAuthority,
    escrowState, vault, depositorAta, mint,
  } = params;

  const { TOKEN_PROGRAM_ID: SPL_TOKEN } = await import("@solana/spl-token");
  const { ESCROW_CORE_PROGRAM_ID: escrowProgram } = await import("./utils");

  const provider = makeProvider(connection, wallet);
  const program  = new Program(
    ConditionOracleIdl as any,
    CONDITION_ORACLE_PROGRAM_ID,
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
      escrowCoreProgram: escrowProgram,
      tokenProgram:      SPL_TOKEN,
    })
    .rpc();
}

export async function fetchConditionConfig(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  conditionConfig: PublicKey
) {
  const provider = makeProvider(connection, wallet);
  const program  = new Program(
    ConditionOracleIdl as any,
    CONDITION_ORACLE_PROGRAM_ID,
    provider
  );
  return program.account.conditionConfig.fetch(conditionConfig);
}