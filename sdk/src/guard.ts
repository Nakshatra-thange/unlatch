import { readFileSync } from "fs";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { MultisigGuard } from "./types/multisig_guard.js";
import type {
  AttachGuardParams,
  AttachGuardResult,
  ApproveParams,
  ExecuteParams,
} from "./types.js";
import { deriveGuardState } from "./pdas.js";
import {
  makeProvider,
  MULTISIG_GUARD_PROGRAM_ID,
  CONDITION_ORACLE_PROGRAM_ID,
  ESCROW_CORE_PROGRAM_ID,
} from "./utils.js";

const { Program } = anchor;
const MultisigGuardIdl = JSON.parse(
  readFileSync(new URL("./idl/multisig_guard.json", import.meta.url), "utf-8")
);

export async function attachGuard(
  params: AttachGuardParams
): Promise<AttachGuardResult> {
  const { connection, wallet, conditionConfig, approvers, requiredApprovals } = params;

  const provider  = makeProvider(connection, wallet);
  const program   = new Program<MultisigGuard>(
    MultisigGuardIdl as unknown as MultisigGuard,
    provider
  );
  const [guardState] = deriveGuardState(conditionConfig);

  const txSignature = await program.methods
    .initializeGuard(approvers, requiredApprovals)
    .accounts({
      payer:          wallet.publicKey,
      conditionConfig,
      oracleProgram:  CONDITION_ORACLE_PROGRAM_ID,
      guardState,
      systemProgram:  SystemProgram.programId,
    }as any)
    .rpc();

  return { guardState, txSignature };
}

export async function approve(params: ApproveParams): Promise<string> {
  const { connection, wallet, approver, guardState } = params;

  const provider = makeProvider(connection, wallet);
  const program  = new Program<MultisigGuard>(
    MultisigGuardIdl as unknown as MultisigGuard,
    provider
  );

  return program.methods
    .approve()
    .accounts({
      approver:   approver.publicKey,
      guardState,
    }as any)
    .signers([approver])
    .rpc();
}

export async function execute(params: ExecuteParams): Promise<string> {
  const {
    connection, wallet, guardState, conditionConfig,
    releaseAuthority, escrowState, vault, depositorAta,
  } = params;

  const provider = makeProvider(connection, wallet);
  const program  = new Program<MultisigGuard>(
    MultisigGuardIdl as unknown as MultisigGuard,
    provider
  );

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
    }as any)
    .rpc();
}

export async function fetchGuardState(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  guardState: PublicKey
) {
  const provider = makeProvider(connection, wallet);
  const program  = new Program<MultisigGuard>(
    MultisigGuardIdl as unknown as MultisigGuard,
    provider
  );
  return program.account.guardState.fetch(guardState);
}
