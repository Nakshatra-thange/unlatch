import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
  CreateEscrowParams,
  CreateEscrowResult,
} from "./types";
import { deriveEscrowState, deriveVault } from "./pdas";
import { makeProvider, ESCROW_CORE_PROGRAM_ID } from "./utils";

import EscrowCoreIdl from "../../target/idl/escrow_core.json";

export async function createEscrow(
  params: CreateEscrowParams
): Promise<CreateEscrowResult> {
  const { connection, wallet, mint, amount, releaseAuthority } = params;

  const provider = makeProvider(connection, wallet);
  const program  = new Program(EscrowCoreIdl as any, ESCROW_CORE_PROGRAM_ID, provider);

  const [escrowState] = deriveEscrowState(wallet.publicKey, mint);
  const [vault]       = deriveVault(escrowState);

  const depositorAta = await (async () => {
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");
    return getAssociatedTokenAddress(mint, wallet.publicKey);
  })();

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
    })
    .rpc();

  return { escrowState, vault, txSignature };
}

export async function fetchEscrowState(
  connection: import("@solana/web3.js").Connection,
  wallet: import("@coral-xyz/anchor").Wallet,
  escrowState: PublicKey
) {
  const provider = makeProvider(connection, wallet);
  const program  = new Program(EscrowCoreIdl as any, ESCROW_CORE_PROGRAM_ID, provider);
  return program.account.escrowState.fetch(escrowState);
}