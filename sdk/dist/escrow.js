import { readFileSync } from "fs";
import { SystemProgram } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveEscrowState, deriveVault } from "./pdas.js";
import { makeProvider } from "./utils.js";
const { Program, BN } = anchor;
const EscrowCoreIdl = JSON.parse(readFileSync(new URL("./idl/escrow_core.json", import.meta.url), "utf-8"));
export async function createEscrow(params) {
    const { connection, wallet, mint, amount, releaseAuthority } = params;
    const provider = makeProvider(connection, wallet);
    const program = new Program(EscrowCoreIdl, provider);
    const [escrowState] = deriveEscrowState(wallet.publicKey, mint);
    const [vault] = deriveVault(escrowState);
    const depositorAta = await getAssociatedTokenAddress(mint, wallet.publicKey);
    const txSignature = await program.methods
        .deposit(new BN(amount.toString()), releaseAuthority)
        .accounts({
        depositor: wallet.publicKey,
        mint,
        escrowState,
        vault,
        depositorAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
    })
        .rpc();
    return { escrowState, vault, txSignature };
}
export async function fetchEscrowState(connection, wallet, escrowState) {
    const provider = makeProvider(connection, wallet);
    const program = new Program(EscrowCoreIdl, provider);
    return program.account.escrowState.fetch(escrowState);
}
