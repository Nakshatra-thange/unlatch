import { PublicKey } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { AnchorProvider } = anchor;
export const ESCROW_CORE_PROGRAM_ID = new PublicKey("Aeme3QvXEKEip5jNkfZTrjpTxXognZXvw2jPb7HuGMte");
export const CONDITION_ORACLE_PROGRAM_ID = new PublicKey("BZgskKEwBsjoAYrW2yRoah4Aat2jKUgThXB8g6RJMoKx");
export const MULTISIG_GUARD_PROGRAM_ID = new PublicKey("AXUUG9hFsbPGsFnyKw7DSdqhsPXhTPZd68mkp51qMLMb");
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
export function makeProvider(connection, wallet, commitment = "confirmed") {
    return new AnchorProvider(connection, wallet, { commitment });
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// returns the associated token account address for owner + mint
export async function getAta(mint, owner) {
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");
    return getAssociatedTokenAddress(mint, owner);
}
