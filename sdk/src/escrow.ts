import { readFileSync } from "fs";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { EscrowCore } from "./types/escrow_core.js";
import type { CreateEscrowParams, CreateEscrowResult } from "./types.js";
import { deriveEscrowState, deriveVault } from "./pdas.js";
import { makeProvider, ESCROW_CORE_PROGRAM_ID } from "./utils.js";

const { Program, BN } = anchor;
const EscrowCoreIdl = JSON.parse(
  readFileSync(new URL("./idl/escrow_core.json", import.meta.url), "utf-8")
);

export async function createEscrow(
  params: CreateEscrowParams
): Promise<CreateEscrowResult> {
  const { connection, wallet, mint, amount, releaseAuthority } = params;

  const provider = makeProvider(connection, wallet);
  const programId = ESCROW_CORE_PROGRAM_ID();
  const program  = new Program<EscrowCore>(
    { ...EscrowCoreIdl, address: programId.toBase58() } as unknown as EscrowCore,
    provider
  );

  const [escrowState] = deriveEscrowState(wallet.publicKey, mint);
  const [vault]       = deriveVault(escrowState);
  const depositorAta  = await getAssociatedTokenAddress(mint, wallet.publicKey);

  const txSignature = await program.methods
    .deposit(new BN(amount.toString()), releaseAuthority)
    .accounts({
      depositor:     wallet.publicKey,
      mint,
      escrowState,
      vault,
      depositorAta,
      tokenProgram:  TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }as any)
    .rpc();

  return { escrowState, vault, txSignature };
}

export async function fetchEscrowState(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  escrowState: PublicKey
) {
  const provider = makeProvider(connection, wallet);
  const programId = ESCROW_CORE_PROGRAM_ID();
  const program  = new Program<EscrowCore>(
    { ...EscrowCoreIdl, address: programId.toBase58() } as unknown as EscrowCore,
    provider
  );
  return program.account.escrowState.fetch(escrowState);
}
