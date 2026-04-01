import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
  AttachGuardParams,
  AttachGuardResult,
  ApproveParams,
  ExecuteParams,
} from "./types";
import { deriveGuardState } from "./pdas";
import {
  makeProvider,
  MULTISIG_GUARD_PROGRAM_ID,
  CONDITION_ORACLE_PROGRAM_ID,
  ESCROW_CORE_PROGRAM_ID,
} from "./utils";

import MultisigGuardIdl from "../../target/idl/multisig_guard.json";

export async function attachGuard(
  params: AttachGuardParams
): Promise<AttachGuardResult> {
  const { connection, wallet, conditionConfig, approvers, requiredApprovals } = params;

  const provider  = makeProvider(connection, wallet);
  const program   = new Program(MultisigGuardIdl as any, MULTISIG_GUARD_PROGRAM_ID, provider);
  const [guardState] = deriveGuardState(conditionConfig);

  const txSignature = await program.methods
    .initializeGuard(approvers, requiredApprovals)
    .accounts({
      payer:          wallet.publicKey,
      conditionConfig,
      oracleProgram:  CONDITION_ORACLE_PROGRAM_ID,
      guardState,
      systemProgram:  SystemProgram.programId,
    })
    .rpc();

  return { guardState, txSignature };
}

export async function approve(params: ApproveParams): Promise<string> {
  const { connection, wallet, approver, guardState } = params;

  const provider = makeProvider(connection, wallet);
  const program  = new Program(MultisigGuardIdl as any, MULTISIG_GUARD_PROGRAM_ID, provider);

  return program.methods
    .approve()
    .accounts({
      approver:   approver.publicKey,
      guardState,
    })
    .signers([approver])
    .rpc();
}

export async function execute(params: ExecuteParams): Promise<string> {
  const {
    connection, wallet, guardState, conditionConfig,
    releaseAuthority, escrowState, vault, depositorAta, mint,
  } = params;

  const provider = makeProvider(connection, wallet);
  const program  = new Program(MultisigGuardIdl as any, MULTISIG_GUARD_PROGRAM_ID, provider);

  return program.methods
    .execute()
    .accounts({
      cranker:           wallet.publicKey,
      guardState,
      conditionConfig,
      releaseAuthority,
      escrowState,
      vault,
      depositorAta,
      oracleProgram:     CONDITION_ORACLE_PROGRAM_ID,
      escrowCoreProgram: ESCROW_CORE_PROGRAM_ID,
      tokenProgram:      TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function fetchGuardState(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  guardState: PublicKey
) {
  const provider = makeProvider(connection, wallet);
  const program  = new Program(MultisigGuardIdl as any, MULTISIG_GUARD_PROGRAM_ID, provider);
  return program.account.guardState.fetch(guardState);
}